import { brandedEmailHtml } from "./branded-email";
import { isIsoDate } from "./dates";
import { invoiceStanding, type StoredInvoiceStatus } from "./invoice";
import { formatPence } from "./money";

export const DEFAULT_REMINDER_DAYS = [3, 7, 14] as const;
export type ReminderSchedule = [number, number, number];
export type ReminderStep = 1 | 2 | 3;
export const REMINDER_CHANNELS = ["EMAIL", "WHATSAPP", "TEXT", "MAIL"] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];
export const MANUAL_REMINDER_CHANNELS = ["WHATSAPP", "TEXT", "MAIL"] as const;
export type ManualReminderChannel = (typeof MANUAL_REMINDER_CHANNELS)[number];

export type DueReminderView = {
  invoiceId: string;
  jobId: string;
  customerName: string;
  phone: string;
  email: string;
  reference: string;
  step: ReminderStep;
  daysOverdue: number;
  amountLabel: string;
  dueLabel: string;
  message: string;
  subject: string;
  invoiceHref: string;
};

export type ReminderSettings = {
  remindersOn: boolean;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
};

export function normaliseReminderDays(days: number[]): ReminderSchedule | null {
  if (days.length !== 3) return null;
  if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 90)) return null;
  if (new Set(days).size !== 3) return null;
  const sorted = [...days].sort((left, right) => left - right);
  return [sorted[0], sorted[1], sorted[2]];
}

export function reminderScheduleOf(day1: number | undefined, day2: number | undefined, day3: number | undefined): ReminderSchedule {
  return normaliseReminderDays([day1 ?? 3, day2 ?? 7, day3 ?? 14]) ?? [...DEFAULT_REMINDER_DAYS];
}

export function parseReminderSettings(formData: FormData): { ok: true; data: ReminderSettings } | { ok: false; error: string } {
  const remindersOn = formData.getAll("remindersOn").map(String).includes("yes");
  const raw = [1, 2, 3].map((index) => {
    const value = formData.get(`reminderDay${index}`);
    return typeof value === "string" ? value.trim() : "";
  });
  if (raw.some((value) => !/^\d{1,3}$/.test(value))) {
    return { ok: false, error: "Enter each reminder as a number of days." };
  }
  const schedule = normaliseReminderDays(raw.map(Number));
  if (!schedule) return { ok: false, error: "Enter three different reminders, from 1 to 90 days." };
  return {
    ok: true,
    data: {
      remindersOn,
      reminderDay1: schedule[0],
      reminderDay2: schedule[1],
      reminderDay3: schedule[2],
    },
  };
}

/** Whole days after the due date. The due date itself is 0. */
export function daysPastDue(dueDate: string, today: string): number {
  if (!isIsoDate(dueDate) || !isIsoDate(today) || dueDate >= today) return 0;
  const [year, month, day] = dueDate.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const due = Date.UTC(year, month - 1, day);
  const now = Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.round((now - due) / 86_400_000);
}

export function nextReminderStep(input: {
  status: StoredInvoiceStatus;
  dueDate: string;
  today: string;
  paidPence: number;
  totalDuePence: number;
  remindersOn: boolean;
  remindersPaused: boolean;
  sentSteps: number[];
  schedule: ReminderSchedule;
}): { step: ReminderStep; afterDays: number; daysOverdue: number } | null {
  if (!input.remindersOn || input.remindersPaused) return null;
  const standing = invoiceStanding({
    status: input.status,
    dueDate: input.dueDate,
    today: input.today,
    paidPence: input.paidPence,
    totalDuePence: input.totalDuePence,
  });
  if (standing === "Draft" || standing === "Paid") return null;
  const daysOverdue = daysPastDue(input.dueDate, input.today);
  const sent = new Set(input.sentSteps);
  for (let index = 0; index < input.schedule.length; index += 1) {
    const step = (index + 1) as ReminderStep;
    if (sent.has(step)) continue;
    if (daysOverdue < input.schedule[index]) return null;
    return { step, afterDays: input.schedule[index], daysOverdue };
  }
  return null;
}

export function chaseReminderManually(input: {
  emailConfigured: boolean;
  customerEmail: string;
  businessEmail: string;
}): boolean {
  if (!input.emailConfigured) return true;
  if (!input.customerEmail.trim() || !input.businessEmail.trim()) return true;
  return false;
}

export function cronAuthorised(authorization: string | null, secret: string | undefined): boolean {
  const trimmed = secret?.trim() ?? "";
  if (!trimmed) return false;
  return authorization === `Bearer ${trimmed}`;
}

export function isManualReminderChannel(value: string): value is ManualReminderChannel {
  return (MANUAL_REMINDER_CHANNELS as readonly string[]).includes(value);
}

export function reminderSubject(reference: string, businessName: string): string {
  return `Reminder: invoice ${reference} from ${businessName}`;
}

export function formatReminderDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function reminderHistoryLabel(step: number, sentAt: Date): string {
  const when = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(sentAt);
  return `Reminder ${step} sent ${when}`;
}

export function reminderMessage(input: {
  customerName: string;
  businessName: string;
  reference: string;
  balancePence: number;
  dueDate: string;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
  url: string;
}): string {
  const customer = input.customerName.trim() || "there";
  const business = input.businessName.trim() || "us";
  const bank = [
    input.bankAccountName.trim() ? `Account name: ${input.bankAccountName.trim()}` : "",
    input.bankSortCode.trim() ? `Sort code: ${input.bankSortCode.trim()}` : "",
    input.bankAccountNumber.trim() ? `Account number: ${input.bankAccountNumber.trim()}` : "",
  ].filter(Boolean);
  const payment =
    bank.length > 0
      ? `Please pay by bank transfer:\n${bank.join("\n")}`
      : "The bank details are on the invoice.";
  return [
    `Hello ${customer},`,
    "",
    `I hope you are well. This is a polite reminder that invoice ${input.reference} for ${formatPence(input.balancePence)} was due on ${formatReminderDate(input.dueDate)} and is still unpaid.`,
    "",
    payment,
    "",
    "You can open the invoice here:",
    input.url,
    "",
    "Thank you,",
    business,
  ].join("\n");
}

export function reminderEmail(input: {
  businessName: string;
  accent: string;
  logoSrc: string | null;
  message: string;
  url: string;
  subject: string;
  badges?: string[];
}): { subject: string; html: string } {
  return {
    subject: input.subject,
    html: brandedEmailHtml({
      businessName: input.businessName,
      accent: input.accent,
      logoSrc: input.logoSrc,
      headline: "A reminder about your invoice",
      body: input.message,
      buttonLabel: "Open invoice",
      buttonHref: input.url,
      badges: input.badges ?? [],
      footer: `${input.businessName}. Reply to this email and it comes back to the business.`,
    }),
  };
}
