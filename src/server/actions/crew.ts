"use server";

import { redirect } from "next/navigation";
import { parseCrewFields, priceCrew } from "@/lib/crew";
import type { ActionState } from "@/lib/form-state";
import { tenantWhere } from "@/lib/tenancy";
import { measuredAreaM2, writeCrewDefaults } from "@/server/crew-store";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { sectionForWrite } from "@/server/quote-section";
import { noteQuoteMade } from "@/server/quote-progress";
import { revalidateDesk } from "@/server/revalidate";

export async function saveCrewRates(formData: FormData): Promise<void> {
  const user = await requireUser();
  const saved = await writeCrewDefaults(user.businessId, formData);
  if (!saved) redirect("/library?notice=crew");
  revalidateDesk();
  redirect("/library?notice=crew-saved");
}

export async function saveJobCrew(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseCrewFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true },
  });
  if (!job) redirect("/jobs");
  const section = await sectionForWrite(user.businessId, job.id, String(formData.get("sectionId") ?? ""));
  const totalM2 = await measuredAreaM2(user.businessId, job.id, section.id);
  const priced = priceCrew({ ...parsed.crew, totalM2 });
  const labour = priced.customerLine;
  const dayCount = parsed.crew.days == null ? null : parsed.crew.days.toFixed(2);
  await getPrisma().$transaction(async (tx) => {
    for (const role of parsed.crew.roles) {
      await tx.jobCrew.upsert({
        where: { sectionId_role: { sectionId: section.id, role: role.role } },
        create: {
          businessId: user.businessId,
          jobId: job.id,
          sectionId: section.id,
          role: role.role,
          count: role.count,
          basis: role.basis,
          ratePence: role.ratePence,
        },
        update: { count: role.count, basis: role.basis, ratePence: role.ratePence },
      });
    }
    await tx.jobSection.update({ where: { id: section.id }, data: { dayCount } });
    await tx.job.update({ where: { id: job.id }, data: { dayCount } });
    if (labour) {
      await tx.jobMaterial.deleteMany({
        where: {
          sectionId: section.id,
          ...tenantWhere(user.businessId),
          fromMeasure: true,
          name: { in: ["Labour", "Labour, day rate"] },
        },
      });
      const existing = await tx.jobMaterial.findFirst({
        where: { jobId: job.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      await tx.jobMaterial.create({
        data: {
          businessId: user.businessId,
          jobId: job.id,
          sectionId: section.id,
          name: labour.name,
          quantity: labour.quantity,
          unit: labour.unit,
          unitPricePence: labour.unitPricePence,
          costPricePence: priced.costUnitPricePence,
          fromMeasure: true,
          sortOrder: (existing?.sortOrder ?? -1) + 1,
        },
      });
    }
  });
  await noteQuoteMade(job.id);
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}#quote-jobs`);
}
