"use client";

import { useState } from "react";
import { mailtoHref, quoteMessage, smsHref, whatsAppHref } from "@/lib/customer-message";

export function SendQuote({
  customerName,
  businessName,
  email,
  phone,
  url,
}: {
  customerName: string;
  businessName: string;
  email: string;
  phone: string;
  url: string;
}) {
  const [message, setMessage] = useState(quoteMessage({ customerName, businessName, url }));
  const subject = `Quotation from ${businessName}`;
  const mail = email.trim() ? mailtoHref(email.trim(), subject, message) : null;

  return (
    <div className="grid gap-3">
      {mail ? (
        <a className="job-mail" href={mail}>
          Email quote to customer · {email.trim()}
        </a>
      ) : (
        <p className="job-mail">Add the customer’s email on the job to email the quote.</p>
      )}
      <section className="rounded-2xl border border-line bg-white p-4">
        <h3 className="font-bold">Send quote by WhatsApp or text</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a className="btn btn-whatsapp" href={whatsAppHref(phone, message)}>
            Send by WhatsApp
          </a>
          <a className="btn btn-secondary" href={smsHref(phone, message)}>
            Send by text
          </a>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer font-bold text-sky">▸ See / edit the message</summary>
          <label className="field mt-3">
            Message
            <span>This opens your own WhatsApp, messages, or email. Nothing is sent from Builder Buddy.</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} />
          </label>
        </details>
      </section>
    </div>
  );
}
