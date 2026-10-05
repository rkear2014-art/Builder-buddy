"use server";

import { redirect } from "next/navigation";
import { createShareToken } from "@/lib/access";
import { parseBusinessExtras } from "@/lib/business-extras";
import { documentEmail } from "@/lib/branded-email";
import { canEditBusiness } from "@/lib/branding";
import { isInternalCrewName } from "@/lib/crew";
import { addDays, isIsoDate, isoToUtcDate, londonToday } from "@/lib/dates";
import type { ActionState } from "@/lib/form-state";
import { invoiceTotals, invoiceVatIsLocked, statusAfterPayment, PAYMENT_METHODS, type PaymentMethod } from "@/lib/invoice";
import { chargeVat } from "@/lib/quote";
import { parsePoundsToPence } from "@/lib/money";
import { isPhotoStage, MAX_JOB_PHOTOS } from "@/lib/photos";
import { trustBadges } from "@/lib/trust";
import { tenantWhere } from "@/lib/tenancy";
import { prepareHero } from "@/lib/logo";
import { requireUser } from "@/server/dal";
import { brandedEmailReady, sendBrandedEmail } from "@/server/email";
import { requestOrigin } from "@/server/origin";
import { getPrisma } from "@/server/prisma";
import { revalidateDesk } from "@/server/revalidate";

function dueDays(value: number): number {
  return Number.isInteger(value) && value >= 1 && value <= 90 ? value : 14;
}

export async function saveBusinessExtras(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canEditBusiness(user.role)) return { error: "Only the owner can change the business details." };
  const parsed = parseBusinessExtras(formData);
  if (!parsed.ok) return { error: parsed.error };
  await getPrisma().business.update({
    where: { id: user.businessId },
    data: parsed.data,
  });
  revalidateDesk();
  redirect("/settings?saved=extras");
}

