import { z } from "zod";
import { isWellFormedShareToken } from "./access";
import { accentInk, resolveAccent } from "./accent";
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
  hasMark: boolean;
  markUpdatedAt: string | null;
  vatRegistered: boolean;
  vatRatePercent: number;
  quoteLetter: string;
  quoteChips: string;
  accent: string;
  accentColour: string;
  accentInk: string;
};

export type BrandingRow = BusinessProfile & {
  accent: string;
  logoMime: string | null;
  logoUpdatedAt: Date | string | null;
  markMime: string | null;
  markUpdatedAt: Date | string | null;
  vatRegistered: boolean;
  vatRatePercent: number;
  quoteLetter: string;
  quoteChips: string;
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
    row.logoUpdatedAt instanceof Date ? row.logoUpdatedAt.toISOString() : row.logoUpdatedAt;
  const markUpdatedAt =
    row.markUpdatedAt instanceof Date ? row.markUpdatedAt.toISOString() : row.markUpdatedAt;
  const accentColour = resolveAccent(row.accent);
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    tagline: row.tagline,
    vatRegistered: row.vatRegistered,
    vatRatePercent: row.vatRatePercent,
    quoteLetter: row.quoteLetter,
    quoteChips: row.quoteChips,
    hasLogo: Boolean(row.logoMime),
    logoUpdatedAt: row.logoMime ? logoUpdatedAt : null,
    hasMark: Boolean(row.markMime),
    markUpdatedAt: row.markMime ? markUpdatedAt : null,
    accent: row.accent,
    accentColour,
    accentInk: accentInk(accentColour),
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

export function deskMarkSrc(markUpdatedAt: string | null): string {
  const version = markUpdatedAt ? `?v=${encodeURIComponent(markUpdatedAt)}` : "";
  return `/branding/mark${version}`;
}

/** The nav and dashboard use the compact mark when this business has one. */
export function deskSmallLogoSrc(
  branding: Pick<BusinessBranding, "hasMark" | "markUpdatedAt" | "hasLogo" | "logoUpdatedAt">,
): string | null {
  if (branding.hasMark) return deskMarkSrc(branding.markUpdatedAt);
  if (branding.hasLogo) return deskLogoSrc(branding.logoUpdatedAt);
  return null;
}

export function customerHeroSrc(token: string, photoId: string, updatedAt: string | null): string | null {
  if (!isWellFormedShareToken(token) || !/^[a-z0-9-]{8,80}$/i.test(photoId)) return null;
  const version = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : "";
  return `/sign/${token}/hero/${encodeURIComponent(photoId)}${version}`;
}

export function deskCatalogueSrc(catalogueKey: string, updatedAt: string | null): string | null {
  if (!/^[a-z0-9-]{8,80}$/i.test(catalogueKey)) return null;
  const version = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : "";
  return `/branding/catalogue/${encodeURIComponent(catalogueKey)}${version}`;
}

export function deskHeroSrc(photoId: string, updatedAt: string | null): string {
  const version = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : "";
  return `/branding/hero/${encodeURIComponent(photoId)}${version}`;
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
