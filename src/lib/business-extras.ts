import { websiteHref } from "./branding";

export type BusinessExtrasInput = {
  invoiceDueDays: number;
  quoteValidDays: number;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
  reviewUrl: string;
  insurer: string;
  coverAmount: string;
  guarantee: string;
  accreditations: string;
};

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

function parseDays(raw: string, fallback: number, max: number, label: string): { ok: true; days: number } | { ok: false; error: string } {
  if (!raw) return { ok: true, days: fallback };
  if (!/^\d{1,3}$/.test(raw)) return { ok: false, error: `Enter ${label} as a number of days.` };
  const days = Number(raw);
  if (days < 1 || days > max) return { ok: false, error: `Enter ${label} from 1 to ${max} days.` };
  return { ok: true, days };
}

export function parseBusinessExtras(formData: FormData): { ok: true; data: BusinessExtrasInput } | { ok: false; error: string } {
  const due = parseDays(field(formData, "invoiceDueDays"), 14, 90, "the invoice due days");
  if (!due.ok) return due;
  const valid = parseDays(field(formData, "quoteValidDays"), 30, 365, "how long a quote stays valid");
  if (!valid.ok) return valid;

  const bankAccountName = field(formData, "bankAccountName");
  if (bankAccountName.length > 80) return { ok: false, error: "Shorten the account name to 80 characters." };

  const sortRaw = field(formData, "bankSortCode");
  let bankSortCode = "";
  if (sortRaw) {
    const digits = sortRaw.replace(/\D/g, "");
    if (digits.length !== 6) return { ok: false, error: "Enter a sort code as 6 digits, or leave it blank." };
    bankSortCode = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  }

  const accountRaw = field(formData, "bankAccountNumber");
  let bankAccountNumber = "";
  if (accountRaw) {
    const digits = accountRaw.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(digits)) return { ok: false, error: "Enter an account number of 6 to 10 digits, or leave it blank." };
    bankAccountNumber = digits;
  }

  const reviewRaw = field(formData, "reviewUrl");
  let reviewUrl = "";
  if (reviewRaw) {
    const href = websiteHref(reviewRaw);
    if (!href || href.length > 300) return { ok: false, error: "Enter a review link such as a Google review page, or leave it blank." };
    reviewUrl = href;
  }

  const insurer = field(formData, "insurer");
  const coverAmount = field(formData, "coverAmount");
  const guarantee = field(formData, "guarantee");
  if (insurer.length > 80) return { ok: false, error: "Shorten the insurer name to 80 characters." };
  if (coverAmount.length > 40) return { ok: false, error: "Shorten the cover amount to 40 characters." };
  if (guarantee.length > 80) return { ok: false, error: "Shorten the guarantee to 80 characters." };

  const accreditations = field(formData, "accreditations");
  if (accreditations.length > 800) return { ok: false, error: "Shorten the memberships to 800 characters." };
  for (const line of accreditations.split(/\n+/)) {
    if (line.trim().length > 60) return { ok: false, error: "Keep each membership to 60 characters." };
  }

  return {
    ok: true,
    data: {
      invoiceDueDays: due.days,
      quoteValidDays: valid.days,
      bankAccountName,
      bankSortCode,
      bankAccountNumber,
      reviewUrl,
      insurer,
      coverAmount,
      guarantee,
      accreditations,
    },
  };
}
