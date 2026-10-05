import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { getPublicInvoice } from "@/server/dal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getPublicInvoice(token);
  return {
    title: view ? `${view.invoice.reference} · ${view.invoice.customerName}` : "Invoice",
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getPublicInvoice(token);
  if (!view) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-3 py-6 sm:px-4">
      <p className="mb-4 text-lg">Invoice from {view.invoice.businessName}.</p>
      <InvoiceDocument invoice={view.invoice} letterhead={view.letterhead} badges={view.badges} />
      <div className="mt-4">
        <Link href={`/invoice/${token}/print`} className="btn btn-secondary">
          Print or save as PDF
        </Link>
      </div>
    </main>
  );
}
