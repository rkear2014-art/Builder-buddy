import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PillLink } from "@/components/pill-link";
import { InlineForm } from "@/components/inline-form";
import { MoneyFigure } from "@/components/money-figure";
import { SendQuote } from "@/components/send-quote";
import { SubmitButton } from "@/components/submit-button";
import { deskLogoSrc } from "@/lib/branding";
import { parseQuoteChips } from "@/lib/quote";
import { trustBadges } from "@/lib/trust";
import { londonToday } from "@/lib/dates";
import { invoiceVatIsLocked } from "@/lib/invoice";
import { markInvoiceSent, recordPayment, saveInvoiceDates, saveInvoiceVat } from "@/server/actions/customer-finish";
import { saveInvoiceReminderPause } from "@/server/actions/reminders";
import { brandedEmailReady } from "@/server/email";
import { getInvoice, requireUser } from "@/server/dal";
import { requestOrigin } from "@/server/origin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const invoice = await getInvoice(user.businessId, id);
  return { title: invoice ? invoice.reference : "Invoice" };
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const invoice = await getInvoice(user.businessId, id);
  if (!invoice) notFound();
  const query = await searchParams;
  const origin = await requestOrigin();
  const shareUrl = origin ? `${origin}/invoice/${invoice.shareToken}` : `/invoice/${invoice.shareToken}`;
  const badges = [...trustBadges(user.branding), ...parseQuoteChips(user.branding.quoteChips)].slice(0, 8);
  const letterhead = {
    branding: user.branding,
    logoSrc: user.branding.hasLogo ? deskLogoSrc(user.branding.logoUpdatedAt) : null,
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <p>
        <span className="inline-flex flex-wrap gap-2">
          <PillLink href="/invoices" back>
            Invoices
          </PillLink>
          <PillLink href={`/jobs/${invoice.jobId}`}>Job</PillLink>
        </span>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">{invoice.reference}</h1>
        <p className="text-lg font-bold">
          Balance <MoneyFigure pence={invoice.balancePence} />
        </p>
      </div>
      {query.sent === "1" ? <p className="card font-bold">Branded email sent.</p> : null}

      <InvoiceDocument invoice={invoice} letterhead={letterhead} badges={badges} />

      <div className="flex flex-wrap gap-2">
        <Link href={`/invoice/${invoice.shareToken}/print`} className="btn btn-secondary">
          Print or save as PDF
        </Link>
        {invoice.standing === "Draft" ? (
          <form action={markInvoiceSent}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <button className="btn" style={{ background: user.branding.accentColour, color: user.branding.accentInk }} type="submit">
              Mark as sent
            </button>
          </form>
        ) : null}
      </div>

      <section className="card grid gap-3">
        <h2 className="font-display text-2xl">VAT</h2>
        {invoiceVatIsLocked(invoice.standing === "Draft" ? "DRAFT" : "SENT", invoice.paidPence) ? (
          <p className="text-stone">This invoice has been sent or paid, so the VAT on it stays as it was.</p>
        ) : (
          <InlineForm action={saveInvoiceVat} className="grid gap-3">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="omitVat" value="no" />
            <label className="flex items-start gap-3 text-lg font-bold">
              <input type="checkbox" name="omitVat" value="yes" defaultChecked={!invoice.vatOn} className="mt-1 h-7 w-7" />
              <span>
                No VAT on this invoice
                <span className="mt-1 block text-sm font-semibold text-stone">
                  {invoice.vatOn
                    ? `The balance includes VAT at ${invoice.vatRatePercent}%. Tick this to leave it off while the invoice is still a draft.`
                    : "VAT is off this draft. Untick it to add the rate from the Business page."}
                </span>
              </span>
            </label>
            <SubmitButton variant="secondary">Save VAT</SubmitButton>
          </InlineForm>
        )}
      </section>

      <section className="card grid gap-3">
        <h2 className="font-display text-2xl">Dates</h2>
        <InlineForm action={saveInvoiceDates} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <label className="field">
            Issue date
            <input name="issueDate" type="date" defaultValue={invoice.issueDate} required />
          </label>
          <label className="field">
            Due date
            <input name="dueDate" type="date" defaultValue={invoice.dueDate} required />
          </label>
          <SubmitButton>Save dates</SubmitButton>
        </InlineForm>
      </section>

      <section id="reminders" className="card grid gap-3">
        <h2 className="font-display text-2xl">Reminders</h2>
        {invoice.standing === "Paid" ? (
          <p className="text-stone">This invoice is paid, so no more reminders will be sent.</p>
        ) : invoice.standing === "Draft" ? (
          <p className="text-stone">Reminders start after the invoice is marked as sent and the due date has passed.</p>
        ) : (
          <p className="text-stone">
            {invoice.remindersPaused
              ? "Reminders are paused for this invoice."
              : user.branding.remindersOn
                ? `Reminders follow the business schedule: ${user.branding.reminderDays.join(", ")} days after the due date.`
                : "Reminders are turned off for the whole business."}
          </p>
        )}
        {invoice.reminders.length === 0 ? (
          <p className="font-bold">No reminders sent yet.</p>
        ) : (
          <ul className="grid gap-1">
            {invoice.reminders.map((reminder) => (
              <li key={reminder.step} className="font-bold">
                {reminder.label}
              </li>
            ))}
          </ul>
        )}
        <InlineForm action={saveInvoiceReminderPause} className="grid gap-3">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <input type="hidden" name="paused" value="no" />
          <label className="flex items-start gap-3 text-lg font-bold">
            <input
              type="checkbox"
              name="paused"
              value="yes"
              defaultChecked={invoice.remindersPaused}
              className="mt-1 h-7 w-7"
            />
            <span>Pause reminders</span>
          </label>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </InlineForm>
      </section>

      <section className="card grid gap-3">
        <h2 className="font-display text-2xl">Record a payment</h2>
        <InlineForm action={recordPayment} className="grid gap-3">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <label className="field">
            Amount
            <span>Pounds, such as 150.00.</span>
            <input name="amount" inputMode="decimal" required placeholder="150.00" />
          </label>
          <label className="field">
            Date
            <input name="paidOn" type="date" defaultValue={londonToday()} required />
          </label>
          <label className="field">
            Method
            <select name="method" defaultValue="TRANSFER">
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Bank transfer</option>
              <option value="CARD">Card</option>
            </select>
          </label>
          <SubmitButton>Save payment</SubmitButton>
        </InlineForm>
      </section>

      <section className="card grid gap-3">
        <h2 className="font-display text-2xl">Customer link</h2>
        <p className="overflow-x-auto rounded-xl bg-[#f4f6f8] px-3 py-3 font-mono text-sm">{shareUrl}</p>
        <SendQuote
          customerName={invoice.customerName}
          businessName={user.businessName}
          email={invoice.email}
          phone={invoice.phone}
          url={shareUrl}
          kind="invoice"
          brandedReady={brandedEmailReady()}
          invoiceId={invoice.id}
          jobId={invoice.jobId}
        />
      </section>
    </div>
  );
}
