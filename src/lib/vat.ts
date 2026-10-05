export type QuoteMoney = {
  subtotalPence: number;
  vatPence: number | null;
  totalPence: number;
  depositPence: number | null;
};

export function quoteMoney(input: {
  subtotalPence: number;
  vatRegistered: boolean;
  vatRatePercent: number;
  depositPence: number | null;
}): QuoteMoney {
  const subtotalPence = Math.max(0, Math.round(input.subtotalPence));
  const rate = Number.isInteger(input.vatRatePercent) ? Math.min(30, Math.max(0, input.vatRatePercent)) : 20;
  const vatPence = input.vatRegistered ? Math.round((subtotalPence * rate) / 100) : null;
  const deposit = input.depositPence;
  const depositPence = deposit != null && deposit > 0 ? deposit : null;
  return {
    subtotalPence,
    vatPence,
    totalPence: subtotalPence + (vatPence ?? 0),
    depositPence,
  };
}

/** VAT is charged when the business is registered, unless this quote or invoice turns it off. */
export function chargeVat(input: { vatRegistered: boolean; omitVat?: boolean }): boolean {
  return input.vatRegistered === true && input.omitVat !== true;
}

/** The line Kearglaze prints under a price that already includes VAT. */
export function pricesIncludeVatLine(ratePercent: number): string {
  const rate = Number.isInteger(ratePercent) ? ratePercent : 20;
  return `Prices include VAT at ${rate}%`;
}

/**
 * A quote the customer has already opened, or a signed agreement, keeps the VAT it was given.
 * Drafts that have not been opened follow the business setting.
 */
export function quoteKeepsIssuedVat(input: { viewed: boolean; signed: boolean }): boolean {
  return input.viewed || input.signed;
}

/** Blank is allowed. A UK number is stored as GB plus 9 or 12 digits. */
export function normaliseVatNumber(value: string): { ok: true; vatNumber: string } | { ok: false; error: string } {
  const compact = value.replace(/[\s-]/g, "").toUpperCase();
  if (!compact) return { ok: true, vatNumber: "" };
  const digits = compact.startsWith("GB") ? compact.slice(2) : compact;
  if (!/^\d{9}(\d{3})?$/.test(digits)) {
    return { ok: false, error: "Enter a UK VAT number, such as GB123456789, or leave it blank." };
  }
  return { ok: true, vatNumber: `GB${digits}` };
}
