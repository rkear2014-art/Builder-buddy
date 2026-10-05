export type SiteAddress = {
  postcode: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  county: string;
};

export type AddressLookup = SiteAddress & {
  premises: Array<{ line1: string; line2: string }>;
};

const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

export function normaliseUkPostcode(raw: string): string | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  if (!match || !UK_POSTCODE.test(raw.trim())) return null;
  return `${match[1]} ${match[2]}`;
}

export function combineSiteAddress(parts: SiteAddress): string {
  const street = [parts.addressLine1.trim(), parts.addressLine2.trim()].filter(Boolean).join(", ");
  const place = [parts.town.trim(), parts.county.trim()].filter(Boolean).join(", ");
  const tail = [place, parts.postcode.trim()].filter(Boolean).join(" ");
  return [street, tail].filter(Boolean).join(", ");
}

export function readPostcodesIo(body: unknown): AddressLookup | null {
  if (!body || typeof body !== "object") return null;
  const result = (body as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  const row = result as Record<string, unknown>;
  if (typeof row.postcode !== "string") return null;
  const town = text(row.admin_district);
  const county = text(row.admin_county) || text(row.region);
  return {
    postcode: row.postcode,
    addressLine1: "",
    addressLine2: "",
    town,
    county: county === town ? "" : county,
    premises: [],
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Shape a full premises provider should return. ADDRESS_LOOKUP_URL points at it. */
export function readProviderLookup(body: unknown): AddressLookup | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (typeof row.postcode !== "string") return null;
  const premises = Array.isArray(row.premises)
    ? row.premises
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const line = item as Record<string, unknown>;
          const line1 = text(line.line1);
          if (!line1) return null;
          return { line1, line2: text(line.line2) };
        })
        .filter((item): item is { line1: string; line2: string } => item != null)
        .slice(0, 50)
    : [];
  return {
    postcode: row.postcode,
    addressLine1: premises[0]?.line1 ?? "",
    addressLine2: premises.length === 1 ? premises[0]?.line2 ?? "" : "",
    town: text(row.town),
    county: text(row.county),
    premises,
  };
}
