"use client";

import type { MouseEvent } from "react";
import { mailtoHref, smsHref, whatsAppHref } from "@/lib/customer-message";
import { recordReminderSent } from "@/server/actions/reminders";

export function SendReminder({
  invoiceId,
  step,
  phone,
  email,
  message,
  subject,
  previewId,
}: {
  invoiceId: string;
  step: number;
  phone: string;
  email: string;
  message: string;
  subject: string;
  previewId?: string;
}) {
  const mail = email.trim() ? mailtoHref(email.trim(), subject, message) : "";
  const whatsApp = whatsAppHref(phone, message);
  const text = smsHref(phone, message);

  async function open(event: MouseEvent<HTMLAnchorElement>, channel: "WHATSAPP" | "TEXT" | "MAIL", href: string) {
    event.preventDefault();
    try {
      await recordReminderSent(invoiceId, step, channel);
    } catch {
      // The message app still opens if the reminder could not be saved.
    }
    window.location.href = href;
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        <a className="btn btn-whatsapp px-2" href={whatsApp} onClick={(event) => void open(event, "WHATSAPP", whatsApp)}>
          WhatsApp
        </a>
        <a className="btn btn-secondary px-2" href={text} onClick={(event) => void open(event, "TEXT", text)}>
          Text
        </a>
        {mail ? (
          <a className="btn btn-secondary px-2" href={mail} onClick={(event) => void open(event, "MAIL", mail)}>
            Email
          </a>
        ) : (
          <p className="btn btn-secondary px-2 opacity-60">Email</p>
        )}
      </div>
      <div id={previewId} className="rounded-2xl bg-[#f4f6f8] p-3">
        <p className="text-sm font-extrabold">Message</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
