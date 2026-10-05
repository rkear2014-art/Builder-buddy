"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditBusiness } from "@/lib/branding";
import type { ActionState } from "@/lib/form-state";
import { parseReminderSettings } from "@/lib/invoice-reminders";
import { requireUser } from "@/server/dal";
import { recordManualReminder } from "@/server/invoice-reminders";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

export async function saveReminderSettings(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canEditBusiness(user.role)) return { error: "Only the owner can change the business details." };
  const parsed = parseReminderSettings(formData);
  if (!parsed.ok) return { error: parsed.error };
  await getPrisma().business.update({
    where: { id: user.businessId },
    data: parsed.data,
  });
  revalidateDesk();
  redirect("/settings?saved=reminders#reminders");
}

export async function saveInvoiceReminderPause(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const paused = formData.getAll("paused").map(String).includes("yes");
  const invoice = await getPrisma().invoice.findFirst({
    where: { id: invoiceId, businessId: user.businessId },
    select: { id: true },
  });
  if (!invoice) return { error: "That invoice could not be found." };
  await getPrisma().invoice.update({
    where: { id: invoice.id },
    data: { remindersPaused: paused },
  });
  revalidatePath("/");
  revalidatePath(`/invoices/${invoice.id}`);
  redirect(`/invoices/${invoice.id}`);
}

export async function recordReminderSent(invoiceId: string, step: number, channel: string): Promise<void> {
  const user = await requireUser();
  await recordManualReminder({
    businessId: user.businessId,
    invoiceId,
    step,
    channel,
  });
  revalidatePath("/");
  revalidatePath(`/invoices/${invoiceId}`);
}
