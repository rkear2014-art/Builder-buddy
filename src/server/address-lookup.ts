import { normaliseUkPostcode, readPostcodesIo, readProviderLookup, type AddressLookup } from "@/lib/address";

export type AddressLookupResult = { ok: true; result: AddressLookup } | { ok: false; error: string };

/**
 * ADDRESS_LOOKUP_URL plus ADDRESS_LOOKUP_API_KEY turn on a full premises lookup.
 * The provider should return JSON: { postcode, town, county, premises: [{ line1, line2 }] }.
 * Without those, postcodes.io checks the postcode and fills the town and county.
 */
export async function lookupSiteAddress(rawPostcode: string): Promise<AddressLookupResult> {
  const postcode = normaliseUkPostcode(rawPostcode);
  if (!postcode) return { ok: false, error: "Enter a UK postcode, such as BS7 8NS." };
  const endpoint = process.env.ADDRESS_LOOKUP_URL?.trim();
  const apiKey = process.env.ADDRESS_LOOKUP_API_KEY?.trim();
  if (endpoint && apiKey) return lookupProvider(endpoint, apiKey, postcode);
  return lookupPostcodesIo(postcode);
}

async function lookupPostcodesIo(postcode: string): Promise<AddressLookupResult> {
  let response: Response;
  try {
    response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "The postcode lookup did not answer. Type the town and county." };
  }
  if (response.status === 404) return { ok: false, error: "That postcode was not found. Check it, or type the town." };
  if (!response.ok) return { ok: false, error: "The postcode lookup did not answer. Type the town and county." };
  const parsed = readPostcodesIo(await response.json());
  if (!parsed) return { ok: false, error: "The postcode lookup did not answer. Type the town and county." };
  return { ok: true, result: parsed };
}

async function lookupProvider(endpoint: string, apiKey: string, postcode: string): Promise<AddressLookupResult> {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, error: "The address lookup did not answer. Type the street, town, and county." };
  }
  url.searchParams.set("postcode", postcode);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "The address lookup did not answer. Type the street, town, and county." };
  }
  if (!response.ok) return { ok: false, error: "The address lookup did not answer. Type the street, town, and county." };
  const parsed = readProviderLookup(await response.json());
  if (!parsed) return { ok: false, error: "The address lookup did not answer. Type the street, town, and county." };
  return { ok: true, result: parsed };
}
