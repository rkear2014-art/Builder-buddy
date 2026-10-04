export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDays(iso: string, days: number): string {
  if (!isIsoDate(iso)) throw new Error("Invalid date");
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday-first week containing the given calendar date. */
export function weekDates(iso: string): string[] {
  if (!isIsoDate(iso)) throw new Error("Invalid date");
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = addDays(iso, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function monthMatrix(iso: string): string[][] {
  if (!isIsoDate(iso)) throw new Error("Invalid date");
  const monthPrefix = iso.slice(0, 7);
  let cursor = weekDates(`${monthPrefix}-01`)[0];
  const weeks: string[][] = [];
  for (let index = 0; index < 6; index += 1) {
    const week = weekDates(cursor);
    if (!week.some((day) => day.startsWith(monthPrefix))) break;
    weeks.push(week);
    cursor = addDays(week[6], 1);
  }
  return weeks;
}

export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function londonHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/London",
  }).format(now);
  return Number(hour);
}

export function formatWeekday(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatIsoDate(iso: string, style: "short" | "long" = "short"): string {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonthTitle(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [year, month] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatLondonDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(date);
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function isoToUtcDate(iso: string): Date {
  if (!isIsoDate(iso)) throw new Error("Invalid date");
  return new Date(`${iso}T00:00:00.000Z`);
}

export function utcDateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
