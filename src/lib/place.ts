const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;

/** The outward-looking town or city in a UK address, when a postcode is present. */
export function townFromAddress(address: string): string | null {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    if (!POSTCODE.test(parts[index])) continue;
    const withoutPostcode = parts[index].replace(POSTCODE, "").trim();
    const previous = index > 0 ? parts[index - 1] : "";
    if (withoutPostcode && previous && !/^\d/.test(previous)) return previous;
    if (withoutPostcode) return withoutPostcode;
    if (previous && !/^\d/.test(previous)) return previous;
    return null;
  }
  return null;
}

export function postcodeFromAddress(address: string): string {
  const match = address.match(POSTCODE);
  if (!match) return "";
  return match[1].toUpperCase().replace(/\s+/, " ");
}

export function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
