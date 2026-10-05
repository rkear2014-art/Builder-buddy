"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/form-state";
import { tenantWhere } from "@/lib/tenancy";
import { parseMaterialForm } from "@/lib/validators";
import { requireUser } from "@/server/dal";
import { sectionForWrite } from "@/server/quote-section";
import { getPrisma } from "@/server/prisma";
import { noteQuoteMade } from "@/server/quote-progress";
import { revalidateDesk } from "@/server/revalidate";

async function ownedJob(businessId: string, jobId: string) {
  return getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(businessId) },
    select: {
      id: true,
      shareToken: true,
      materials: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 },
    },
  });
}

export async function addJobMaterial(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseMaterialForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const job = await ownedJob(user.businessId, jobId);
  if (!job) return { error: "That job could not be found." };
  const section = await sectionForWrite(user.businessId, job.id, String(formData.get("sectionId") ?? ""));
  const sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().jobMaterial.create({
    data: {
      businessId: user.businessId,
      jobId: job.id,
      sectionId: section.id,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unitPricePence: parsed.data.unitPricePence,
      costPricePence: parsed.data.costPricePence,
      sortOrder,
    },
  });
  await noteQuoteMade(job.id);
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}#quote-jobs`);
}

export async function addSavedMaterialToJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const savedId = String(formData.get("savedId") ?? "");
  const job = await ownedJob(user.businessId, jobId);
  const saved = await getPrisma().savedMaterial.findFirst({
    where: { id: savedId, ...tenantWhere(user.businessId) },
  });
  if (!job || !saved) return;
  const section = await sectionForWrite(user.businessId, job.id, String(formData.get("sectionId") ?? ""));
  const sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().jobMaterial.create({
    data: {
      businessId: user.businessId,
      jobId: job.id,
      sectionId: section.id,
      name: saved.name,
      quantity: "1",
      unit: saved.unit,
      unitPricePence: saved.unitPricePence,
      costPricePence: saved.costPricePence,
      sortOrder,
    },
  });
  await noteQuoteMade(job.id);
  revalidateDesk(job.id, job.shareToken);
}

export async function applyTemplate(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const job = await ownedJob(user.businessId, jobId);
  const template = await getPrisma().materialTemplate.findFirst({
    where: { id: templateId, ...tenantWhere(user.businessId) },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!job || !template || template.items.length === 0) return;
  const section = await sectionForWrite(user.businessId, job.id, String(formData.get("sectionId") ?? ""));
  if (!section.title.trim()) {
    await getPrisma().jobSection.update({
      where: { id: section.id },
      data: { title: template.name.slice(0, 80), typeKey: `template:${template.id}` },
    });
  }
  let sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().$transaction(async (tx) => {
    for (const item of template.items) {
      await tx.jobMaterial.create({
        data: {
          businessId: user.businessId,
          jobId: job.id,
          sectionId: section.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPricePence: item.unitPricePence,
          costPricePence: item.costPricePence,
          sortOrder,
        },
      });
      sortOrder += 1;
    }
  });
  await noteQuoteMade(job.id);
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}#quote-jobs`);
}

export async function toggleMaterialBought(formData: FormData): Promise<void> {
  const user = await requireUser();
  const materialId = String(formData.get("materialId") ?? "");
  const material = await getPrisma().jobMaterial.findFirst({
    where: { id: materialId, ...tenantWhere(user.businessId) },
    select: { id: true, bought: true, jobId: true, job: { select: { shareToken: true } } },
  });
  if (!material) return;
  await getPrisma().jobMaterial.update({
    where: { id: material.id },
    data: { bought: !material.bought },
  });
  revalidateDesk(material.jobId, material.job.shareToken);
}

export async function deleteJobMaterial(formData: FormData): Promise<void> {
  const user = await requireUser();
  const materialId = String(formData.get("materialId") ?? "");
  const material = await getPrisma().jobMaterial.findFirst({
    where: { id: materialId, ...tenantWhere(user.businessId) },
    select: { id: true, jobId: true, job: { select: { shareToken: true } } },
  });
  if (!material) return;
  await getPrisma().jobMaterial.delete({ where: { id: material.id } });
  revalidateDesk(material.jobId, material.job.shareToken);
}
