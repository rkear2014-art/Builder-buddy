import Link from "next/link";
import { notFound } from "next/navigation";
import { getShareView } from "@/server/dal";
import { QuotationDocument } from "@/components/quotation-document";
import { SignForm } from "@/components/sign-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = (await getShareView(token)).presentation;
  if (share.kind === "pending" || share.kind === "signed") {
    return {
      title: `Agreement for ${share.agreement.customerName}`,
      robots: { index: false, follow: false },
    };
  }
  return { title: "Agreement", robots: { index: false, follow: false } };
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getShareView(token);
  const share = view.presentation;
  if (share.kind === "not_found") notFound();

  const quote = view.quote;
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-3 py-6 sm:px-4">
      {share.kind === "damaged" || !quote ? (
        <div className="card">
          <h1 className="font-display text-4xl">This signed copy cannot be shown</h1>
          <p className="mt-3">Ask the tradesperson to contact you. The live job is not shown in its place.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-lg">
            {share.kind === "pending"
              ? quote.expired
                ? "This quotation has passed its valid until date."
                : "Please read the quotation. Sign at the end if you agree."
              : "Thank you. This is the copy you agreed."}
          </p>
          <QuotationDocument
            agreement={share.agreement}
            letterhead={view.letterhead}
            quote={quote}
            signatureDataUrl={share.kind === "signed" ? share.signatureDataUrl : null}
            signed={
              share.kind === "signed"
                ? {
                    signerName: share.agreement.signerName,
                    signedAt: share.agreement.signedAt,
                    termsAgreedAt: share.agreement.termsAgreedAt,
                  }
                : null
            }
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/sign/${token}/print`} className="btn btn-secondary">
              Print or save as PDF
            </Link>
          </div>
          {share.kind === "pending" && quote.expired ? (
            <div className="card mt-4">
              <h2 className="font-display text-3xl">Expired</h2>
              <p className="mt-2">This quotation is no longer valid. Please ask {share.agreement.businessName} for a new one.</p>
            </div>
          ) : null}
          {share.kind === "pending" && !quote.expired ? (
            <div className="card mt-4">
              <SignForm token={token} terms={quote.terms} />
            </div>
          ) : null}
        </>
      )}
      <p className="mt-4 text-sm text-stone">
        This page shows only this job. You do not need an account. Internal notes and the tradesperson&apos;s costs are
        not included.
      </p>
    </main>
  );
}
