import Link from "next/link";
import { formatIsoDate, formatLondonDateTime } from "@/lib/dates";
import { listQuotes, requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes" };

export default async function QuotesPage() {
  const user = await requireUser();
  const quotes = await listQuotes(user.businessId);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="font-display text-4xl">Quotes</h1>
      <p className="text-stone">Each quote has its own number for this business. A tick means the customer has opened the link.</p>
      {quotes.length === 0 ? <p className="card">No quotes yet. Book a job and the first number is Q-0001.</p> : null}
      <ul className="grid gap-3">
        {quotes.map((quote) => (
          <li key={quote.id} className="card grid gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/jobs/${quote.id}`} className="font-display text-2xl" style={{ color: user.branding.accentColour }}>
                {quote.reference}
              </Link>
              <span className="font-bold">{quote.customerName}</span>
            </div>
            <p className="text-stone">Valid until {formatIsoDate(quote.validUntil, "long")}</p>
            <p>
              {quote.signed ? "Signed" : quote.expired ? "Expired" : "Open"}
              {quote.lastViewedAt ? ` · ✓ Viewed ${formatLondonDateTime(quote.lastViewedAt)}` : " · Not opened yet"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
