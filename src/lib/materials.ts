const QUANTITY_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_HUNDREDTHS = 10_000_000 * 100;

export type PricedLine = {
  quantity: string;
  unitPricePence: number | null;
  costPricePence?: number | null;
};

export type MaterialsTotal = {
  totalPence: number;
  unpricedCount: number;
  pricedCount: number;
};

export function quantityHundredths(value: string): number {
  const trimmed = value.trim();
  if (!QUANTITY_PATTERN.test(trimmed)) {
    throw new Error("Invalid quantity");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const hundredths = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(hundredths) || hundredths <= 0 || hundredths > MAX_HUNDREDTHS) {
    throw new Error("Invalid quantity");
  }
  return hundredths;
}

export function isValidQuantity(value: string): boolean {
  try {
    quantityHundredths(value);
    return true;
  } catch {
    return false;
  }
}

export function normaliseQuantity(value: string): string {
  const hundredths = quantityHundredths(value);
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

/** Accepts Prisma decimal strings such as "2.50" or "2.500". */
export function quantityFromStored(raw: string): string {
  const trimmed = raw.trim();
  if (isValidQuantity(trimmed)) return normaliseQuantity(trimmed);
  const match = trimmed.match(/^(\d+)\.(\d+)$/);
  if (!match) throw new Error("Invalid quantity");
  const extra = match[2].slice(2);
  if (extra.length > 0 && /[^0]/.test(extra)) {
    return normaliseQuantity(Number(`${match[1]}.${match[2]}`).toFixed(2));
  }
  return normaliseQuantity(`${match[1]}.${match[2].slice(0, 2) || "0"}`);
}

/** Half-up to the nearest penny. Ignores any trade cost on the line. */
export function customerLineTotalPence(line: {
  quantity: string;
  unitPricePence: number | null;
}): number | null {
  if (line.unitPricePence == null) return null;
  const hundredths = quantityHundredths(line.quantity);
  return Math.round((hundredths * line.unitPricePence) / 100);
}

export function materialsTotals(lines: PricedLine[]): MaterialsTotal {
  let totalPence = 0;
  let unpricedCount = 0;
  let pricedCount = 0;
  for (const line of lines) {
    const lineTotal = customerLineTotalPence(line);
    if (lineTotal == null) {
      unpricedCount += 1;
      continue;
    }
    pricedCount += 1;
    totalPence += lineTotal;
  }
  return { totalPence, unpricedCount, pricedCount };
}

export function costTotals(
  lines: Array<{ quantity: string; costPricePence: number | null }>,
): MaterialsTotal {
  return materialsTotals(
    lines.map((line) => ({
      quantity: line.quantity,
      unitPricePence: line.costPricePence,
    })),
  );
}
