"use server";

import { redirect } from "next/navigation";
import { starterCoverage } from "@/lib/coverage";
import { tenantWhere } from "@/lib/tenancy";
import {
  blankPriceUpdate,
  findStarterMaterial,
  findStarterTemplate,
  PLASTERING_STARTER_MATERIALS,
  planStarterLibraryUpdate,
  type StarterLine,
} from "@/lib/trade-starters";
import { requireUser } from "@/server/dal";
import { getPrisma, isUniqueConstraint } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function applyStarterToJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const starterId = String(formData.get("starterId") ?? "");
  const starter = findStarterTemplate(starterId);
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: {
      id: true,
      trade: true,
      description: true,
      shareToken: true,
      materials: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 },
    },
  });
  if (!job || !starter || starter.trade !== job.trade) return;
  let sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().$transaction(async (tx) => {
    if (!job.description.trim() && starter.description) {
      await tx.job.update({ where: { id: job.id }, data: { description: starter.description } });
    }
    for (const item of starter.items) {
      await tx.jobMaterial.create({
        data: {
          businessId: user.businessId,
          jobId: job.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPricePence: item.unitPricePence,
          costPricePence: null,
          sortOrder,
        },
      });
      sortOrder += 1;
    }
  });
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}#materials`);
}

export async function saveStarterTemplate(formData: FormData): Promise<void> {
  const user = await requireUser();
  const starter = findStarterTemplate(String(formData.get("starterId") ?? ""));
  if (!starter) redirect("/library?notice=missing");
  const existing = await getPrisma().materialTemplate.findMany({
    where: { ...tenantWhere(user.businessId), trade: starter.trade },
    select: { id: true, name: true },
  });
  const plan = planStarterLibraryUpdate(
    existing.map((template) => template.name),
    starter.trade,
  ).find((row) => row.starter.id === starter.id);
  if (!plan || plan.action === "skip" || plan.action === "rename") {
    const match = existing.find((template) => template.name === (plan?.existingName ?? starter.name));
    if (match) {
      const priced = await fillTemplatePrices(user.businessId, match.id, starter.items);
      if (plan?.action === "rename") {
        await getPrisma().materialTemplate.update({ where: { id: match.id }, data: { name: starter.name } });
      }
      revalidateDesk();
      if (priced > 0) redirect(`/library?notice=starters&added=0&renamed=0&priced=${priced}`);
      redirect("/library?notice=already");
    }
    if (!plan || plan.action !== "add") redirect("/library?notice=already");
  }
  await getPrisma().materialTemplate.create({
    data: {
      ...tenantWhere(user.businessId),
      userId: user.id,
      name: starter.name,
      trade: starter.trade,
      items: {
        create: starter.items.map((item, index) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPricePence: item.unitPricePence,
          costPricePence: null,
          ...coverageFields(starter.id, item.name),
          sortOrder: index,
        })),
      },
    },
  });
  revalidateDesk();
  redirect("/library?notice=saved");
}

export async function loadPlasteringStarters(): Promise<void> {
  const user = await requireUser();
  const existing = await getPrisma().materialTemplate.findMany({
    where: { ...tenantWhere(user.businessId), trade: "Plasterer" },
    select: { id: true, name: true },
  });
  const plan = planStarterLibraryUpdate(
    existing.map((template) => template.name),
    "Plasterer",
  );
  let added = 0;
  let renamed = 0;
  let priced = 0;
  await getPrisma().$transaction(async (tx) => {
    for (const row of plan) {
      if (row.action === "rename" && row.existingName) {
        const match = existing.find((template) => template.name === row.existingName);
        if (!match) continue;
        await tx.materialTemplate.update({ where: { id: match.id }, data: { name: row.starter.name } });
        renamed += 1;
        priced += await fillTemplatePrices(user.businessId, match.id, row.starter.items, tx);
        continue;
      }
      if (row.action === "skip") {
        const match = existing.find((template) => template.name.toLowerCase() === row.starter.name.toLowerCase());
        if (!match) continue;
        priced += await fillTemplatePrices(user.businessId, match.id, row.starter.items, tx);
        continue;
      }
      if (row.action !== "add") continue;
      await tx.materialTemplate.create({
        data: {
          ...tenantWhere(user.businessId),
          userId: user.id,
          name: row.starter.name,
          trade: row.starter.trade,
          items: {
            create: row.starter.items.map((item, index) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              unitPricePence: item.unitPricePence,
              costPricePence: null,
              ...coverageFields(row.starter.id, item.name),
              sortOrder: index,
            })),
          },
        },
      });
      added += 1;
    }
    const saved = await tx.savedMaterial.findMany({
      where: { ...tenantWhere(user.businessId), trade: "Plasterer" },
      select: { id: true, name: true, unit: true, unitPricePence: true },
    });
    for (const item of saved) {
      const starter = PLASTERING_STARTER_MATERIALS.find(
        (row) => row.name.toLowerCase() === item.name.trim().toLowerCase(),
      );
      if (!starter) continue;
      const update = blankPriceUpdate(item, starter);
      if (!update) continue;
      await tx.savedMaterial.update({ where: { id: item.id }, data: update });
      priced += 1;
    }
  });
  revalidateDesk();
  redirect(`/library?notice=starters&added=${added}&renamed=${renamed}&priced=${priced}`);
}

async function fillTemplatePrices(
  businessId: string,
  templateId: string,
  starters: readonly StarterLine[],
  tx: Pick<ReturnType<typeof getPrisma>, "materialTemplateItem"> = getPrisma(),
): Promise<number> {
  const template = await tx.materialTemplateItem.findMany({
    where: { templateId, template: { ...tenantWhere(businessId) } },
    select: { id: true, name: true, unit: true, unitPricePence: true },
  });
  let filled = 0;
  for (const item of template) {
    const starter = starters.find((row) => row.name.toLowerCase() === item.name.trim().toLowerCase());
    if (!starter) continue;
    const update = blankPriceUpdate(item, starter);
    if (!update) continue;
    await tx.materialTemplateItem.update({ where: { id: item.id }, data: update });
    filled += 1;
  }
  return filled;
}

export async function saveStarterItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const starter = findStarterMaterial(String(formData.get("starterId") ?? ""));
  if (!starter) redirect("/library?notice=missing");
  try {
    await getPrisma().savedMaterial.create({
      data: {
        ...tenantWhere(user.businessId),
        userId: user.id,
        trade: starter.trade,
        name: starter.name,
        unit: starter.unit,
        unitPricePence: starter.unitPricePence,
        costPricePence: null,
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      const existing = await getPrisma().savedMaterial.findFirst({
        where: { ...tenantWhere(user.businessId), trade: starter.trade, name: starter.name },
        select: { id: true, name: true, unit: true, unitPricePence: true },
      });
      const update = existing ? blankPriceUpdate(existing, starter) : null;
      if (existing && update) {
        await getPrisma().savedMaterial.update({ where: { id: existing.id }, data: update });
        revalidateDesk();
        redirect("/library?notice=starters&added=0&renamed=0&priced=1");
      }
      redirect("/library?notice=already");
    }
    throw error;
  }
  revalidateDesk();
  redirect("/library?notice=saved");
}

function coverageFields(templateId: string, name: string): { coverageBasis: string; coverageAmount: number | null } {
  const coverage = starterCoverage(templateId, name);
  if (!coverage) return { coverageBasis: "", coverageAmount: null };
  return { coverageBasis: coverage.basis, coverageAmount: coverage.perUnit };
}
