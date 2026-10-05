import type { CSSProperties } from "react";
import type { CustomerLetterhead } from "@/lib/branding";
import { formatIsoDate } from "@/lib/dates";
import { PAYMENT_METHOD_LABELS, type InvoiceStanding } from "@/lib/invoice";
import { formatPence } from "@/lib/money";
import { addressLines, quoteFooter } from "@/lib/quote";

export type InvoiceDocumentModel = {
  reference: string;
  standing: InvoiceStanding;
  issueDate: string;
  dueDate: string;
  customerName: string;
  address: string;
  lines: Array<{ id: string; name: string; quantity: string; unit: string; unitPricePence: number | null }>;
  payments: Array<{ id: string; amountPence: number; paidOn: string; method: keyof typeof PAYMENT_METHOD_LABELS }>;
  subtotalPence: number;
  vatPence: number | null;
  vatRatePercent: number;
  totalPence: number;
  depositPence: number | null;
  duePence: number;
  paidPence: number;
  balancePence: number;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
};

export function InvoiceDocument({
  invoice,
  letterhead,
  badges,
}: {
  invoice: InvoiceDocumentModel;
  letterhead: CustomerLetterhead | null;
  badges: string[];
}) {
  const branding = letterhead?.branding;
  const accent = branding?.accentColour ?? "#395571";
  const businessName = branding?.name || "Invoice";
  const logoSrc = letterhead?.logoSrc ?? null;

  return (
    <article className="quote" style={{ "--quote-accent": accent } as CSSProperties}>
      <section className="quote-sheet px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt={`${businessName} logo`} className="h-16 w-auto max-w-48 object-contain" />
            ) : (
              <p className="font-display text-3xl">{businessName}</p>
            )}
            <p className="mt-3 text-sm font-extrabold tracking-wide" style={{ color: accent }}>
              {businessName.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-4xl leading-none">Invoice</h1>
            <p className="mt-2 font-extrabold">{invoice.reference}</p>
            <p className="mt-1 inline-block rounded-full px-3 py-1 text-sm font-extrabold text-white" style={{ background: accent }}>
              {invoice.standing}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-stone">Bill to</p>
            <p className="font-bold">{invoice.customerName}</p>
            {addressLines(invoice.address).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <dl className="grid gap-1 sm:justify-self-end">
            <div>
              <dt className="text-sm font-bold text-stone">Issue date</dt>
              <dd>{formatIsoDate(invoice.issueDate, "long")}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-stone">Due date</dt>
              <dd>{formatIsoDate(invoice.dueDate, "long")}</dd>
            </div>
          </dl>
        </div>

        <table className="mt-6 w-full text-left">
          <thead>
            <tr className="border-b border-line text-sm text-stone">
              <th className="py-2 font-bold">Work</th>
              <th className="py-2 font-bold">Qty</th>
              <th className="py-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.length === 0 ? (
              <tr>
                <td className="py-3 text-stone" colSpan={3}>
                  No lines on this invoice.
                </td>
              </tr>
            ) : null}
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-b border-line">
                <td className="py-2">
                  {line.name}
                  <span className="block text-sm text-stone">{line.unit}</span>
                </td>
                <td className="py-2">{line.quantity}</td>
                <td className="py-2 text-right">
                  {line.unitPricePence == null ? "—" : formatPence(Math.round(Number(line.quantity) * line.unitPricePence))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 grid gap-1 sm:ml-auto sm:max-w-xs">
          {invoice.vatPence != null ? (
            <>
              <MoneyLine label="Subtotal (ex VAT)" amount={formatPence(invoice.subtotalPence)} />
              <MoneyLine label={`VAT at ${invoice.vatRatePercent}%`} amount={formatPence(invoice.vatPence)} />
            </>
          ) : null}
          <MoneyLine label={invoice.vatPence != null ? "Total (inc VAT)" : "Total"} amount={formatPence(invoice.totalPence)} strong />
          {invoice.depositPence != null ? (
            <MoneyLine label="Deposit already taken" amount={`−${formatPence(invoice.depositPence)}`} />
          ) : null}
          <MoneyLine label="Paid" amount={formatPence(invoice.paidPence)} />
          <p className="mt-2 flex items-center justify-between rounded-2xl px-3 py-3 text-white" style={{ background: accent }}>
            <span className="font-extrabold">Balance due</span>
            <span className="font-display text-3xl leading-none">{formatPence(invoice.balancePence)}</span>
          </p>
        </div>

        {invoice.payments.length > 0 ? (
          <div className="mt-6">
            <h2 className="font-display text-2xl">Payments</h2>
            <ul className="mt-2 grid gap-1">
              {invoice.payments.map((payment) => (
                <li key={payment.id}>
                  {formatIsoDate(payment.paidOn, "long")} · {PAYMENT_METHOD_LABELS[payment.method]} · {formatPence(payment.amountPence)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="font-display text-2xl">How to pay</h2>
          {invoice.bankAccountName || invoice.bankSortCode || invoice.bankAccountNumber ? (
            <dl className="mt-2 grid gap-1">
              {invoice.bankAccountName ? (
                <div>
                  <dt className="text-sm font-bold text-stone">Account name</dt>
                  <dd>{invoice.bankAccountName}</dd>
                </div>
              ) : null}
              {invoice.bankSortCode ? (
                <div>
                  <dt className="text-sm font-bold text-stone">Sort code</dt>
                  <dd>{invoice.bankSortCode}</dd>
                </div>
              ) : null}
              {invoice.bankAccountNumber ? (
                <div>
                  <dt className="text-sm font-bold text-stone">Account number</dt>
                  <dd>{invoice.bankAccountNumber}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-stone">Bank details have not been added yet.</p>
          )}
        </div>

        {badges.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <li key={badge} className="quote-badge">
                {badge}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-6 text-sm text-stone">
          {quoteFooter({
            name: businessName,
            website: branding?.website ?? "",
            email: branding?.email ?? "",
          })}
        </p>
        <div className="quote-bar mt-4" />
      </section>
    </article>
  );
}

function MoneyLine({ label, amount, strong = false }: { label: string; amount: string; strong?: boolean }) {
  return (
    <p className={`flex items-center justify-between gap-4 ${strong ? "font-extrabold" : ""}`}>
      <span>{label}</span>
      <span>{amount}</span>
    </p>
  );
}
