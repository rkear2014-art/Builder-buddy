"use server";

import { redirect } from "next/navigation";
import { parsePoundsToPence } from "@/lib/money";
import { tenantWhere } from "@/lib/tenancy";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function addQuoteJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, sections: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!job) redirect("/jobs");
  const created = await getPrisma().jobSection.create({
    data: {
      businessId: user.businessId,
      jobId: job.id,
      title: "",
      typeKey: "",
      sortOrder: (job.sections[0]?.sortOrder ?? -1) + 1,
    },
  });
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}/choose?section=${created.id}`);
}

export async function removeQuoteJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sectionId = String(formData.get("sectionId") ?? "");
  const section = await getPrisma().jobSection.findFirst({
    where: { id: sectionId, ...tenantWhere(user.businessId) },
    select: { id: true, jobId: true, job: { select: { shareToken: true } } },
  });
  if (!section) return;
  await getPrisma().jobSection.delete({ where: { id: section.id } });
  revalidateDesk(section.jobId, section.job.shareToken);
  redirect(`/jobs/${section.jobId}#quote-jobs`);
}

export async function saveQuoteJob(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const price = parsePoundsToPence(String(formData.get("fixedPrice") ?? ""));
  if (!price.ok) redirect(jobId ? `/jobs/${jobId}#quote-jobs` : "/jobs");
  const section = await getPrisma().jobSection.findFirst({
    where: { id: sectionId, ...tenantWhere(user.businessId) },
    select: { id: true, jobId: true, job: { select: { shareToken: true } } },
  });
  if (!section) return;
  await getPrisma().jobSection.update({
    where: { id: section.id },
    data: {
      title,
      fixedPricePence: price.pence != null && price.pence > 0 ? price.pence : null,
    },
  });
  revalidateDesk(section.jobId, section.job.shareToken);
  redirect(`/jobs/${section.jobId}#quote-jobs`);
}
