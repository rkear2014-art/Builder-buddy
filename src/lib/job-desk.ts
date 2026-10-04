import { STATUS_LABELS, type JobStatus } from "./constants";

export function quoteStatusLabel(
  status: JobStatus,
  showLinePrices: boolean,
): { pill: string; toggle: string; showPrices: boolean } {
  if (status === "ENQUIRY" && showLinePrices) {
    return { pill: "Quoting · prices shown", toggle: "Back to draft (hide prices)", showPrices: false };
  }
  if (status === "ENQUIRY") {
    return { pill: "Draft · prices hidden", toggle: "Show prices on the quote", showPrices: true };
  }
  const name = STATUS_LABELS[status];
  if (showLinePrices) {
    return { pill: `${name} · prices shown`, toggle: "Hide prices on the quote", showPrices: false };
  }
  return { pill: `${name} · prices hidden`, toggle: "Show prices on the quote", showPrices: true };
}
