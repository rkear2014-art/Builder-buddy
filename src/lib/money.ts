export type PoundsParse =
  | { ok: true; pence: number | null }
  | { ok: false; error: string };

const MAX_PENCE = 1_000_000_000;

export function parsePoundsToPence(input: string): PoundsParse {
  const trimmed = input.trim().replaceAll("£", "").replaceAll(",", "").replaceAll(" ", "");
  if (!trimmed) return { ok: true, pence: null };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return {
      ok: false,
      error: "Enter a price in pounds, such as 12.50, or leave it blank.",
    };
  }
  const [whole, frac = ""] = trimmed.split(".");
  const pence = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(pence) || pence > MAX_PENCE) {
    return { ok: false, error: "That price is too large." };
  }
  return { ok: true, pence };
}

export function formatPence(pence: number): string {
  const negative = pence < 0;
  const abs = Math.abs(Math.trunc(pence));
  const pounds = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = pounds.toLocaleString("en-GB");
  return `${negative ? "-" : ""}£${grouped}.${String(remainder).padStart(2, "0")}`;
}
