import { z } from "zod";
import { customerLineTotalPence, materialsTotals, normaliseQuantity } from "./materials";

export type AgreementSource = {
  businessName: string;
  customerName: string;
  address: string;
  phone: string;
  email: string;
  trade: string;
  description: string;
  internalNotes?: string;
  scheduledDate: string;
  timeSlot: string;
  showLinePrices?: boolean;
  depositPence?: number | null;
  vatRegistered?: boolean;
  vatRatePercent?: number;
  materials: Array<{
    name: string;
    quantity: string;
    unit: string;
    unitPricePence: number | null;
    costPricePence?: number | null;
  }>;
};

export type PublicMaterialLine = {
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  lineTotalPence: number | null;
};

/** What a customer is allowed to see. No internal notes and no trade costs. */
export type PublicAgreement = {
  businessName: string;
  customerName: string;
  address: string;
  phone: string;
  email: string;
  trade: string;
  description: string;
  scheduledDate: string;
  timeSlot: string;
  materials: PublicMaterialLine[];
  totalPence: number;
  unpricedCount: number;
  showLinePrices: boolean;
  depositPence: number | null;
  vatRegistered: boolean;
  vatRatePercent: number;
};

export type LockedAgreement = PublicAgreement & {
  version: 1;
  signerName: string;
  signedAt: string;
};

const publicMaterialSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
  unitPricePence: z.number().int().nullable(),
  lineTotalPence: z.number().int().nullable(),
});

export const lockedAgreementSchema = z.object({
  version: z.literal(1),
  businessName: z.string(),
  customerName: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  trade: z.string(),
  description: z.string(),
  scheduledDate: z.string(),
  timeSlot: z.string(),
  materials: z.array(publicMaterialSchema),
  totalPence: z.number().int(),
  unpricedCount: z.number().int(),
  showLinePrices: z.boolean().optional(),
  depositPence: z.number().int().nullable().optional(),
  vatRegistered: z.boolean().optional(),
  vatRatePercent: z.number().int().optional(),
  signerName: z.string(),
  signedAt: z.string(),
});

export function toPublicAgreement(job: AgreementSource): PublicAgreement {
  const materials: PublicMaterialLine[] = job.materials.map((line) => ({
    name: line.name.trim(),
    quantity: normaliseQuantity(line.quantity),
    unit: line.unit.trim(),
    unitPricePence: line.unitPricePence,
    lineTotalPence: customerLineTotalPence({
      quantity: line.quantity,
      unitPricePence: line.unitPricePence,
    }),
  }));
  const totals = materialsTotals(job.materials);
  return {
    businessName: job.businessName.trim(),
    customerName: job.customerName.trim(),
    address: job.address.trim(),
    phone: job.phone.trim(),
    email: job.email.trim(),
    trade: job.trade.trim(),
    description: job.description.trim(),
    scheduledDate: job.scheduledDate,
    timeSlot: job.timeSlot,
    materials,
    totalPence: totals.totalPence,
    unpricedCount: totals.unpricedCount,
    showLinePrices: job.showLinePrices !== false,
    depositPence: job.depositPence != null && job.depositPence > 0 ? job.depositPence : null,
    vatRegistered: job.vatRegistered === true,
    vatRatePercent: normalVatRate(job.vatRatePercent),
  };
}

function normalVatRate(rate: number | undefined): number {
  if (rate == null || !Number.isInteger(rate) || rate < 0 || rate > 30) return 20;
  return rate;
}

/** Copies the customer-facing agreement so later edits cannot change it. */
export function lockAgreement(
  job: AgreementSource,
  signature: { signerName: string; signedAt: string },
): LockedAgreement {
  const agreed = structuredClone(toPublicAgreement(job));
  return {
    version: 1,
    ...agreed,
    signerName: signature.signerName.trim(),
    signedAt: signature.signedAt,
  };
}

export function parseLockedAgreement(value: unknown): LockedAgreement | null {
  const parsed = lockedAgreementSchema.safeParse(value);
  if (!parsed.success) return null;
  const data = parsed.data;
  return {
    ...data,
    showLinePrices: data.showLinePrices !== false,
    depositPence: data.depositPence != null && data.depositPence > 0 ? data.depositPence : null,
    vatRegistered: data.vatRegistered === true,
    vatRatePercent: normalVatRate(data.vatRatePercent),
  };
}

export function keepExistingSignOff<T>(
  existing: T | null,
  incoming: T,
): { accepted: T; created: boolean } {
  if (existing) return { accepted: existing, created: false };
  return { accepted: incoming, created: true };
}

function materialsMatch(left: PublicMaterialLine[], right: PublicMaterialLine[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((line, index) => {
    const other = right[index];
    return (
      line.name === other.name &&
      line.quantity === other.quantity &&
      line.unit === other.unit &&
      line.unitPricePence === other.unitPricePence &&
      line.lineTotalPence === other.lineTotalPence
    );
  });
}

/** Labels of customer-facing fields that differ from the signed copy. */
export function agreementChanges(locked: LockedAgreement, current: PublicAgreement): string[] {
  const changes: string[] = [];
  if (locked.businessName !== current.businessName) changes.push("Business name");
  if (locked.customerName !== current.customerName) changes.push("Customer name");
  if (locked.address !== current.address) changes.push("Address");
  if (locked.phone !== current.phone) changes.push("Phone");
  if (locked.email !== current.email) changes.push("Email");
  if (locked.trade !== current.trade) changes.push("Trade");
  if (locked.description !== current.description) changes.push("Work description");
  if (locked.scheduledDate !== current.scheduledDate) changes.push("Date");
  if (locked.timeSlot !== current.timeSlot) changes.push("Time slot");
  if (!materialsMatch(locked.materials, current.materials)) changes.push("Materials or prices");
  if (locked.vatRegistered !== current.vatRegistered || locked.vatRatePercent !== current.vatRatePercent) {
    changes.push("VAT");
  }
  if (locked.depositPence !== current.depositPence) changes.push("Deposit");
  if (locked.showLinePrices !== current.showLinePrices) changes.push("Item prices");
  return changes;
}
