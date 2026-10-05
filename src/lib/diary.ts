import type { JobStatus } from "./constants";
import { addDays, isIsoDate, monthMatrix, weekDates } from "./dates";

export const MAX_SPAN_DAYS = 31;

export const BOOKING_KINDS = [
  { id: "job", label: "Job", hint: "The work on site" },
  { id: "quote", label: "Quote visit", hint: "Survey or a price visit" },
  { id: "remedial", label: "Remedial", hint: "Snagging or a return visit" },
  { id: "other", label: "Other", hint: "Anything else on the diary" },
] as const;

export type BookingKind = (typeof BOOKING_KINDS)[number]["id"];

export type DiaryView = "week" | "month" | "list";

export type DiaryBooking = {
  id: string;
  customerName: string;
  postcode: string;
  summary: string;
  status: JobStatus;
  assignedName: string;
  bookingKind: BookingKind;
  spanDays: number;
  startDate: string;
  onDiary: boolean;
};

export type DiaryCard = DiaryBooking & {
  date: string;
  dayNumber: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function diaryView(value: string | undefined): DiaryView {
  if (value === "month" || value === "list" || value === "week") return value;
  return "week";
}

export function normaliseBookingKind(value: string): BookingKind {
  const found = BOOKING_KINDS.find((item) => item.id === value);
  return found ? found.id : "job";
}

export function bookingKindLabel(value: string): string {
  return BOOKING_KINDS.find((item) => item.id === value)?.label ?? "Job";
}

export function parseSpanDays(raw: string): { ok: true; days: number } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: true, days: 1 };
  if (!/^\d{1,2}$/.test(text)) return { ok: false, error: "Enter the days on site as a whole number." };
  const days = Number(text);
  if (days < 1 || days > MAX_SPAN_DAYS) {
    return { ok: false, error: `Enter the days on site, from 1 to ${MAX_SPAN_DAYS}.` };
  }
  return { ok: true, days };
}

export function shortJobSummary(description: string, kind: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (!text) return bookingKindLabel(kind);
  if (text.length <= 72) return text;
  return `${text.slice(0, 69).trimEnd()}…`;
}

export function dayNumberOn(start: string, spanDays: number, date: string): number | null {
  if (!isIsoDate(start) || !isIsoDate(date) || date < start) return null;
  const span = Math.min(Math.max(Math.trunc(spanDays) || 1, 1), MAX_SPAN_DAYS);
  let cursor = start;
  for (let day = 1; day <= span; day += 1) {
    if (cursor === date) return day;
    if (day === span) break;
    cursor = addDays(cursor, 1);
  }
  return null;
}

export function dayProgressLabel(dayNumber: number, spanDays: number): string | null {
  if (spanDays <= 1) return null;
  return `Day ${dayNumber}/${spanDays}`;
}

export function cardsForDate(bookings: DiaryBooking[], date: string): DiaryCard[] {
  const cards: DiaryCard[] = [];
  for (const booking of bookings) {
    if (!booking.onDiary) continue;
    const dayNumber = dayNumberOn(booking.startDate, booking.spanDays, date);
    if (dayNumber == null) continue;
    cards.push({ ...booking, date, dayNumber });
  }
  return cards.sort((a, b) => a.customerName.localeCompare(b.customerName, "en-GB"));
}

export function isToBook(booking: Pick<DiaryBooking, "onDiary" | "status">): boolean {
  return !booking.onDiary && (booking.status === "BOOKED" || booking.status === "IN_PROGRESS");
}

export function toBookJobs(bookings: DiaryBooking[]): DiaryBooking[] {
  return bookings
    .filter((booking) => isToBook(booking))
    .sort((a, b) => a.customerName.localeCompare(b.customerName, "en-GB"));
}

export function upcomingDays(
  bookings: DiaryBooking[],
  today: string,
  limitDays = 21,
): Array<{ date: string; cards: DiaryCard[] }> {
  if (!isIsoDate(today)) return [];
  const rows: Array<{ date: string; cards: DiaryCard[] }> = [];
  for (let offset = 0; offset < limitDays; offset += 1) {
    const date = addDays(today, offset);
    const cards = cardsForDate(bookings, date);
    if (cards.length > 0) rows.push({ date, cards });
  }
  return rows;
}

export function addMonths(iso: string, months: number): string {
  if (!isIsoDate(iso)) throw new Error("Invalid date");
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = Math.min(day, last);
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), clamped)).toISOString().slice(0, 10);
}

export function shiftDiaryAnchor(view: DiaryView, iso: string, direction: -1 | 1): string {
  if (view === "month") return addMonths(iso, direction);
  return addDays(iso, 7 * direction);
}

export function formatDiaryDay(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export function formatDiaryRange(start: string, end: string): string {
  if (!isIsoDate(start) || !isIsoDate(end)) return `${start} – ${end}`;
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startMonthName = MONTHS[startMonth - 1];
  const endMonthName = MONTHS[endMonth - 1];
  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay} ${startMonthName} – ${endDay} ${endMonthName} ${endYear}`;
  }
  if (startYear === endYear) return `${startDay} ${startMonthName} – ${endDay} ${endMonthName} ${endYear}`;
  return `${startDay} ${startMonthName} ${startYear} – ${endDay} ${endMonthName} ${endYear}`;
}

export function diaryHref(input: { view?: string; date: string; book?: string | null }): string {
  const params = new URLSearchParams();
  params.set("view", diaryView(input.view));
  params.set("date", input.date);
  if (input.book) params.set("book", input.book);
  return `/diary?${params.toString()}`;
}

export function diaryFetchWindow(anchor: string, today: string): { from: string; to: string } {
  const week = weekDates(anchor);
  const matrix = monthMatrix(anchor);
  const monthStart = matrix[0][0];
  const monthEnd = matrix[matrix.length - 1][6];
  const upcomingEnd = isIsoDate(today) ? addDays(today, 20) : week[6];
  const start = [week[0], monthStart, isIsoDate(today) ? today : week[0]].sort()[0];
  const end = [week[6], monthEnd, upcomingEnd].sort().at(-1) ?? week[6];
  return { from: addDays(start, -(MAX_SPAN_DAYS - 1)), to: end };
}
