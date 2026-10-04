import { slotLabel, visibleTradeLabel, type JobStatus } from "./constants";
import { addDays, formatIsoDate, greetingForHour, weekDates } from "./dates";
import { initials, postcodeFromAddress, townFromAddress } from "./place";

export type GlanceJob = {
  id: string;
  customerName: string;
  address: string;
  trade: string;
  status: JobStatus;
  scheduledDate: string;
  timeSlot: string;
  createdAt: string;
  updatedAt: string;
  assigneeName: string;
  signed: boolean;
  totalPence: number;
};

export type GlanceListRow = {
  id: string;
  href: string;
  primary: string;
  secondary: string;
  meta: string;
  metaTone: "late" | "today" | "neutral";
};

export type GlanceCard = {
  id: string;
  title: string;
  meta: string;
  value: string;
  sub: string;
  href: string;
  empty: string;
  rows: GlanceListRow[];
};

export type GlanceWeekRow = {
  id: string;
  href: string;
  when: string;
  customerName: string;
  detail: string;
  status: JobStatus;
};

export type GlanceRecentRow = {
  id: string;
  href: string;
  initials: string;
  customerName: string;
  detail: string;
  status: JobStatus;
  when: string;
};

export type GlanceModel = {
  eyebrow: string;
  greeting: string;
  summary: string;
  chaseCount: number;
  cards: GlanceCard[];
  week: {
    eyebrow: string;
    range: string;
    tiles: Array<{ label: string; value: number }>;
    rows: GlanceWeekRow[];
  };
  month: {
    title: string;
    jobCount: number;
    completeCount: number;
    totalPence: number;
  };
  recent: GlanceRecentRow[];
};

export type GlancePage = GlanceModel & {
  businessName: string;
  chips: string[];
  logoSrc: string | null;
  heroSrc: string | null;
  heroId: string | null;
  heroCaption: string | null;
  accentColour: string;
  accentInk: string;
};

const SHORT_SLOT: Record<string, string> = {
  early: "Early",
  morning: "Morning",
  afternoon: "Afternoon",
  late: "Late",
  "all-day": "All day",
};

function dayDiff(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00.000Z`);
  const to = Date.parse(`${toIso}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

function metaDate(iso: string): string {
  return formatIsoDate(iso)
    .replace(/,/g, "")
    .toUpperCase();
}

function dueMeta(scheduled: string, today: string): { text: string; tone: "late" | "today" | "neutral" } {
  if (scheduled === today) return { text: "Today", tone: "today" };
  const late = dayDiff(scheduled, today);
  if (late > 0) return { text: late === 1 ? "1d late" : `${late}d late`, tone: "late" };
  if (late === -1) return { text: "Tomorrow", tone: "neutral" };
  return { text: `in ${Math.abs(late)} days`, tone: "neutral" };
}

export function isChaseJob(job: Pick<GlanceJob, "status" | "scheduledDate" | "signed">, today: string): boolean {
  if (job.signed) return false;
  if ((job.status === "BOOKED" || job.status === "IN_PROGRESS") && job.scheduledDate <= today) return true;
  return job.status === "ENQUIRY" && job.scheduledDate < today;
}

export function isAwaitingSignOff(job: Pick<GlanceJob, "status" | "scheduledDate" | "signed">, today: string): boolean {
  if (job.signed) return false;
  return (job.status === "BOOKED" || job.status === "IN_PROGRESS") && job.scheduledDate > today;
}

function rowFor(job: GlanceJob, today: string, primary?: string): GlanceListRow {
  const due = dueMeta(job.scheduledDate, today);
  const postcode = postcodeFromAddress(job.address);
  return {
    id: job.id,
    href: `/jobs/${job.id}`,
    primary: primary ?? job.customerName,
    secondary: [postcode, visibleTradeLabel(job.trade)].filter(Boolean).join(" · "),
    meta: due.text,
    metaTone: due.tone,
  };
}

function lastDayOfMonth(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

export function glanceSummary(input: { bookingsToday: number; chaseCount: number; toBookCount: number }): string {
  const bookings =
    input.bookingsToday === 1 ? "1 booking today" : `${input.bookingsToday} bookings today`;
  const parts = [bookings];
  if (input.chaseCount === 1) parts.push("1 to chase");
  else if (input.chaseCount > 1) parts.push(`${input.chaseCount} to chase`);
  if (input.toBookCount === 1) parts.push("1 job to book in");
  else if (input.toBookCount > 1) parts.push(`${input.toBookCount} jobs to book in`);
  return parts.join(" · ");
}

export function glanceChips(tagline: string, address: string): string[] {
  const chips: string[] = [];
  const line = tagline.trim();
  const town = townFromAddress(address);
  if (line) chips.push(line);
  if (town) chips.push(town);
  return chips;
}

export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((now.getTime() - then) / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) {
    const count = Math.abs(minutes);
    return count === 1 ? "1 min ago" : `${count} mins ago`;
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    const count = Math.abs(hours);
    return count === 1 ? "1 hour ago" : `${count} hours ago`;
  }
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 14) {
    const count = Math.abs(days);
    return count === 1 ? "1 day ago" : `${count} days ago`;
  }
  return formatIsoDate(iso.slice(0, 10));
}

