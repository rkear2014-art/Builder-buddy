"use server";

import { redirect } from "next/navigation";
import { tenantWhere } from "@/lib/tenancy";
import { findStarterMaterial, findStarterTemplate, planStarterLibraryUpdate } from "@/lib/trade-starters";
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
          unitPricePence: null,
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
  if (!plan || plan.action === "skip") redirect("/library?notice=already");
  if (plan.action === "rename" && plan.existingName) {
    const match = existing.find((template) => template.name === plan.existingName);
    if (match) {
      await getPrisma().materialTemplate.update({ where: { id: match.id }, data: { name: starter.name } });
      revalidateDesk();
      redirect("/library?notice=already");
    }
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
          unitPricePence: null,
          costPricePence: null,
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
  await getPrisma().$transaction(async (tx) => {
    for (const row of plan) {
      if (row.action === "rename" && row.existingName) {
        const match = existing.find((template) => template.name === row.existingName);
        if (!match) continue;
        await tx.materialTemplate.update({ where: { id: match.id }, data: { name: row.starter.name } });
        renamed += 1;
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
              unitPricePence: null,
              costPricePence: null,
              sortOrder: index,
            })),
          },
        },
      });
      added += 1;
    }
  });
  revalidateDesk();
  redirect(`/library?notice=starters&added=${added}&renamed=${renamed}`);
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
        unitPricePence: null,
        costPricePence: null,
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error)) redirect("/library?notice=already");
    throw error;
  }
  revalidateDesk();
  redirect("/library?notice=saved");
}
