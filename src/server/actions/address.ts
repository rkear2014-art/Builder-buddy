"use server";

import { lookupSiteAddress, type AddressLookupResult } from "@/server/address-lookup";
import { requireUser } from "@/server/dal";

export async function findSiteAddress(postcode: string): Promise<AddressLookupResult> {
  await requireUser();
  return lookupSiteAddress(postcode);
}
