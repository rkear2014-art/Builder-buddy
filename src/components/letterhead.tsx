import { websiteHref, websiteLabel, type BusinessBranding } from "@/lib/branding";

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function Letterhead({
  branding,
  logoSrc,
}: {
  branding: BusinessBranding;
  logoSrc: string | null;
}) {
  const site = websiteHref(branding.website);
  const phone = branding.phone.trim();
  const email = branding.email.trim();
  const address = branding.address.trim();
  const tagline = branding.tagline.trim();

  return (
    <header className="letterhead border-b border-line pb-4">
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoSrc} alt={`${branding.name} logo`} className="brand-logo brand-logo-letter" />
      ) : null}
      <p className={`font-display text-3xl leading-tight ${logoSrc ? "mt-3" : ""}`}>{branding.name}</p>
      {tagline ? <p className="mt-1 font-bold text-stone">{tagline}</p> : null}
      {address ? <p className="mt-2 whitespace-pre-wrap">{address}</p> : null}
      {phone || email || site ? (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {phone ? <a href={telHref(phone)}>{phone}</a> : null}
          {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          {site ? (
            <a href={site} rel="noreferrer">
              {websiteLabel(site)}
            </a>
          ) : null}
        </p>
      ) : null}
    </header>
  );
}
