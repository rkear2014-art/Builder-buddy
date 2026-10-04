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
] as const;

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
