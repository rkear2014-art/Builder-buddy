import Link from "next/link";
import { MoneyFigure } from "@/components/money-figure";
import { formatIsoDate } from "@/lib/dates";
import { listInvoices, requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const user = await requireUser();
  const invoices = await listInvoices(user.businessId);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="font-display text-4xl">Invoices</h1>
      <p className="text-stone">Numbers run in order for this business, starting at INV-0001. Overdue is worked out from the due date.</p>
      {invoices.length === 0 ? <p className="card">No invoices yet. Raise one from a job.</p> : null}
      <ul className="grid gap-3">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="card grid gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/invoices/${invoice.id}`} className="font-display text-2xl" style={{ color: user.branding.accentColour }}>
                {invoice.reference}
              </Link>
              <span className="rounded-full bg-[#f4f6f8] px-3 py-1 text-sm font-extrabold">{invoice.standing}</span>
            </div>
            <p className="font-bold">{invoice.customerName}</p>
            <p className="text-stone">
              Issued {formatIsoDate(invoice.issueDate, "long")} · Due {formatIsoDate(invoice.dueDate, "long")}
            </p>
            <p>
              Balance <MoneyFigure pence={invoice.balancePence} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
