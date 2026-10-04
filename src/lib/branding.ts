import { z } from "zod";
import { isWellFormedShareToken } from "./access";
import { tenantWhere } from "./tenancy";

export type BusinessProfile = {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  tagline: string;
};

export type BusinessBranding = BusinessProfile & {
  hasLogo: boolean;
  logoUpdatedAt: string | null;
};

export type BrandingRow = BusinessProfile & {
  logoMime: string | null;
  logoUpdatedAt: Date | string | null;
};

type FormParse<T> = { ok: true; data: T } | { ok: false; error: string };

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

/** http(s) only. A bare hostname is treated as https. Anything else is refused. */
export function websiteHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[\s<>]/.test(trimmed)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.origin}${path}${url.search}`;
}

export function websiteLabel(href: string): string {
  return href.replace(/^https?:\/\//, "");
}

export function parseBusinessProfile(formData: FormData): FormParse<BusinessProfile> {
  const name = textField(formData, "name");
  const phone = textField(formData, "phone");
  const email = textField(formData, "email").toLowerCase();
  const address = textField(formData, "address");
  const website = textField(formData, "website");
  const tagline = textField(formData, "tagline");

  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Enter your business name." };
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (!/^[0-9+().\s-]+$/.test(phone) || digits.length < 10 || digits.length > 15 || phone.length > 40) {
      return { ok: false, error: "Enter a phone number, or leave it blank." };
    }
  }
  if (email && !z.email().safeParse(email).success) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }
  if (email.length > 120) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }
  if (address.length > 240) {
    return { ok: false, error: "Shorten the address to 240 characters, or leave it blank." };
  }
  let storedWebsite = "";
  if (website) {
    const href = websiteHref(website);
    if (!href || href.length > 200) {
      return { ok: false, error: "Enter a website such as example.co.uk, or leave it blank." };
    }
    storedWebsite = href;
  }
  if (tagline.length > 120) {
    return { ok: false, error: "Shorten the tagline to 120 characters, or leave it blank." };
  }

  return {
    ok: true,
    data: { name, phone, email, address, website: storedWebsite, tagline },
  };
}

export function toBranding(row: BrandingRow): BusinessBranding {
  const logoUpdatedAt =
    row.logoUpdatedAt instanceof Date
      ? row.logoUpdatedAt.toISOString()
      : row.logoUpdatedAt;
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    tagline: row.tagline,
    hasLogo: Boolean(row.logoMime),
    logoUpdatedAt: row.logoMime ? logoUpdatedAt : null,
  };
}

export function canEditBusiness(role: "OWNER" | "MEMBER"): boolean {
  return role === "OWNER";
}

/** Loads one business row, and only the signed-in business. */
export function businessLogoQuery(viewerBusinessId: string): { id: string } {
  return { id: tenantWhere(viewerBusinessId).businessId };
}

export function customerLogoSrc(token: string, hasLogo: boolean, logoUpdatedAt: string | null): string | null {
  if (!hasLogo || !isWellFormedShareToken(token)) return null;
  const version = logoUpdatedAt ? `?v=${encodeURIComponent(logoUpdatedAt)}` : "";
  return `/sign/${token}/logo${version}`;
}

export function deskLogoSrc(logoUpdatedAt: string | null): string {
  const version = logoUpdatedAt ? `?v=${encodeURIComponent(logoUpdatedAt)}` : "";
  return `/branding/logo${version}`;
}

export type CustomerLetterhead = {
  branding: BusinessBranding;
  logoSrc: string | null;
};

export function letterheadFromRow(token: string, row: BrandingRow): CustomerLetterhead {
  const branding = toBranding(row);
  return {
    branding,
    logoSrc: customerLogoSrc(token, branding.hasLogo, branding.logoUpdatedAt),
  };
}
