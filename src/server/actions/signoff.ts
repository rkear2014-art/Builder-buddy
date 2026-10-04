"use server";

import { redirect } from "next/navigation";
import { isWellFormedShareToken } from "@/lib/access";
import { keepExistingSignOff, lockAgreement, parseLockedAgreement } from "@/lib/agreement";
import { isConfigured } from "@/lib/config";
import { quoteIsExpired } from "@/lib/documents";
import { londonToday, utcDateToIso } from "@/lib/dates";
import type { ActionState } from "@/lib/form-state";
import { acceptedSignature } from "@/lib/signature";
import { parseSignerName } from "@/lib/validators";
import { getPrisma, isUniqueConstraint } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function signAgreement(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!isConfigured()) {
    return { error: "Builder Buddy is not configured." };
  }
  const token = String(formData.get("token") ?? "");
  if (!isWellFormedShareToken(token)) {
    return { error: "This link is not valid." };
  }
  const signer = parseSignerName(String(formData.get("signerName") ?? ""));
  if (!signer.ok) return { error: signer.error };
  const signature = acceptedSignature(String(formData.get("signature") ?? ""));
  if (!signature) return { error: "Add a signature before sending." };

  const job = await getPrisma().job.findUnique({
    where: { shareToken: token },
    include: {
      materials: { orderBy: { sortOrder: "asc" } },
      signOff: true,
      business: { select: { name: true, vatRegistered: true, vatRatePercent: true } },
    },
  });
  if (!job || !job.shareActive) return { error: "This link is not valid." };
  if (!job.signOff && quoteIsExpired(utcDateToIso(job.validUntil), londonToday(), false)) {
    return { error: "This quotation has expired. Ask for a new one." };
  }

  const incoming = lockAgreement(
    {
      businessName: job.business.name,
      customerName: job.customerName,
      address: job.address,
      phone: job.phone,
      email: job.email,
      trade: job.trade,
      description: job.description,
      internalNotes: job.internalNotes,
      scheduledDate: job.scheduledDate.toISOString().slice(0, 10),
      timeSlot: job.timeSlot,
      showLinePrices: job.showLinePrices,
      depositPence: job.depositPence,
      vatRegistered: job.business.vatRegistered,
      vatRatePercent: job.business.vatRatePercent,
      materials: job.materials.map((material) => ({
        name: material.name,
        quantity: material.quantity.toString(),
        unit: material.unit,
        unitPricePence: material.unitPricePence,
        costPricePence: material.costPricePence,
      })),
    },
    { signerName: signer.data.signerName, signedAt: new Date().toISOString() },
  );

  const existing = job.signOff ? parseLockedAgreement(job.signOff.snapshot) : null;
  const decision = keepExistingSignOff(existing, incoming);
  if (job.signOff || !decision.created) {
    return { error: "This agreement has already been signed." };
  }

  try {
    await getPrisma().signOff.create({
      data: {
        businessId: job.businessId,
        jobId: job.id,
        signerName: incoming.signerName,
        signatureData: signature,
        signedAt: new Date(incoming.signedAt),
        snapshot: incoming,
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return { error: "This agreement has already been signed." };
    }
    throw error;
  }

  revalidateDesk(job.id, token);
  redirect(`/sign/${token}`);
}
