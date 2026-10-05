"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/form-state";
import { isInternalCrewName } from "@/lib/crew";
import { materialsTotals } from "@/lib/materials";
import { parsePoundsToPence } from "@/lib/money";
import { chargeVat, depositFromPercent, quoteMoney } from "@/lib/quote";
import { stageAfterQuoteMade } from "@/lib/quote-stage";
import { tenantWhere } from "@/lib/tenancy";
import { requireUser } from "@/server/dal";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function saveCustomerPrice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const totalOnly = formData.getAll("totalOnly").map(String).includes("yes");
  const price = parsePoundsToPence(String(formData.get("fixedPrice") ?? ""));
  if (!price.ok) return { error: price.error };
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, quoteStage: true },
  });
  if (!existing) return { error: "That job could not be found." };
  await getPrisma().job.update({
    where: { id: existing.id },
    data: {
      totalOnly,
      fixedPricePence: price.pence != null && price.pence > 0 ? price.pence : null,
      quoteStage: stageAfterQuoteMade(existing.quoteStage),
    },
  });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/jobs/${existing.id}#materials`);
}

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

export async function savePaymentTerms(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const mode = String(formData.get("depositMode") ?? "");
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: {
      id: true,
      shareToken: true,
      omitVat: true,
      business: { select: { vatRegistered: true, vatRatePercent: true } },
      materials: { select: { name: true, quantity: true, unitPricePence: true } },
    },
  });
  if (!existing) return { error: "That job could not be found." };
  let depositPence: number | null = null;
  if (mode === "deposit") {
    const percent = Number(String(formData.get("depositPercent") ?? "").trim());
    const subtotal = materialsTotals(
      existing.materials
        .filter((line) => !isInternalCrewName(line.name))
        .map((line) => ({
          quantity: line.quantity.toString(),
          unitPricePence: line.unitPricePence,
        })),
    );
    const price = quoteMoney({
      subtotalPence: subtotal.totalPence,
      vatRegistered: chargeVat({ vatRegistered: existing.business.vatRegistered, omitVat: existing.omitVat }),
      vatRatePercent: existing.business.vatRatePercent,
      depositPence: null,
    });
    depositPence = depositFromPercent(price.totalPence, percent);
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

export async function saveQuoteVat(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const omitVat = formData.getAll("omitVat").map(String).includes("yes");
  const existing = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true },
  });
  if (!existing) return { error: "That job could not be found." };
  await getPrisma().job.update({ where: { id: existing.id }, data: { omitVat } });
  revalidateDesk(existing.id, existing.shareToken);
  redirect(`/jobs/${existing.id}#materials`);
}
