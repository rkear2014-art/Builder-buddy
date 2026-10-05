import { STATUS_LABELS, type JobStatus } from "@/lib/constants";
import { JOB_PROGRESS, QUOTE_STAGE_LABELS, QUOTE_STAGES, type QuoteStage } from "@/lib/quote-stage";
import { setJobStatus, setQuoteStage } from "@/server/actions/jobs";

const WON_GREEN = "#178a45";

export function JobStatusRow({
  jobId,
  quoteStage,
  status,
  accent,
  accentInk,
}: {
  jobId: string;
  quoteStage: QuoteStage;
  status: JobStatus;
  accent: string;
  accentInk: string;
}) {
  return (
    <div className="grid gap-3">
      <section aria-label="Job status">
        <p className="text-xs font-extrabold tracking-[0.14em] text-stone">JOB STATUS</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUOTE_STAGES.map((stage) => {
            const selected = stage === quoteStage;
            const style = selected ? selectedStyle(stage, accent, accentInk) : undefined;
            return (
              <form key={stage} action={setQuoteStage} className="min-w-[5.25rem] flex-1">
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="quoteStage" value={stage} />
                <button className="btn btn-secondary w-full px-2" style={style} type="submit" aria-pressed={selected}>
                  {QUOTE_STAGE_LABELS[stage]}
                </button>
              </form>
            );
          })}
        </div>
        <p className="mt-2 text-sm font-bold text-stone">Current: {QUOTE_STAGE_LABELS[quoteStage]}</p>
      </section>

      {quoteStage === "WON" ? (
        <section aria-label="Job progress">
          <p className="text-xs font-extrabold tracking-[0.14em] text-stone">JOB PROGRESS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {JOB_PROGRESS.map((progress) => {
              const selected = status === progress;
              return (
                <form key={progress} action={setJobStatus} className="min-w-[7rem] flex-1">
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="status" value={progress} />
                  <button
                    className="btn btn-secondary w-full px-2"
                    style={
                      selected
                        ? { background: "white", color: accent, borderColor: accent }
                        : undefined
                    }
                    type="submit"
                    aria-pressed={selected}
                  >
                    {STATUS_LABELS[progress]}
                  </button>
                </form>
              );
            })}
          </div>
          <p className="mt-2 text-sm font-bold text-stone">
            Current: {status === "ENQUIRY" ? "Not booked yet" : STATUS_LABELS[status]}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function selectedStyle(stage: QuoteStage, accent: string, accentInk: string): { background: string; color: string; borderColor: string } {
  if (stage === "WON") return { background: WON_GREEN, color: "#ffffff", borderColor: WON_GREEN };
  if (stage === "LOST") return { background: "#17171a", color: "#ffffff", borderColor: "#17171a" };
  return { background: accent, color: accentInk, borderColor: accent };
}
