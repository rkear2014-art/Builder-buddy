import type { JobStatus } from "./constants";
import type { QuoteStage } from "./quote-stage";

export type JobNextStep =
  | { id: "materials"; label: string; href: string }
  | { id: "send"; label: string; href: string }
  | { id: "waiting"; label: string }
  | { id: "book"; label: string; href: string }
  | { id: "invoice"; label: string }
  | { id: "done"; label: string }
  | { id: "lost"; label: string };

/** The one action this job needs next. Later stages wait until the quote has moved on. */
export function jobNextStep(input: {
  quoteStage: QuoteStage;
  status: JobStatus;
  onDiary: boolean;
  signed: boolean;
  jobId: string;
}): JobNextStep {
  if (input.quoteStage === "LOST") return { id: "lost", label: "This quote is lost" };
  if (input.quoteStage === "DRAFT") {
    return { id: "materials", label: "Add materials / price the job", href: `/jobs/${input.jobId}/choose` };
  }
  if (input.quoteStage === "QUOTED") {
    return { id: "send", label: "Send the quote", href: "#quote" };
  }
  if (input.quoteStage === "SENT" && !input.signed) {
    return { id: "waiting", label: "Waiting for signature" };
  }
  if (input.status === "COMPLETE") return { id: "done", label: "Job finished" };
  if ((input.status === "BOOKED" || input.status === "IN_PROGRESS") && input.onDiary) {
    return { id: "invoice", label: "Raise invoice" };
  }
  return { id: "book", label: "Book the job in", href: `/jobs/${input.jobId}/book` };
}

export function openJobSection(step: JobNextStep["id"]): "price" | "quote" | "diary" | "invoice" | null {
  switch (step) {
    case "materials":
      return "price";
    case "send":
    case "waiting":
      return "quote";
    case "book":
      return "diary";
    case "invoice":
      return "invoice";
    default:
      return null;
  }
}
