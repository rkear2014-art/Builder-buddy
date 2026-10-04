"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/form-state";
import { parseMaterialForm } from "@/lib/validators";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

async function ownedJob(userId: string, jobId: string) {
  return getPrisma().job.findFirst({
    where: { id: jobId, userId },
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
  const job = await ownedJob(user.id, jobId);
  if (!job) return { error: "That job could not be found." };
  const sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().jobMaterial.create({
    data: {
      jobId: job.id,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unitPricePence: parsed.data.unitPricePence,
      costPricePence: parsed.data.costPricePence,
      sortOrder,
    },
  });
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}#materials`);
}

export async function addSavedMaterialToJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const savedId = String(formData.get("savedId") ?? "");
  const job = await ownedJob(user.id, jobId);
  const saved = await getPrisma().savedMaterial.findFirst({
    where: { id: savedId, userId: user.id },
  });
  if (!job || !saved) return;
  const sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().jobMaterial.create({
    data: {
      jobId: job.id,
      name: saved.name,
      quantity: "1",
      unit: saved.unit,
      unitPricePence: saved.unitPricePence,
      costPricePence: saved.costPricePence,
      sortOrder,
    },
  });
  revalidateDesk(job.id, job.shareToken);
}

export async function applyTemplate(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const job = await ownedJob(user.id, jobId);
  const template = await getPrisma().materialTemplate.findFirst({
    where: { id: templateId, userId: user.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!job || !template || template.items.length === 0) return;
  let sortOrder = (job.materials[0]?.sortOrder ?? -1) + 1;
  await getPrisma().$transaction(async (tx) => {
    for (const item of template.items) {
      await tx.jobMaterial.create({
        data: {
          jobId: job.id,
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
  revalidateDesk(job.id, job.shareToken);
}

export async function toggleMaterialBought(formData: FormData): Promise<void> {
  const user = await requireUser();
  const materialId = String(formData.get("materialId") ?? "");
  const material = await getPrisma().jobMaterial.findFirst({
    where: { id: materialId, job: { userId: user.id } },
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
    where: { id: materialId, job: { userId: user.id } },
    select: { id: true, jobId: true, job: { select: { shareToken: true } } },
  });
  if (!material) return;
  await getPrisma().jobMaterial.delete({ where: { id: material.id } });
  revalidateDesk(material.jobId, material.job.shareToken);
}
