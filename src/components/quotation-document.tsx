import type { CSSProperties } from "react";
import type { CustomerLetterhead } from "@/lib/branding";
import { formatIsoDate, formatLondonDateTime } from "@/lib/dates";
import type { PublicAgreement } from "@/lib/agreement";
import { formatPence } from "@/lib/money";
import { townFromAddress } from "@/lib/place";
import {
  addressLines,
  coverChips,
  quoteFooter,
  quoteLetterText,
  quoteMoney,
  stripTitle,
  type QuoteChrome,
} from "@/lib/quote";

export function QuotationDocument({
  agreement,
  letterhead,
  quote,
  signatureDataUrl,
  signed,
}: {
  agreement: PublicAgreement;
  letterhead: CustomerLetterhead | null;
  quote: QuoteChrome;
  signatureDataUrl?: string | null;
  signed?: { signerName: string; signedAt: string } | null;
}) {
  const branding = letterhead?.branding;
  const accent = branding?.accentColour ?? "#395571";
  const logoSrc = letterhead?.logoSrc ?? null;
  const businessName = branding?.name || agreement.businessName;
  const businessPhone = branding?.phone.trim() ?? "";
  const businessEmail = branding?.email.trim() ?? "";
  const businessAddress = branding?.address.trim() ?? "";
  const website = branding?.website ?? "";
  const money = quoteMoney({
    subtotalPence: agreement.totalPence,
    vatRegistered: agreement.vatRegistered,
    vatRatePercent: agreement.vatRatePercent,
    depositPence: agreement.depositPence,
  });
  const dateLabel = formatIsoDate(agreement.scheduledDate, "long");
  const chips = coverChips({
    tagline: branding?.tagline ?? "",
    town: townFromAddress(businessAddress),
    extra: quote.chips,
  });
  const hero = quote.photos[0] ?? null;
  const strip = quote.photos.length > 3 ? quote.photos.slice(1, 4) : quote.photos.slice(0, 3);
  const heroCaption = hero?.caption.trim() || (hero ? "Recent work" : "");
  const preparedBy = quote.preparedBy.trim() || businessName;
  const safeSignature =
    signatureDataUrl && signatureDataUrl.startsWith("data:image/png;base64,") ? signatureDataUrl : null;

  return (
    <article className="quote grid gap-4" style={{ "--quote-accent": accent } as CSSProperties}>
      <section id="quote-cover" className="quote-sheet">
        <div className="relative min-h-[22rem] overflow-hidden text-white sm:min-h-[28rem]">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background: hero
                ? "linear-gradient(105deg, rgba(8,10,14,0.88) 0%, rgba(8,10,14,0.62) 48%, rgba(8,10,14,0.28) 100%)"
                : `linear-gradient(115deg, #14181f 0%, #243044 55%, ${accent} 140%)`,
            }}
          />
          <div className="relative z-10 max-w-xl px-5 pb-28 pt-8">
            <h1 className="font-display text-5xl leading-none text-white sm:text-6xl">Your Quotation</h1>
            <p className="mt-3 text-lg text-white/95">Prepared for {agreement.customerName}</p>
          </div>
          {heroCaption ? <p className="quote-caption absolute bottom-20 left-4 z-10">{heroCaption}</p> : null}
          <div className="quote-cut absolute inset-x-0 bottom-0 z-10 h-16 bg-white" />
          {logoSrc ? (
            <div className="absolute bottom-3 right-4 z-20 rounded-xl bg-white p-2 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={`${businessName} logo`} className="h-14 w-auto max-w-40 object-contain" />
            </div>
          ) : (
            <p className="absolute bottom-4 right-4 z-20 font-display text-xl text-ink">{businessName}</p>
          )}
        </div>
        <div className="grid gap-6 px-5 py-5 sm:grid-cols-2">
          <dl className="grid gap-3">
            <Detail label="Customer" value={agreement.customerName} />
            <Detail label="Reference" value={quote.reference} />
            <Detail label="Date" value={dateLabel} />
          </dl>
          <dl className="grid gap-3">
            <Detail label="Prepared by" value={preparedBy} />
            {businessPhone ? <Detail label="Phone" value={businessPhone} /> : null}
          </dl>
        </div>
        {strip.length > 0 ? (
          <PhotoStrip photos={strip} />
        ) : null}
        {chips.length > 0 ? (
          <ul className="flex flex-wrap gap-2 px-5 pb-4">
            {chips.map((chip) => (
              <li key={chip} className="quote-badge">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="px-5 pb-4 text-sm text-stone">{quoteFooter({ name: businessName, website, email: businessEmail })}</p>
        <div className="quote-bar" />
      </section>

      <section id="quote-letter" className="quote-sheet px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <address className="not-italic">
            <p className="font-bold">{businessName}</p>
            {addressLines(businessAddress).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </address>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="h-12 w-auto max-w-36 object-contain" />
          ) : null}
        </div>
        <address className="mt-6 not-italic">
          <p className="font-bold">{agreement.customerName}</p>
          {addressLines(agreement.address).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </address>
        <p className="mt-6">Ref: {quote.reference}</p>
        <p>{dateLabel}</p>
        <p className="mt-6">Dear {agreement.customerName},</p>
        <p className="quote-accent mt-4 font-bold">Re: Our Quotation</p>
        <p className="mt-3 whitespace-pre-wrap">{quoteLetterText(quote.letter)}</p>
        <p className="mt-6">Yours sincerely,</p>
        <p className="quote-accent mt-4 font-display text-3xl italic">{preparedBy}</p>
        <p className="mt-2 font-bold">{preparedBy}</p>
        {businessPhone ? <p>Phone: {businessPhone}</p> : null}
      </section>

      <section id="quote-price" className="quote-sheet px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-4xl leading-none">Price Summary</h2>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="h-10 w-auto max-w-32 object-contain" />
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <dl className="grid gap-3">
            <Detail label="Customer" value={agreement.customerName} />
            <Detail label="Address" value={addressLines(agreement.address).join("\n")} />
          </dl>
          <dl className="grid gap-3">
            <Detail label="Reference" value={quote.reference} />
            <Detail label="Prepared by" value={preparedBy} />
            <Detail label="Date" value={dateLabel} />
            {agreement.phone ? <Detail label="Customer tel" value={agreement.phone} /> : null}
            {agreement.email ? <Detail label="Customer email" value={agreement.email} /> : null}
          </dl>
        </div>
        <div className="quote-price-box mt-6 overflow-hidden rounded-2xl border border-line">
          <div className="flex items-center justify-between bg-[#17171a] px-4 py-3 text-white">
            <p className="text-sm font-extrabold tracking-wide">YOUR PRICE</p>
            <p className="text-sm font-bold">Ref {quote.reference}</p>
          </div>
          {money.vatPence != null ? (
            <>
              <PriceRow label="Subtotal (ex VAT)" amount={formatPence(money.subtotalPence)} />
              <PriceRow label={`VAT at ${agreement.vatRatePercent}%`} amount={formatPence(money.vatPence)} />
            </>
          ) : null}
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: accent }}>
            <p className="font-extrabold">{money.vatPence != null ? "Total (inc VAT)" : "Total"}</p>
            <p className="font-display text-3xl leading-none">{formatPence(money.totalPence)}</p>
          </div>
          <PriceRow label="Deposit" amount={money.depositPence == null ? "None" : formatPence(money.depositPence)} />
        </div>
        <p className="mt-3 text-sm text-stone">{paymentNote(money.depositPence)}</p>
        {agreement.unpricedCount > 0 ? (
          <p className="mt-2 text-sm text-stone">
            This total covers priced items only. {agreement.unpricedCount}{" "}
            {agreement.unpricedCount === 1 ? "item has" : "items have"} no price yet.
          </p>
        ) : null}
      </section>

      <section id="quote-contract" className="quote-sheet px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-4xl leading-none">Contract for Works</h2>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="h-10 w-auto max-w-32 object-contain" />
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <dl className="grid gap-3">
            <Detail label="Customer" value={agreement.customerName} />
            <Detail label="Address" value={addressLines(agreement.address).join("\n")} />
          </dl>
          <dl className="grid gap-3">
            <Detail label="Reference" value={quote.reference} />
            <Detail label="Prepared by" value={preparedBy} />
            <Detail label="Date" value={dateLabel} />
          </dl>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line p-4">
            <p className="quote-label">Contractor</p>
            <p className="mt-2 font-bold">{businessName}</p>
            {addressLines(businessAddress).map((line) => (
              <p key={line}>{line}</p>
            ))}
            {businessPhone ? <p className="mt-2">{businessPhone}</p> : null}
            {businessEmail ? <p>{businessEmail}</p> : null}
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="quote-label">Customer</p>
            <p className="mt-2 font-bold">{agreement.customerName}</p>
            {addressLines(agreement.address).map((line) => (
              <p key={line}>{line}</p>
            ))}
            {agreement.phone ? <p className="mt-2">{agreement.phone}</p> : null}
            {agreement.email ? <p>{agreement.email}</p> : null}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-line p-4">
          <p className="quote-label">Quotation referenced</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Detail label="Job / quote ref" value={quote.reference} />
            <Detail label="Date" value={dateLabel} />
            <Detail label={money.vatPence != null ? "Total (inc VAT)" : "Total"} value={formatPence(money.totalPence)} />
          </div>
          <p className="mt-3 text-sm text-stone">{paymentNote(money.depositPence)}</p>
        </div>
        <h3 className="mt-6 font-display text-2xl">Description of works</h3>
        <p className="mt-2 whitespace-pre-wrap">{agreement.description}</p>
        {!agreement.showLinePrices ? (
          <p className="mt-2 text-sm text-stone">The prices are shown as one total above.</p>
        ) : null}
        <ol className="mt-3 grid gap-3">
          {agreement.materials.length === 0 ? (
            <li className="text-stone">No separate items are listed.</li>
          ) : (
            agreement.materials.map((line, index) => (
              <li key={`${line.name}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 border-b border-line pb-3">
                <div>
                  <p className="font-bold">
                    {index + 1}. {line.name}
                  </p>
                  <p className="text-sm text-stone">
                    {line.quantity} {line.unit}
                  </p>
                </div>
                {agreement.showLinePrices ? (
                  <p className="font-bold">
                    {line.lineTotalPence == null ? "To confirm" : formatPence(line.lineTotalPence)}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ol>
        {signed ? (
          <div className="mt-6 border-t border-line pt-4">
            <p className="font-bold">
              Signed by {signed.signerName} on {formatLondonDateTime(signed.signedAt)}.
            </p>
            {safeSignature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeSignature} alt={`Signature of ${signed.signerName}`} className="mt-3 max-h-40" />
            ) : null}
            <p className="mt-3 text-stone">This is the agreed copy. Later changes to the job do not alter what was signed.</p>
          </div>
        ) : (
          <p className="mt-6 text-stone">Sign below if you agree to this quotation.</p>
        )}
      </section>
    </article>
  );
}

function PhotoStrip({ photos }: { photos: QuoteChrome["photos"] }) {
  const heading = stripTitle(photos.map((photo) => photo.caption));
  return (
    <div className="px-5 pb-5">
      <h2 className="quote-label">{heading}</h2>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {photos.map((photo) => {
          const caption = photo.caption.trim();
          return (
            <li key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
              {caption && caption !== heading ? (
                <p className="mt-1 line-clamp-2 text-xs font-bold text-stone">{caption}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="quote-label">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function PriceRow({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <p>{label}</p>
      <p className="font-bold">{amount}</p>
    </div>
  );
}

function paymentNote(depositPence: number | null): string {
  if (depositPence == null) return "No deposit required. Full payment due on completion.";
  return `A deposit of ${formatPence(depositPence)} is due before the work starts. The rest is due when the work is finished.`;
}
