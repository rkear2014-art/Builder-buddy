import "server-only";
import { resolveAccent } from "@/lib/accent";
import { formatDocumentNumber } from "@/lib/documents";
import { invoiceTotals } from "@/lib/invoice";
import {
  chaseReminderManually,
  formatReminderDate,
  isManualReminderChannel,
  nextReminderStep,
  reminderEmail,
  reminderMessage,
  reminderScheduleOf,
  reminderSubject,
  type DueReminderView,
  type ReminderStep,
} from "@/lib/invoice-reminders";
import { formatPence } from "@/lib/money";
import { tenantWhere } from "@/lib/tenancy";
import { trustBadges } from "@/lib/trust";
import { londonToday, utcDateToIso } from "@/lib/dates";
import { brandedEmailReady, sendBrandedEmail } from "@/server/email";
import { isUniqueConstraint, getPrisma } from "@/server/prisma";
import { revalidatePath } from "next/cache";

export type DueReminder = DueReminderView;

const reminderInvoiceInclude = {
  lines: { select: { quantity: true, unitPricePence: true } },
  payments: { select: { amountPence: true } },
  reminders: { select: { step: true, channel: true } },
  job: { select: { id: true, customerName: true, email: true, phone: true } },
  business: {
    select: {
      name: true,
      email: true,
      accent: true,
      logoMime: true,
      remindersOn: true,
      reminderDay1: true,
      reminderDay2: true,
      reminderDay3: true,
      bankAccountName: true,
      bankSortCode: true,
      bankAccountNumber: true,
      insurer: true,
      coverAmount: true,
      guarantee: true,
      accreditations: true,
      reviewUrl: true,
    },
  },
} as const;

type ReminderInvoice = Awaited<ReturnType<typeof loadOpenInvoices>>[number];

async function loadOpenInvoices(businessId?: string) {
  return getPrisma().invoice.findMany({
    where: {
      ...(businessId ? tenantWhere(businessId) : {}),
      status: { in: ["SENT", "PART_PAID"] },
      remindersPaused: false,
      business: { remindersOn: true },
    },
    include: reminderInvoiceInclude,
  });
}

function planReminder(invoice: ReminderInvoice, today: string, origin: string): DueReminder | null {
  const totals = invoiceTotals({
    lines: invoice.lines.map((line) => ({ quantity: line.quantity.toString(), unitPricePence: line.unitPricePence })),
    vatRegistered: invoice.vatRegistered,
    vatRatePercent: invoice.vatRatePercent,
    depositPence: invoice.depositPence,
  });
  const paidPence = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0);
  const dueDate = utcDateToIso(invoice.dueDate);
  const next = nextReminderStep({
    status: invoice.status,
    dueDate,
    today,
    paidPence,
    totalDuePence: totals.duePence,
    remindersOn: invoice.business.remindersOn,
    remindersPaused: invoice.remindersPaused,
    sentSteps: invoice.reminders.map((reminder) => reminder.step),
    schedule: reminderScheduleOf(invoice.business.reminderDay1, invoice.business.reminderDay2, invoice.business.reminderDay3),
  });
  if (!next) return null;
  const reference = formatDocumentNumber("INV", invoice.number);
  const url = origin ? `${origin}/invoice/${invoice.shareToken}` : `/invoice/${invoice.shareToken}`;
  const owed = Math.max(0, totals.duePence - paidPence);
  const message = reminderMessage({
    customerName: invoice.job.customerName,
    businessName: invoice.business.name,
    reference,
    balancePence: owed,
    dueDate,
    bankAccountName: invoice.business.bankAccountName,
    bankSortCode: invoice.business.bankSortCode,
    bankAccountNumber: invoice.business.bankAccountNumber,
    url,
  });
  return {
    invoiceId: invoice.id,
    jobId: invoice.job.id,
    customerName: invoice.job.customerName,
    phone: invoice.job.phone,
    email: invoice.job.email,
    reference,
    step: next.step,
    daysOverdue: next.daysOverdue,
    amountLabel: formatPence(owed),
    dueLabel: formatReminderDate(dueDate),
    message,
    subject: reminderSubject(reference, invoice.business.name),
    invoiceHref: `/invoices/${invoice.id}`,
  };
}

