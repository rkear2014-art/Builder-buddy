"use server";

import { redirect } from "next/navigation";
import { createShareToken } from "@/lib/access";
import { isJobStatus } from "@/lib/constants";
import { addDays, isoToUtcDate, londonToday } from "@/lib/dates";
import type { ActionState } from "@/lib/form-state";
import { tenantWhere } from "@/lib/tenancy";
import { findStarterTemplate } from "@/lib/trade-starters";
import { parseJobForm, parseTemplateForm } from "@/lib/validators";
import { requireUser } from "@/server/dal";
import { getPrisma, isUniqueConstraint } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function createJob(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseJobForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const starter = findStarterTemplate(String(formData.get("starterId") ?? ""));
  const useStarter = starter && starter.trade === parsed.data.trade ? starter : null;
  const job = await getPrisma().$transaction(async (tx) => {
    const allocated = await tx.business.update({
      where: { id: user.businessId },
      data: { nextQuoteNumber: { increment: 1 } },
      select: { nextQuoteNumber: true, quoteValidDays: true },
    });
    const quoteDays = allocated.quoteValidDays >= 1 && allocated.quoteValidDays <= 365 ? allocated.quoteValidDays : 30;
    const created = await tx.job.create({
      data: {
        ...tenantWhere(user.businessId),
        userId: user.id,
        customerName: parsed.data.customerName,
        address: parsed.data.address,
        phone: parsed.data.phone,
        email: parsed.data.email,
        trade: parsed.data.trade,
        description: parsed.data.description,
        internalNotes: parsed.data.internalNotes,
        scheduledDate: isoToUtcDate(parsed.data.scheduledDate),
        timeSlot: parsed.data.timeSlot,
        status: parsed.data.status,
        showLinePrices: parsed.data.showLinePrices,
        depositPence: parsed.data.depositPence,
        shareToken: createShareToken(),
        quoteNumber: allocated.nextQuoteNumber - 1,
        validUntil: isoToUtcDate(addDays(londonToday(), quoteDays)),
      },
      select: { id: true },
    });
    if (useStarter) {
      for (const [index, item] of useStarter.items.entries()) {
        await tx.jobMaterial.create({
          data: {
            businessId: user.businessId,
            jobId: created.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPricePence: item.unitPricePence,
            costPricePence: null,
            sortOrder: index,
          },
        });
      }
    }
    return created;
  });
  revalidateDesk(job.id);
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseJobForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true },
  });
  if (!existing) return { error: "That job could not be found." };
  await getPrisma().job.update({
    where: { id: existing.id },
    data: {
      customerName: parsed.data.customerName,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
      trade: parsed.data.trade,
      description: parsed.data.description,
      internalNotes: parsed.data.internalNotes,
      scheduledDate: isoToUtcDate(parsed.data.scheduledDate),
      timeSlot: parsed.data.timeSlot,
      status: parsed.data.status,
      showLinePrices: parsed.data.showLinePrices,
      depositPence: parsed.data.depositPence,
    },
  });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/jobs/${existing.id}`);
}

export async function setJobStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isJobStatus(status)) return;
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true },
  });
  if (!existing) return;
  await getPrisma().job.update({ where: { id: existing.id }, data: { status } });
  revalidateDesk(existing.id, existing.shareToken);
}

export async function rotateShareLink(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, signOff: { select: { id: true } } },
  });
  if (!existing || existing.signOff) return;
  const shareToken = createShareToken();
  await getPrisma().job.update({ where: { id: existing.id }, data: { shareToken, shareActive: true } });
  revalidateDesk(existing.id, existing.shareToken);
  revalidateDesk(existing.id, shareToken);
}

export async function revokeShareLink(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, signOff: { select: { id: true } } },
  });
  if (!existing || existing.signOff) return;
  await getPrisma().job.update({ where: { id: existing.id }, data: { shareActive: false } });
  revalidateDesk(existing.id, existing.shareToken);
}

export async function deleteJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true },
  });
  if (!existing) return;
  await getPrisma().job.delete({ where: { id: existing.id } });
  revalidateDesk();
  redirect("/jobs");
}

export async function saveJobAsTemplate(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseTemplateForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    include: { materials: { orderBy: { sortOrder: "asc" } } },
  });
  if (!job) return { error: "That job could not be found." };
  if (job.materials.length === 0) {
    return { error: "Add some materials before saving a template." };
  }
  try {
    await getPrisma().materialTemplate.create({
      data: {
        ...tenantWhere(user.businessId),
        userId: user.id,
        name: parsed.data.name,
        trade: parsed.data.trade,
        items: {
          create: job.materials.map((material, index) => ({
            name: material.name,
            quantity: material.quantity,
            unit: material.unit,
            unitPricePence: material.unitPricePence,
            costPricePence: material.costPricePence,
            sortOrder: index,
          })),
        },
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error)) return { error: "That template already exists." };
    throw error;
  }
  revalidateDesk(job.id);
  redirect(`/jobs/${job.id}#materials`);
}
