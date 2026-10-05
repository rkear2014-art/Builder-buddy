"use server";

import { redirect } from "next/navigation";
import { isIsoDate, isoToUtcDate } from "@/lib/dates";
import { diaryView } from "@/lib/diary";
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
    where: {
      id: jobId,
      ...tenantWhere(user.businessId),
      onDiary: false,
      status: { in: ["BOOKED", "IN_PROGRESS"] },
    },
    select: { id: true, shareToken: true },
  });
  if (!existing) redirect(`/diary?view=${view}&date=${date}`);
  await getPrisma().job.update({
    where: { id: existing.id },
    data: { scheduledDate: isoToUtcDate(date), onDiary: true },
  });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/diary?view=${view}&date=${date}`);
}
