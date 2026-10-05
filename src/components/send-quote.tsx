"use client";

import { useActionState, useState, type MouseEvent } from "react";
import { invoiceMessage, mailtoHref, quoteMessage, reviewMessage, smsHref, whatsAppHref } from "@/lib/customer-message";
import { initialFormState } from "@/lib/form-state";
import { sendBrandedMessage } from "@/server/actions/customer-finish";
import { markQuoteSent } from "@/server/actions/jobs";

export function SendQuote({
  customerName,
  businessName,
  email,
  phone,
  url,
  kind = "quote",
  brandedReady = false,
  jobId,
  invoiceId,
}: {
  customerName: string;
  businessName: string;
  email: string;
  phone: string;
  url: string;
  kind?: "quote" | "invoice" | "review";
  brandedReady?: boolean;
  jobId?: string;
  invoiceId?: string;
}) {
  const initial =
    kind === "invoice"
      ? invoiceMessage({ customerName, businessName, url })
      : kind === "review"
        ? reviewMessage({ customerName, businessName, url })
        : quoteMessage({ customerName, businessName, url });
  const [message, setMessage] = useState(initial);
  const [brandState, brandAction] = useActionState(sendBrandedMessage, initialFormState);
  const subject =
    kind === "invoice" ? `Invoice from ${businessName}` : kind === "review" ? "How did we do?" : `Quotation from ${businessName}`;
  const emailLabel =
    kind === "invoice" ? "Email invoice" : kind === "review" ? "Email a review request" : "Email quote to customer";
  const heading =
    kind === "invoice" ? "Send invoice by WhatsApp or text" : kind === "review" ? "Ask for a review" : "Send quote by WhatsApp or text";
  const mail = email.trim() ? mailtoHref(email.trim(), subject, message) : null;

  async function openChannel(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (kind !== "quote" || !jobId) return;
    event.preventDefault();
    try {
      await markQuoteSent(jobId);
    } catch {
      // The message app still opens if the status could not be saved.
    }
    window.location.href = href;
  }

  return (
    <div className="grid gap-3">
      {mail ? (
        <a className="job-mail" href={mail} onClick={(event) => void openChannel(event, mail)}>
          {emailLabel} · {email.trim()}
        </a>
      ) : (
        <p className="job-mail">Add the customer’s email on the job to email this.</p>
      )}
      <section className="rounded-2xl border border-line bg-white p-4">
        <h3 className="font-bold">{heading}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a className="btn btn-whatsapp" href={whatsAppHref(phone, message)} onClick={(event) => void openChannel(event, whatsAppHref(phone, message))}>
            Send by WhatsApp
          </a>
          <a className="btn btn-secondary" href={smsHref(phone, message)} onClick={(event) => void openChannel(event, smsHref(phone, message))}>
            Send by text
          </a>
        </div>
        <details className="mt-3" open={kind === "review" ? true : undefined}>
          <summary className="cursor-pointer font-bold text-sky">▸ See / edit the message</summary>
          <label className="field mt-3">
            Message
            <span>
              {brandedReady
                ? "WhatsApp and text open your own apps. Branded email is sent for you, and replies come back to the business email."
                : "This opens your own WhatsApp, messages, or email. Nothing is sent from Builder Buddy."}
            </span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} />
          </label>
        </details>
        {brandedReady ? (
          <form action={brandAction} className="mt-3 grid gap-2">
            {brandState.error ? (
              <p role="alert" className="rounded-xl bg-blush px-3 py-2 font-bold text-clay">
                {brandState.error}
              </p>
            ) : null}
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="jobId" value={jobId ?? ""} />
            <input type="hidden" name="invoiceId" value={invoiceId ?? ""} />
            <input type="hidden" name="message" value={message} />
            <button className="btn w-full" type="submit">
              Send branded email
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