export async function saveQuoteValidity(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const validUntil = String(formData.get("validUntil") ?? "");
  if (!isIsoDate(validUntil)) return { error: "Enter a valid until date." };
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true, signOff: { select: { id: true } } },
  });
  if (!job) return { error: "That job could not be found." };
  if (job.signOff) return { error: "This quote is already signed, so the valid until date stays as it was." };
  await getPrisma().job.update({
    where: { id: job.id },
    data: { validUntil: isoToUtcDate(validUntil) },
  });
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}`);
}

export async function raiseInvoice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const depositTaken = formData.get("depositTaken") === "yes";
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    include: {
      materials: { orderBy: { sortOrder: "asc" } },
      business: { select: { invoiceDueDays: true, vatRegistered: true, vatRatePercent: true } },
    },
  });
  if (!job) return { error: "That job could not be found." };
  const today = londonToday();
  const deposit = depositTaken && job.depositPence && job.depositPence > 0 ? job.depositPence : null;
  const invoice = await getPrisma().$transaction(async (tx) => {
    const allocated = await tx.business.update({
      where: { id: user.businessId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true },
    });
    return tx.invoice.create({
      data: {
        businessId: user.businessId,
        jobId: job.id,
        number: allocated.nextInvoiceNumber - 1,
        issueDate: isoToUtcDate(today),
        dueDate: isoToUtcDate(addDays(today, dueDays(job.business.invoiceDueDays))),
        depositPence: deposit,
        vatRegistered: chargeVat({ vatRegistered: job.business.vatRegistered, omitVat: job.omitVat }),
        vatRatePercent: job.business.vatRatePercent,
        shareToken: createShareToken(),
        lines: {
          create: job.materials.filter((material) => !isInternalCrewName(material.name)).map((material, index) => ({
            name: material.name,
            quantity: material.quantity,
            unit: material.unit,
            unitPricePence: material.unitPricePence,
            sortOrder: index,
          })),
        },
      },
      select: { id: true },
    });
  });
  revalidateDesk(job.id);
  redirect(`/invoices/${invoice.id}`);
}

export async function saveInvoiceDates(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const issueDate = String(formData.get("issueDate") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!isIsoDate(issueDate) || !isIsoDate(dueDate)) return { error: "Enter the issue date and the due date." };
  if (dueDate < issueDate) return { error: "The due date cannot be before the issue date." };
  const invoice = await getPrisma().invoice.findFirst({
    where: { id: invoiceId, ...tenantWhere(user.businessId) },
    select: { id: true },
  });
  if (!invoice) return { error: "That invoice could not be found." };
  await getPrisma().invoice.update({
    where: { id: invoice.id },
    data: { issueDate: isoToUtcDate(issueDate), dueDate: isoToUtcDate(dueDate) },
  });
  revalidateDesk();
  redirect(`/invoices/${invoice.id}`);
}

export async function saveInvoiceVat(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const omit = formData.getAll("omitVat").map(String).includes("yes");
  const invoice = await getPrisma().invoice.findFirst({
    where: { id: invoiceId, ...tenantWhere(user.businessId) },
    include: { payments: { select: { amountPence: true } }, business: { select: { vatRatePercent: true } } },
  });
  if (!invoice) return { error: "That invoice could not be found." };
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0);
  if (invoiceVatIsLocked(invoice.status, paid)) {
    return { error: "This invoice has already been sent or paid, so the VAT stays as it was." };
  }
  await getPrisma().invoice.update({
    where: { id: invoice.id },
    data: omit
      ? { vatRegistered: false }
      : { vatRegistered: true, vatRatePercent: invoice.business.vatRatePercent },
  });
  revalidateDesk();
  redirect(`/invoices/${invoice.id}`);
}

export async function markInvoiceSent(formData: FormData): Promise<void> {
  const user = await requireUser();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoice = await getPrisma().invoice.findFirst({
    where: { id: invoiceId, ...tenantWhere(user.businessId) },
    include: { lines: true, payments: true },
  });
  if (!invoice || invoice.status !== "DRAFT") redirect(invoice ? `/invoices/${invoice.id}` : "/invoices");
  const totals = invoiceTotals({
    lines: invoice.lines.map((line) => ({ quantity: line.quantity.toString(), unitPricePence: line.unitPricePence })),
    vatRegistered: invoice.vatRegistered,
    vatRatePercent: invoice.vatRatePercent,
    depositPence: invoice.depositPence,
  });
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0);
  await getPrisma().invoice.update({
    where: { id: invoice.id },
    data: { status: statusAfterPayment(paid, totals.duePence, false) },
  });
  revalidateDesk();
  redirect(`/invoices/${invoice.id}`);
}

export async function recordPayment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const method = String(formData.get("method") ?? "");
  const paidOn = String(formData.get("paidOn") ?? "");
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) return { error: "Choose cash, bank transfer, or card." };
  if (!isIsoDate(paidOn)) return { error: "Enter the date the payment was received." };
  const amount = parsePoundsToPence(String(formData.get("amount") ?? ""));
  if (!amount.ok) return { error: amount.error };
  if (amount.pence == null || amount.pence <= 0) return { error: "Enter the amount received." };

  const invoice = await getPrisma().invoice.findFirst({
    where: { id: invoiceId, ...tenantWhere(user.businessId) },
    include: { lines: true, payments: true },
  });
  if (!invoice) return { error: "That invoice could not be found." };
  const totals = invoiceTotals({
    lines: invoice.lines.map((line) => ({ quantity: line.quantity.toString(), unitPricePence: line.unitPricePence })),
    vatRegistered: invoice.vatRegistered,
    vatRatePercent: invoice.vatRatePercent,
    depositPence: invoice.depositPence,
  });
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0) + amount.pence;
  const next = statusAfterPayment(paid, totals.duePence, invoice.status === "DRAFT");
  await getPrisma().$transaction([
    getPrisma().payment.create({
      data: {
        businessId: user.businessId,
        invoiceId: invoice.id,
        amountPence: amount.pence,
        paidOn: isoToUtcDate(paidOn),
        method: method as PaymentMethod,
      },
    }),
    getPrisma().invoice.update({
      where: { id: invoice.id },
      data: { status: next === "DRAFT" ? "PART_PAID" : next },
    }),
  ]);
  revalidateDesk();
  redirect(`/invoices/${invoice.id}`);
}

export async function setShowPhotos(formData: FormData): Promise<void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const show = formData.get("showPhotos") === "yes";
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, shareToken: true },
  });
  if (!job) redirect("/jobs");
  await getPrisma().job.update({ where: { id: job.id }, data: { showPhotos: show } });
  revalidateDesk(job.id, job.shareToken);
  redirect(`/jobs/${job.id}#photos`);
}

export async function uploadJobPhoto(formData: FormData): Promise<{ error: string } | void> {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!isPhotoStage(stage)) return { error: "Choose Before, During, or After." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo from the camera or gallery." };
  const job = await getPrisma().job.findFirst({
    where: { id: jobId, ...tenantWhere(user.businessId) },
    select: { id: true, _count: { select: { photos: true } } },
  });
  if (!job) return { error: "That job could not be found." };
  if (job._count.photos >= MAX_JOB_PHOTOS) return { error: `This job already has ${MAX_JOB_PHOTOS} photos. Remove one before adding more.` };
  const prepared = await prepareHero(new Uint8Array(await file.arrayBuffer()));
  if ("error" in prepared) return { error: prepared.error };
  await getPrisma().jobPhoto.create({
    data: {
      businessId: user.businessId,
      jobId: job.id,
      bytes: Buffer.from(prepared.bytes),
      mime: prepared.mime,
      stage,
    },
  });
  revalidateDesk(job.id);
  redirect(`/jobs/${job.id}#photos`);
}

export async function deleteJobPhoto(formData: FormData): Promise<void> {
  const user = await requireUser();
  const photoId = String(formData.get("photoId") ?? "");
  const photo = await getPrisma().jobPhoto.findFirst({
    where: { id: photoId, ...tenantWhere(user.businessId) },
    select: { id: true, jobId: true },
  });
  if (!photo) redirect("/jobs");
  await getPrisma().jobPhoto.delete({ where: { id: photo.id } });
  revalidateDesk(photo.jobId);
  redirect(`/jobs/${photo.jobId}#photos`);
}

