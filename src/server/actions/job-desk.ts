"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/form-state";
import { materialsTotals } from "@/lib/materials";
import { depositFromPercent } from "@/lib/quote";
import { surveyForTrade, toggleSurveyStored } from "@/lib/survey";
import { tenantWhere } from "@/lib/tenancy";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function setShowLinePrices(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const showLinePrices = String(formData.get("showLinePrices") ?? "") === "yes";
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true },
  });
  if (!existing) return;
  await getPrisma().job.update({ where: { id: existing.id }, data: { showLinePrices } });
  revalidateDesk(existing.id, existing.shareToken);
}

export async function setSurveyTick(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const key = String(formData.get("key") ?? "");
  const on = String(formData.get("done") ?? "") === "yes";
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, trade: true, surveyDone: true, shareToken: true },
  });
  if (!existing) return;
  const allowed = surveyForTrade(existing.trade).map((item) => item.key);
  const surveyDone = toggleSurveyStored(existing.surveyDone, key, on, allowed);
  if (surveyDone === existing.surveyDone) return;
  await getPrisma().job.update({ where: { id: existing.id }, data: { surveyDone } });
  revalidateDesk(existing.id, existing.shareToken);
}

export async function savePaymentTerms(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const mode = String(formData.get("depositMode") ?? "");
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: {
      id: true,
      shareToken: true,
      materials: { select: { quantity: true, unitPricePence: true } },
    },
  });
  if (!existing) return { error: "That job could not be found." };
  let depositPence: number | null = null;
  if (mode === "deposit") {
    const percent = Number(String(formData.get("depositPercent") ?? "").trim());
    const total = materialsTotals(
      existing.materials.map((line) => ({
        quantity: line.quantity.toString(),
        unitPricePence: line.unitPricePence,
      })),
    );
    depositPence = depositFromPercent(total.totalPence, percent);
    if (depositPence == null) {
      return { error: "Add prices to the items first, then choose a deposit from 1 to 90 percent." };
    }
  } else if (mode !== "none") {
    return { error: "Choose deposit or no deposit." };
  }
  await getPrisma().job.update({ where: { id: existing.id }, data: { depositPence } });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/jobs/${existing.id}#payment`);
}
