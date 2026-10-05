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

/**
 * Unitary councils whose postcodes.io admin_county is null.
 * The value is the ceremonial county, never the region name.
 */
const CEREMONIAL_BY_DISTRICT: Record<string, string> = {
  bristol: "Bristol",
  birmingham: "West Midlands",
  coventry: "West Midlands",
  dudley: "West Midlands",
  sandwell: "West Midlands",
  solihull: "West Midlands",
  walsall: "West Midlands",
  wolverhampton: "West Midlands",
};

export function cleanPlaceName(value: string): string {
  let name = value.trim();
  if (!name) return "";
  name = name.replace(/,?\s*unparished area$/i, "").trim();
  name = name.replace(/,?\s*city of$/i, "").trim();
  name = name.replace(/^city of\s+/i, "").trim();
  name = name.replace(/^london borough of\s+/i, "").trim();
  name = name.replace(/^royal borough of\s+/i, "").trim();
  name = name.replace(/\s+district$/i, "").trim();
  name = name.replace(/\s+borough$/i, "").trim();
  return name.replace(/,\s*$/, "").trim();
}

/** Parish names the post town when it names a place. A bare "unparished area" does not. */
export function townFromPostcodesIo(row: { parish?: unknown; admin_ward?: unknown; admin_district?: unknown }): string {
  const parish = text(row.parish);
  const parishLower = parish.toLowerCase();
  if (parish && parishLower !== "unparished area" && parishLower !== "unparished") {
    const named = cleanPlaceName(parish);
    if (named && named.toLowerCase() !== "unparished area") return named;
  }
  const district = cleanPlaceName(text(row.admin_district));
  if (district) return district;
  return cleanPlaceName(text(row.admin_ward));
}

/** admin_county when set. Otherwise a ceremonial county, then the district. Never the region. */
export function countyFromPostcodesIo(row: { admin_county?: unknown; admin_district?: unknown }): string {
  const given = cleanPlaceName(text(row.admin_county));
  if (given) return given;
  const district = cleanPlaceName(text(row.admin_district));
  return CEREMONIAL_BY_DISTRICT[district.toLowerCase()] ?? district;
}

export function readPostcodesIo(body: unknown): AddressLookup | null {
  if (!body || typeof body !== "object") return null;
  const result = (body as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  const row = result as Record<string, unknown>;
  if (typeof row.postcode !== "string") return null;
  return {
    postcode: row.postcode,
    addressLine1: "",
    addressLine2: "",
    town: townFromPostcodesIo(row),
    county: countyFromPostcodesIo(row),
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
