import Link from "next/link";
import { notFound } from "next/navigation";
import { getShareView } from "@/server/dal";
import { QuotationDocument } from "@/components/quotation-document";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function PrintAgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getShareView(token);
  const share = view.presentation;
  if (share.kind === "not_found" || share.kind === "damaged" || !view.quote) notFound();

  return (
    <main className="mx-auto max-w-3xl bg-white px-4 py-6">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <PrintButton />
        <Link href={`/sign/${token}`} className="btn btn-secondary">
          Back
        </Link>
      </div>
      <QuotationDocument
        agreement={share.agreement}
        letterhead={view.letterhead}
        quote={view.quote}
        signatureDataUrl={share.kind === "signed" ? share.signatureDataUrl : null}
        signed={
          share.kind === "signed"
            ? { signerName: share.agreement.signerName, signedAt: share.agreement.signedAt }
            : null
        }
      />
    </main>
  );
}
