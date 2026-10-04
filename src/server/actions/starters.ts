"use server";

import { redirect } from "next/navigation";
import { tenantWhere } from "@/lib/tenancy";
import { findStarterMaterial, findStarterTemplate } from "@/lib/trade-starters";
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
      shareToken: true,
      materials: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 },
    },
  });
  if (!job || !starter || starter.trade !== job.trade) return;
  let sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().$transaction(async (tx) => {
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
  const existing = await getPrisma().materialTemplate.findFirst({
    where: { ...tenantWhere(user.businessId), trade: starter.trade, name: starter.name },
    select: { id: true },
  });
  if (existing) redirect("/library?notice=already");
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
