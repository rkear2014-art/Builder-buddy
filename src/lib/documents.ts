export function formatDocumentNumber(prefix: "Q" | "INV", number: number): string {
  const safe = Number.isInteger(number) && number > 0 ? number : 0;
  return `${prefix}-${String(safe).padStart(4, "0")}`;
}

export function quoteIsExpired(validUntil: string, today: string, signed: boolean): boolean {
  if (signed) return false;
  return validUntil < today;
}

export function viewedLabel(firstViewedAt: string | null, lastViewedAt: string | null): string | null {
  if (!firstViewedAt) return null;
  return lastViewedAt ?? firstViewedAt;
}