async function absoluteLogo(origin: string, path: string | null): Promise<string | null> {
  if (!path || !origin) return null;
  return path.startsWith("http") ? path : `${origin}${path}`;
}

export async function sendBrandedMessage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!brandedEmailReady()) return { error: "Branded email is not set up." };
  if (!user.branding.email.trim()) return { error: "Add the business email on the Business page first, so replies come back to you." };
  const kind = String(formData.get("kind") ?? "");
  if (kind !== "quote" && kind !== "invoice" && kind !== "review") return { error: "That message could not be sent." };
  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 8 || message.length > 2000) return { error: "Write a short message, up to 2000 characters." };

  const origin = await requestOrigin();
  let to = "";
  let url = "";
  let logoPath: string | null = null;
  let invoiceId = "";

  if (kind === "invoice") {
    invoiceId = String(formData.get("invoiceId") ?? "");
    const invoice = await getPrisma().invoice.findFirst({
      where: { id: invoiceId, ...tenantWhere(user.businessId) },
      include: { job: { select: { email: true, shareActive: true, shareToken: true } } },
    });
    if (!invoice) return { error: "That invoice could not be found." };
    to = invoice.job.email.trim();
    url = origin ? `${origin}/invoice/${invoice.shareToken}` : `/invoice/${invoice.shareToken}`;
    logoPath = `/invoice/${invoice.shareToken}/logo`;
  } else {
    const jobId = String(formData.get("jobId") ?? "");
    const job = await getPrisma().job.findFirst({
      where: { id: jobId, ...tenantWhere(user.businessId) },
      select: { id: true, email: true, customerName: true, shareToken: true, shareActive: true },
    });
    if (!job) return { error: "That job could not be found." };
    to = job.email.trim();
    if (kind === "review") {
      url = user.branding.reviewUrl;
      if (!url) return { error: "Add a review link on the Business page first." };
    } else {
      if (!job.shareActive) return { error: "Turn the customer link back on before sending the quote." };
      url = origin ? `${origin}/sign/${job.shareToken}` : `/sign/${job.shareToken}`;
    }
    logoPath = job.shareActive ? `/sign/${job.shareToken}/logo` : null;
  }

  if (!to) return { error: "Add the customer’s email on the job first." };
  const built = documentEmail({
    kind,
    businessName: user.businessName,
    accent: user.branding.accentColour,
    logoSrc: await absoluteLogo(origin, user.branding.hasLogo ? logoPath : null),
    body: message,
    url,
    badges: trustBadges(user.branding),
  });
  const sent = await sendBrandedEmail({
    to,
    replyTo: user.branding.email.trim(),
    fromName: user.businessName,
    subject: built.subject,
    html: built.html,
  });
  if (!sent.ok) return { error: sent.error };

  if (kind === "invoice" && invoiceId) {
    const invoice = await getPrisma().invoice.findFirst({
      where: { id: invoiceId, ...tenantWhere(user.businessId) },
      include: { lines: true, payments: true },
    });
    if (invoice?.status === "DRAFT") {
      const totals = invoiceTotals({
        lines: invoice.lines.map((line) => ({ quantity: line.quantity.toString(), unitPricePence: line.unitPricePence })),
        vatRegistered: invoice.vatRegistered,
        vatRatePercent: invoice.vatRatePercent,
        depositPence: invoice.depositPence,
      });
      const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0);
      await getPrisma().invoice.update({
        where: { id: invoice.id },
        data: { status: statusAfterPayment(paid, totals.duePence, false) },
      });
    }
  }
  revalidateDesk();
  redirect(kind === "invoice" ? `/invoices/${invoiceId}?sent=1` : `/jobs/${String(formData.get("jobId") ?? "")}?sent=1`);
}

export async function sendTestEmail(state: ActionState, formData: FormData): Promise<ActionState> {
  void state;
  void formData;
  const user = await requireUser();
  if (!canEditBusiness(user.role)) return { error: "Only the owner can send a test email." };
  if (!brandedEmailReady()) return { error: "Branded email is not set up." };
  const to = user.branding.email.trim();
  if (!to) return { error: "Add the business email first, then send the test there." };
  const origin = await requestOrigin();
  const business = await getPrisma().business.findFirst({
    where: { id: user.businessId },
    select: { logoBytes: true, logoMime: true },
  });
  const logoSrc =
    business?.logoBytes && business.logoMime
      ? `data:${business.logoMime};base64,${Buffer.from(business.logoBytes).toString("base64")}`
      : null;
  const built = documentEmail({
    kind: "test",
    businessName: user.businessName,
    accent: user.branding.accentColour,
    logoSrc,
    body: `Hello,\n\nThis is a test from ${user.businessName}. Customer quotes, invoices, and review requests can use this letterhead when you send them from Builder Buddy.`,
    url: origin || "https://app.plastererinredditch.co.uk",
    badges: trustBadges(user.branding),
  });
  const sent = await sendBrandedEmail({
    to,
    replyTo: to,
    fromName: user.businessName,
    subject: built.subject,
    html: built.html,
  });
  if (!sent.ok) return { error: sent.error };
  redirect("/settings?saved=test-email");
}
