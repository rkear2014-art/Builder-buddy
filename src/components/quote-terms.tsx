import { termsDocument, termsRuns, type TermsRun } from "@/lib/terms";

function RichText({ text }: { text: string }) {
  const runs: TermsRun[] = termsRuns(text);
  return runs.map((run, index) =>
    run.bold ? (
      <strong key={`${index}-${run.text.slice(0, 16)}`}>{run.text}</strong>
    ) : (
      <span key={`${index}-${run.text.slice(0, 16)}`}>{run.text}</span>
    ),
  );
}

export function TermsBody({ text }: { text: string }) {
  const document = termsDocument(text);
  return (
    <div className="terms-copy">
      <h2 className="font-display text-3xl leading-tight sm:text-4xl">
        <RichText text={document.title} />
      </h2>
      {document.clauses.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {document.clauses.map((clause, index) => (
            <p key={`${index}-${clause.slice(0, 24)}`} className="whitespace-pre-wrap">
              <RichText text={clause} />
            </p>
          ))}
        </div>
      ) : null}
      {document.footer ? (
        <p className="mt-6 border-t border-line pt-4 font-bold leading-relaxed whitespace-pre-wrap">
          <RichText text={document.footer} />
        </p>
      ) : null}
    </div>
  );
}

/** Letterhead block at the bottom of a customer quote, including print and PDF. */
export function QuoteTerms({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <section id="quote-terms" className="quote-sheet letterhead-sheet px-4 py-6 sm:px-6">
      <TermsBody text={text} />
    </section>
  );
}