function chaseSub(chase: GlanceJob[], today: string): string {
  const overdue = chase.filter((job) => job.scheduledDate < today).length;
  const dueToday = chase.filter((job) => job.scheduledDate === today).length;
  const parts: string[] = [];
  if (overdue === 1) parts.push("1 overdue");
  else if (overdue > 1) parts.push(`${overdue} overdue`);
  if (dueToday === 1) parts.push("1 due today");
  else if (dueToday > 1) parts.push(`${dueToday} due today`);
  if (parts.length > 0) return parts.join(" · ");
  return chase.length === 1 ? "1 follow-up" : `${chase.length} follow-ups`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function buildGlance(input: {
  today: string;
  hour: number;
  now: Date;
  businessName: string;
  jobs: GlanceJob[];
  enquiryCount: number;
}): GlanceModel {
  const { today, jobs } = input;
  const tomorrow = addDays(today, 1);
  const week = weekDates(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = lastDayOfMonth(today);
  const freshAfter = input.now.getTime() - 24 * 60 * 60 * 1000;

  const todayJobs = jobs.filter((job) => job.scheduledDate === today);
  const bookingsToday = todayJobs.filter((job) => job.status !== "ENQUIRY");
  const tomorrowJobs = jobs.filter((job) => job.scheduledDate === tomorrow);
  const chase = jobs
    .filter((job) => isChaseJob(job, today))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.customerName.localeCompare(b.customerName));
  const awaiting = jobs
    .filter((job) => isAwaitingSignOff(job, today))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const fresh = jobs
    .filter((job) => new Date(job.createdAt).getTime() >= freshAfter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const weekJobs = jobs
    .filter((job) => job.scheduledDate >= week[0] && job.scheduledDate <= week[6])
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.customerName.localeCompare(b.customerName));
  const monthJobs = jobs.filter((job) => job.scheduledDate >= monthStart && job.scheduledDate <= monthEnd);

  const cards: GlanceCard[] = [
    {
      id: "today",
      title: "Today",
      meta: metaDate(today),
      value: String(todayJobs.length),
      sub: todayJobs.length === 1 ? (visibleTradeLabel(todayJobs[0].trade) ?? "booking") : "bookings",
      href: "/diary",
      empty: "Nothing in the diary today.",
      rows: todayJobs.slice(0, 2).map((job) => ({
        ...rowFor(job, today),
        secondary: [SHORT_SLOT[job.timeSlot] ?? slotLabel(job.timeSlot), postcodeFromAddress(job.address)]
          .filter(Boolean)
          .join(" · "),
      })),
    },
    {
      id: "tomorrow",
      title: "Tomorrow",
      meta: metaDate(tomorrow),
      value: String(tomorrowJobs.length),
      sub: tomorrowJobs.length === 1 ? (visibleTradeLabel(tomorrowJobs[0].trade) ?? "booking") : "bookings",
      href: "/diary",
      empty: "Nothing booked tomorrow.",
      rows: tomorrowJobs.slice(0, 2).map((job) => ({
        ...rowFor(job, today),
        secondary: [postcodeFromAddress(job.address), SHORT_SLOT[job.timeSlot] ?? slotLabel(job.timeSlot)]
          .filter(Boolean)
          .join(" · "),
      })),
    },
    {
      id: "sign-off",
      title: "Awaiting sign-off",
      meta: "AGREEMENTS",
      value: String(awaiting.length),
      sub: awaiting.length === 1 ? "signature still to collect" : "signatures still to collect",
      href: "/jobs",
      empty: "No upcoming agreements are waiting for a signature.",
      rows: awaiting.slice(0, 2).map((job) => rowFor(job, today)),
    },
    {
      id: "chase",
      title: "To chase",
      meta: "FOLLOW-UPS",
      value: String(chase.length),
      sub: chaseSub(chase, today),
      href: "/jobs",
      empty: "Nothing to chase.",
      rows: chase.slice(0, 2).map((job) => ({
        ...rowFor(job, today),
        secondary: [job.status === "ENQUIRY" ? "Enquiry" : "Sign-off", postcodeFromAddress(job.address)]
          .filter(Boolean)
          .join(" · "),
      })),
    },
    {
      id: "new",
      title: "New jobs",
      meta: "LAST 24 HOURS",
      value: String(fresh.length),
      sub: fresh.length === 1 ? "added since yesterday" : "added since yesterday",
      href: "/jobs",
      empty: "No new jobs in the last 24 hours.",
      rows: fresh.slice(0, 2).map((job) => rowFor(job, today)),
    },
  ];

  const monthName = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${monthStart}T00:00:00.000Z`));

  return {
    eyebrow: `${input.businessName} · ${formatLongDay(today)}`.toUpperCase(),
    greeting: greetingForHour(input.hour),
    summary: glanceSummary({
      bookingsToday: bookingsToday.length,
      chaseCount: chase.length,
      toBookCount: input.enquiryCount,
    }),
    chaseCount: chase.length,
    cards,
    week: {
      eyebrow: formatLongDay(today).toUpperCase(),
      range: `${formatDayMonth(week[0])} – ${formatDayMonth(week[6])}`,
      tiles: [
        { label: "Booked", value: weekJobs.filter((job) => job.status === "BOOKED").length },
        { label: "In progress", value: weekJobs.filter((job) => job.status === "IN_PROGRESS").length },
        { label: "Enquiries", value: weekJobs.filter((job) => job.status === "ENQUIRY").length },
        { label: "Complete", value: weekJobs.filter((job) => job.status === "COMPLETE").length },
      ],
      rows: weekJobs.slice(0, 8).map((job) => ({
        id: job.id,
        href: `/jobs/${job.id}`,
        when: job.scheduledDate === today ? (SHORT_SLOT[job.timeSlot] ?? "Today") : formatWeekWhen(job.scheduledDate),
        customerName: job.customerName,
        detail: [postcodeFromAddress(job.address), firstName(job.assigneeName)].filter(Boolean).join(" · "),
        status: job.status,
      })),
    },
    month: {
      title: monthName,
      jobCount: monthJobs.length,
      completeCount: monthJobs.filter((job) => job.status === "COMPLETE").length,
      totalPence: monthJobs.reduce((sum, job) => sum + job.totalPence, 0),
    },
    recent: [...jobs]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((job) => ({
        id: job.id,
        href: `/jobs/${job.id}`,
        initials: initials(job.customerName),
        customerName: job.customerName,
        detail: [postcodeFromAddress(job.address), visibleTradeLabel(job.trade)].filter(Boolean).join(" · "),
        status: job.status,
        when: relativeTime(job.updatedAt, input.now),
      })),
  };
}

function formatLongDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDayMonth(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatWeekWhen(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return formatted.replace(/,/g, "");
}
