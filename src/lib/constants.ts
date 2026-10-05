export const TRADES = [
  "Plasterer",
  "Builder",
  "Electrician",
  "Plumber",
  "Carpenter",
  "Decorator",
  "Roofer",
  "Other",
] as const;

export type Trade = (typeof TRADES)[number];

/**
 * Trades the desk offers right now. Add a name from TRADES to switch it back on.
 * Jobs already saved under another trade still open.
 */
export const ENABLED_TRADES = ["Plasterer"] as const satisfies readonly Trade[];

const TRADE_LABELS: Record<Trade, string> = {
  Plasterer: "Plastering",
  Builder: "Building",
  Electrician: "Electrical",
  Plumber: "Plumbing",
  Carpenter: "Carpentry",
  Decorator: "Decorating",
  Roofer: "Roofing",
  Other: "Other",
};

export function enabledTrades(): Trade[] {
  return [...ENABLED_TRADES];
}

export function singleEnabledTrade(): Trade | null {
  return ENABLED_TRADES.length === 1 ? ENABLED_TRADES[0] : null;
}

export function isEnabledTrade(value: string): value is Trade {
  return (ENABLED_TRADES as readonly string[]).includes(value);
}

export function tradeLabel(value: string): string {
  if (isTrade(value)) return TRADE_LABELS[value];
  return value;
}

/** The only switched-on trade is not repeated on every card. Any other saved trade still shows. */
export function visibleTradeLabel(value: string): string | null {
  const only = singleEnabledTrade();
  if (!value.trim()) return null;
  if (only && value === only) return null;
  return tradeLabel(value);
}

export const JOB_STATUSES = ["ENQUIRY", "BOOKED", "IN_PROGRESS", "COMPLETE"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  ENQUIRY: "Enquiry",
  BOOKED: "Booked",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
};

export const TIME_SLOTS = [
  { value: "early", label: "Early (7–9am)" },
  { value: "morning", label: "Morning (8am–12pm)" },
  { value: "afternoon", label: "Afternoon (12–4pm)" },
  { value: "late", label: "Late (4–6pm)" },
  { value: "all-day", label: "All day" },
] as const;

export const UNITS = [
  "each",
  "sheet",
  "bag",
  "box",
  "roll",
  "length",
  "tube",
  "litre",
  "kg",
  "m",
  "m²",
  "hour",
  "day",
] as const

export function isTrade(value: string): value is Trade {
  return TRADES.some((trade) => trade === value);
}

export function isJobStatus(value: string): value is JobStatus {
  return JOB_STATUSES.some((status) => status === value);
}

export function isTimeSlot(value: string): boolean {
  return TIME_SLOTS.some((slot) => slot.value === value);
}

export function slotLabel(value: string): string {
  return TIME_SLOTS.find((slot) => slot.value === value)?.label ?? value;
}

export function statusClass(status: JobStatus): string {
  switch (status) {
    case "ENQUIRY":
      return "status-enquiry";
    case "BOOKED":
      return "status-booked";
    case "IN_PROGRESS":
      return "status-progress";
    case "COMPLETE":
      return "status-complete";
  }
}
