import Link from "next/link";
import { notFound } from "next/navigation";
import { getShareView } from "@/server/dal";
import { AgreementDocument } from "@/components/agreement-document";
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

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6">
      {share.kind === "damaged" ? (
        <div className="card">
          <h1 className="font-display text-4xl">This signed copy cannot be shown</h1>
          <p className="mt-3">Ask the tradesperson to contact you. The live job is not shown in its place.</p>
        </div>
      ) : (
        <div className="card">
          {share.kind === "pending" ? (
            <p className="mb-4 text-lg">
              Please read the work, materials, and price. Sign at the bottom if you agree.
            </p>
          ) : (
            <p className="mb-4 text-lg">Thank you. This is the copy you agreed.</p>
          )}
          <AgreementDocument
            agreement={share.agreement}
            letterhead={view.letterhead}
            signatureDataUrl={share.kind === "signed" ? share.signatureDataUrl : null}
            signed={
              share.kind === "signed"
                ? { signerName: share.agreement.signerName, signedAt: share.agreement.signedAt }
                : null
            }
          />
          {share.kind === "pending" ? (
            <div className="mt-6 border-t border-line pt-4">
              <SignForm token={token} />
            </div>
          ) : (
            <Link href={`/sign/${token}/print`} className="btn btn-secondary mt-6">
              Print or save as PDF
            </Link>
          )}
        </div>
      )}
      <p className="mt-4 text-sm text-stone">
        This page shows only this job. You do not need an account. Internal notes and the tradesperson&apos;s costs are
        not included.
      </p>
    </main>
  );
}
