"use server";

import { redirect } from "next/navigation";
import { createShareToken } from "@/lib/access";
import { isJobStatus } from "@/lib/constants";
import { addDays, isoToUtcDate, londonToday } from "@/lib/dates";
import { isQuoteStage, onDiaryAfterWon, stageAfterQuoteMade, stageAfterSent } from "@/lib/quote-stage";
import type { ActionState } from "@/lib/form-state";
import { tenantWhere } from "@/lib/tenancy";
import { parseBookingForm, parseJobForm, parseTemplateForm } from "@/lib/validators";
import { requireUser } from "@/server/dal";
import { getPrisma, isUniqueConstraint } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function createJob(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseBookingForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const job = await getPrisma().$transaction(async (tx) => {
    const allocated = await tx.business.update({
      where: { id: user.businessId },
      data: { nextQuoteNumber: { increment: 1 } },
      select: { nextQuoteNumber: true, quoteValidDays: true, totalOnlyDefault: true },
    });
    const quoteDays = allocated.quoteValidDays >= 1 && allocated.quoteValidDays <= 365 ? allocated.quoteValidDays : 30;
    const created = await tx.job.create({
      data: {
        ...tenantWhere(user.businessId),
        userId: user.id,
        customerName: parsed.data.customerName,
        address: parsed.data.address,
        postcode: parsed.data.postcode,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        town: parsed.data.town,
        county: parsed.data.county,
        phone: parsed.data.phone,
        email: parsed.data.email,
        trade: parsed.data.trade,
        description: parsed.data.description,
        internalNotes: parsed.data.internalNotes,
        scheduledDate: isoToUtcDate(parsed.data.scheduledDate),
        timeSlot: parsed.data.timeSlot,
        bookingKind: parsed.data.bookingKind,
        spanDays: parsed.data.spanDays,
        onDiary: parsed.data.onDiary,
        assignedName: parsed.data.assignedName,
        status: parsed.data.status,
        quoteStage: "QUOTED",
        totalOnly: allocated.totalOnlyDefault,
        showLinePrices: parsed.data.showLinePrices,
        depositPence: parsed.data.depositPence,
        shareToken: createShareToken(),
        quoteNumber: allocated.nextQuoteNumber - 1,
        validUntil: isoToUtcDate(addDays(londonToday(), quoteDays)),
      },
      select: { id: true },
    });
    const section = await tx.jobSection.create({
      data: { businessId: user.businessId, jobId: created.id, title: "", typeKey: "", sortOrder: 0 },
      select: { id: true },
    });
    return { id: created.id, sectionId: section.id };
  });
  revalidateDesk(job.id);
  redirect(`/jobs/${job.id}/choose?section=${job.sectionId}`);
}

export async function updateJob(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseJobForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, quoteStage: true },
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
      bookingKind: parsed.data.bookingKind,
      spanDays: parsed.data.spanDays,
      onDiary: parsed.data.onDiary,
      assignedName: parsed.data.assignedName,
      status: parsed.data.status,
      quoteStage: stageAfterQuoteMade(existing.quoteStage),
      showLinePrices: parsed.data.showLinePrices,
      depositPence: parsed.data.depositPence,
    },
  });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/jobs/${existing.id}`);
}

export async function setQuoteStage(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const quoteStage = String(formData.get("quoteStage") ?? "");
  if (!isQuoteStage(quoteStage)) return;
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, status: true, onDiary: true },
  });
  if (!existing) return;
  await getPrisma().job.update({
    where: { id: existing.id },
    data: {
      quoteStage,
      onDiary:
        quoteStage === "LOST"
          ? false
          : quoteStage === "WON"
            ? onDiaryAfterWon(existing.status, existing.onDiary)
            : existing.onDiary,
    },
  });
  revalidateDesk(existing.id, existing.shareToken);
}

/** Records that the quote was opened in email, WhatsApp or text. Won and lost stay put. */
export async function markQuoteSent(jobId: string): Promise<void> {
  const user = await requireUser();
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, quoteStage: true },
  });
  if (!existing) return;
  const next = stageAfterSent(existing.quoteStage);
  if (next === existing.quoteStage) return;
  await getPrisma().job.update({ where: { id: existing.id }, data: { quoteStage: next } });
  revalidateDesk(existing.id, existing.shareToken);
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