export async function listDueManualReminders(businessId: string, origin: string): Promise<DueReminder[]> {
  const today = londonToday();
  const emailConfigured = brandedEmailReady();
  const invoices = await loadOpenInvoices(businessId);
  const due: DueReminder[] = [];
  for (const invoice of invoices) {
    const reminder = planReminder(invoice, today, origin);
    if (!reminder) continue;
    if (
      !chaseReminderManually({
        emailConfigured,
        customerEmail: invoice.job.email,
        businessEmail: invoice.business.email,
      })
    ) {
      continue;
    }
    due.push(reminder);
  }
  due.sort((left, right) => right.daysOverdue - left.daysOverdue || left.customerName.localeCompare(right.customerName));
  return due;
}

export async function countDueManualReminders(businessId: string): Promise<number> {
  const reminders = await listDueManualReminders(businessId, "");
  return reminders.length;
}

async function claimReminder(invoice: ReminderInvoice, step: ReminderStep, channel: string): Promise<boolean> {
  try {
    await getPrisma().invoiceReminder.create({
      data: {
        businessId: invoice.businessId,
        invoiceId: invoice.id,
        step,
        channel,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraint(error)) return false;
    throw error;
  }
}

async function releaseEmailClaim(invoiceId: string, step: number): Promise<void> {
  await getPrisma().invoiceReminder.deleteMany({
    where: { invoiceId, step, channel: "EMAIL" },
  });
}

export async function sendDueInvoiceReminders(origin: string): Promise<{ sent: number; skipped: number }> {
  if (!brandedEmailReady()) return { sent: 0, skipped: 0 };
  const today = londonToday();
  const invoices = await loadOpenInvoices();
  let sent = 0;
  let skipped = 0;
  for (const invoice of invoices) {
    const reminder = planReminder(invoice, today, origin);
    if (!reminder) continue;
    if (
      chaseReminderManually({
        emailConfigured: true,
        customerEmail: invoice.job.email,
        businessEmail: invoice.business.email,
      })
    ) {
      skipped += 1;
      continue;
    }
    const claimed = await claimReminder(invoice, reminder.step, "EMAIL");
    if (!claimed) {
      skipped += 1;
      continue;
    }
    const logoSrc = invoice.business.logoMime && origin ? `${origin}/invoice/${invoice.shareToken}/logo` : null;
    const built = reminderEmail({
      businessName: invoice.business.name,
      accent: resolveAccent(invoice.business.accent),
      logoSrc,
      message: reminder.message,
      url: origin ? `${origin}/invoice/${invoice.shareToken}` : `/invoice/${invoice.shareToken}`,
      subject: reminder.subject,
      badges: trustBadges(invoice.business),
    });
    const result = await sendBrandedEmail({
      to: invoice.job.email.trim(),
      replyTo: invoice.business.email.trim(),
      fromName: invoice.business.name,
      subject: built.subject,
      html: built.html,
    });
    if (!result.ok) {
      await releaseEmailClaim(invoice.id, reminder.step);
      skipped += 1;
      continue;
    }
    sent += 1;
    revalidatePath("/");
    revalidatePath(`/invoices/${invoice.id}`);
  }
  return { sent, skipped };
}

export async function recordManualReminder(input: {
  businessId: string;
  invoiceId: string;
  step: number;
  channel: string;
}): Promise<boolean> {
  if (!isManualReminderChannel(input.channel)) return false;
  if (input.step !== 1 && input.step !== 2 && input.step !== 3) return false;
  const invoice = await getPrisma().invoice.findFirst({
    where: { id: input.invoiceId, ...tenantWhere(input.businessId) },
    include: reminderInvoiceInclude,
  });
  if (!invoice) return false;
  const planned = planReminder(invoice, londonToday(), "");
  if (!planned || planned.step !== input.step) return false;
  return claimReminder(invoice, planned.step, input.channel);
}
