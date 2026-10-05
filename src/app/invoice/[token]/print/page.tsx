import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";
import { getPublicInvoice } from "@/server/dal";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function PrintInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getPublicInvoice(token);
  if (!view) notFound();

  return (
    <main className="mx-auto max-w-3xl bg-white px-4 py-6">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <PrintButton />
        <Link href={`/invoice/${token}`} className="btn btn-secondary">
          Back
        </Link>
      </div>
      <InvoiceDocument invoice={view.invoice} letterhead={view.letterhead} badges={view.badges} />
    </main>
  );
}
