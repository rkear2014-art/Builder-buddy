import type { JobStatus } from "./constants";

export const QUOTE_STAGES = ["DRAFT", "QUOTED", "SENT", "WON", "LOST"] as const;

export type QuoteStage = (typeof QUOTE_STAGES)[number];

export const QUOTE_STAGE_LABELS: Record<QuoteStage, string> = {
  DRAFT: "Draft",
  QUOTED: "Quoted",
  SENT: "Sent",
  WON: "Won",
  LOST: "Lost",
};

/** Progress after the quote is won. Enquiry stays on the job until it is booked. */
export const JOB_PROGRESS = ["BOOKED", "IN_PROGRESS", "COMPLETE"] as const;

export function isQuoteStage(value: string): value is QuoteStage {
  return (QUOTE_STAGES as readonly string[]).includes(value);
}

/** A new or saved quote leaves Draft. Later stages stay where they are. */
export function stageAfterQuoteMade(stage: QuoteStage): QuoteStage {
  return stage === "DRAFT" ? "QUOTED" : stage;
}

/** Email, WhatsApp or text marks a draft or quoted job as sent. Won and lost stay. */
export function stageAfterSent(stage: QuoteStage): QuoteStage {
  if (stage === "DRAFT" || stage === "QUOTED") return "SENT";
  return stage;
}

/**
 * Won takes the job off the diary so it can be booked on a chosen day.
 * Work already started or finished keeps its diary place.
 */
export function onDiaryAfterWon(status: JobStatus, onDiary: boolean): boolean {
  if (status === "IN_PROGRESS" || status === "COMPLETE") return onDiary;
  return false;
}
