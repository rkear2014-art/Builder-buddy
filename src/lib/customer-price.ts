import { tradeLabel } from "./constants";

/** Price before VAT. A whole-job amount replaces the materials total. */
export function customerSubtotalPence(input: {
  materialsTotalPence: number;
  fixedPricePence?: number | null;
}): number {
  if (input.fixedPricePence != null && input.fixedPricePence > 0) return input.fixedPricePence;
  return input.materialsTotalPence;
}

/** Customer quote, invoice and link hide material lines when the total stands alone. */
export function hidesMaterialLines(input: {
  totalOnly?: boolean;
  fixedPricePence?: number | null;
}): boolean {
  return input.totalOnly === true || (input.fixedPricePence != null && input.fixedPricePence > 0);
}

/** One customer line, such as “Plastering works as described”. */
export function scopeLine(trade: string): string {
  const label = tradeLabel(trade).trim();
  if (!label || label === "Other") return "Works as described";
  return `${label} works as described`;
}

export function poundsFieldValue(pence: number | null | undefined): string {
  if (pence == null || pence <= 0) return "";
  return (pence / 100).toFixed(2);
}
