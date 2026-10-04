import { slotLabel } from "@/lib/constants";
import { formatIsoDate, formatLondonDateTime } from "@/lib/dates";
import type { PublicAgreement } from "@/lib/agreement";
import { formatPence } from "@/lib/money";

export function AgreementDocument({
  agreement,
  signatureDataUrl,
  signed,
}: {
  agreement: PublicAgreement;
  signatureDataUrl?: string | null;
  signed?: { signerName: string; signedAt: string } | null;
}) {
  const safeSignature =
    signatureDataUrl && signatureDataUrl.startsWith("data:image/png;base64,") ? signatureDataUrl : null;

  return (
    <article className="agreement">
      <p className="text-sm font-bold uppercase tracking-wide text-stone">{agreement.businessName}</p>
      <h1 className="mt-1 font-display text-4xl leading-tight">Work agreement</h1>
      <p className="mt-2 text-lg">
        {agreement.customerName}
        {agreement.address ? ` · ${agreement.address}` : ""}
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-bold text-stone">Trade</dt>
          <dd>{agreement.trade}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-stone">Visit</dt>
          <dd>
            {formatIsoDate(agreement.scheduledDate, "long")} · {slotLabel(agreement.timeSlot)}
          </dd>
        </div>
        {agreement.phone ? (
          <div>
            <dt className="text-sm font-bold text-stone">Phone</dt>
            <dd>{agreement.phone}</dd>
          </div>
        ) : null}
        {agreement.email ? (
          <div>
            <dt className="text-sm font-bold text-stone">Email</dt>
            <dd>{agreement.email}</dd>
          </div>
        ) : null}
      </dl>
      <h2 className="mt-6 font-display text-2xl">The work</h2>
      <p className="mt-2 whitespace-pre-wrap text-lg">{agreement.description}</p>
      <h2 className="mt-6 font-display text-2xl">Materials and price</h2>
      <ul className="mt-2 divide-y divide-line">
        {agreement.materials.length === 0 ? (
          <li className="py-3 text-stone">No materials are listed.</li>
        ) : (
          agreement.materials.map((line, index) => (
            <li key={`${line.name}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 py-3">
              <div>
                <p className="font-bold">{line.name}</p>
                <p className="text-stone">
                  {line.quantity} {line.unit}
                  {line.unitPricePence == null
                    ? ""
                    : line.unit === "each"
                      ? ` · ${formatPence(line.unitPricePence)}`
                      : ` · ${formatPence(line.unitPricePence)} per ${line.unit}`}
                </p>
              </div>
              <p className="font-bold">
                {line.lineTotalPence == null ? "To confirm" : formatPence(line.lineTotalPence)}
              </p>
            </li>
          ))
        )}
      </ul>
      <p className="mt-4 font-display text-3xl">Total {formatPence(agreement.totalPence)}</p>
      {agreement.unpricedCount > 0 ? (
        <p className="mt-1 text-stone">
          This total covers priced items only. {agreement.unpricedCount}{" "}
          {agreement.unpricedCount === 1 ? "item has" : "items have"} no price yet.
        </p>
      ) : null}
      {signed ? (
        <div className="mt-6 border-t border-line pt-4">
          <p className="font-bold">
            Signed by {signed.signerName} on {formatLondonDateTime(signed.signedAt)}.
          </p>
          {safeSignature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={safeSignature} alt={`Signature of ${signed.signerName}`} className="mt-3 max-h-40" />
          ) : null}
          <p className="mt-3 text-stone">
            This is the agreed copy. Later changes to the job do not alter what was signed.
          </p>
        </div>
      ) : null}
    </article>
  );
}
