import { websiteHref, websiteLabel } from "./branding";

export const DEFAULT_QUOTE_LETTER = `Thank you for asking us to quote for this work.

Please read the price and the description of the work. Sign at the end if you would like us to go ahead.

If you have a question, please get in touch.`;

export type QuoteMoney = {
  subtotalPence: number;
  vatPence: number | null;
  totalPence: number;
  depositPence: number | null;
};

export type QuotePhoto = {
  id: string;
  caption: string;
  src: string;
};

export type QuoteChrome = {
  reference: string;
  preparedBy: string;
  letter: string;
  chips: string[];
  photos: QuotePhoto[];
};

export function quoteReference(jobId: string): string {
  return jobId.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-8);
}

export function quoteMoney(input: {
  subtotalPence: number;
  vatRegistered: boolean;
  vatRatePercent: number;
  depositPence: number | null;
}): QuoteMoney {
  const subtotalPence = Math.max(0, Math.round(input.subtotalPence));
  const rate = Number.isInteger(input.vatRatePercent) ? Math.min(30, Math.max(0, input.vatRatePercent)) : 20;
  const vatPence = input.vatRegistered ? Math.round((subtotalPence * rate) / 100) : null;
  const deposit = input.depositPence;
  const depositPence = deposit != null && deposit > 0 ? deposit : null;
  return {
    subtotalPence,
    vatPence,
    totalPence: subtotalPence + (vatPence ?? 0),
    depositPence,
  };
}

export function quoteLetterText(stored: string): string {
  const text = stored.replace(/\r\n/g, "\n").trim();
  return text || DEFAULT_QUOTE_LETTER;
}

/** One badge per line, up to six, each at most 40 characters. */
export function parseQuoteChips(value: string): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  for (const line of value.split(/\n+/)) {
    const chip = line.replace(/\s+/g, " ").trim();
    if (!chip || chip.length > 40) continue;
    const key = chip.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push(chip);
    if (chips.length === 6) break;
  }
  return chips;
}

export function coverChips(input: { tagline: string; town: string | null; extra: string[] }): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  for (const value of [input.tagline, input.town ?? "", ...input.extra]) {
    const chip = value.replace(/\s+/g, " ").trim();
    if (!chip) continue;
    const key = chip.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push(chip);
  }
  return chips.slice(0, 8);
}

export function addressLines(address: string): string[] {
  return address
    .split(/,\s*|\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function quoteFooter(input: { name: string; website: string; email: string }): string {
  const href = websiteHref(input.website);
  const site = href ? websiteLabel(href) : "";
  return [input.name.trim(), site, input.email.trim()].filter(Boolean).join(" · ");
}

export function stripTitle(captions: string[]): string {
  const usable = captions.map((caption) => caption.trim()).filter(Boolean);
  if (usable.length > 0 && usable.every((caption) => caption === usable[0])) return usable[0];
  return "Recent work";
}

export type QuoteSettingsInput = {
  vatRegistered: boolean;
  vatRatePercent: number;
  quoteLetter: string;
  quoteChips: string;
};

export function parseQuoteSettings(formData: FormData): { ok: true; data: QuoteSettingsInput } | { ok: false; error: string } {
  const registeredValues = formData.getAll("vatRegistered").map(String);
  const vatRegistered = registeredValues.includes("yes");
  const rateRaw = String(formData.get("vatRatePercent") ?? "").trim();
  const rate = Number(rateRaw);
  if (!Number.isInteger(rate) || rate < 0 || rate > 30) {
    return { ok: false, error: "Enter a VAT rate from 0 to 30." };
  }
  const quoteLetter = String(formData.get("quoteLetter") ?? "").replace(/\r\n/g, "\n").trim();
  if (quoteLetter.length > 2000) {
    return { ok: false, error: "Shorten the letter to 2000 characters." };
  }
  const rawChips = String(formData.get("quoteChips") ?? "").replace(/\r\n/g, "\n");
  for (const line of rawChips.split(/\n+/)) {
    if (line.trim().length > 40) {
      return { ok: false, error: "Keep each badge to 40 characters." };
    }
  }
  return {
    ok: true,
    data: {
      vatRegistered,
      vatRatePercent: rate,
      quoteLetter,
      quoteChips: parseQuoteChips(rawChips).join("\n"),
    },
  };
}
