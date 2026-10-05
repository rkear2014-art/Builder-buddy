"use server";

import { redirect } from "next/navigation";
import { isIsoDate, isoToUtcDate } from "@/lib/dates";
import { diaryView, parseDiaryPlace } from "@/lib/diary";
import type { ActionState } from "@/lib/form-state";
import { tenantWhere } from "@/lib/tenancy";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function placeDiaryJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const date = String(formData.get("date") ?? "");
  const view = diaryView(String(formData.get("view") ?? ""));
  if (!isIsoDate(date)) redirect("/diary");
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, status: true, quoteStage: true },
  });
  if (!existing) redirect(`/diary?view=${view}&date=${date}`);
  await getPrisma().job.update({
    where: { id: existing.id },
    data: {
      scheduledDate: isoToUtcDate(date),
      onDiary: true,
      ...(existing.status === "ENQUIRY" ? { status: "BOOKED" as const } : {}),
      ...(existing.quoteStage === "LOST" ? { quoteStage: "WON" as const } : {}),
    },
  });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/diary?view=${view}&date=${date}`);
}

/** Puts this job on the diary for the chosen date, days, and Job or Quote visit. */
export async function saveDiaryBooking(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseDiaryPlace(formData);
  if (!parsed.ok) return { error: parsed.error };
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, status: true, quoteStage: true },
  });
  if (!existing) return { error: "That job could not be found." };
  await getPrisma().job.update({
    where: { id: existing.id },
    data: {
      scheduledDate: isoToUtcDate(parsed.data.scheduledDate),
      spanDays: parsed.data.spanDays,
      bookingKind: parsed.data.bookingKind,
      onDiary: true,
      ...(existing.status === "ENQUIRY" ? { status: "BOOKED" as const } : {}),
      ...(existing.quoteStage === "LOST" ? { quoteStage: "WON" as const } : {}),
    },
  });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/diary?view=week&date=${parsed.data.scheduledDate}`);
}
