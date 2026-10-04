"use client";

import { useState } from "react";
import { mailtoHref, smsHref, whatsAppHref } from "@/lib/customer-message";

export function SharePortal({
  url,
  title,
  message,
  email,
  phone,
}: {
  url: string;
  title: string;
  message: string;
  email: string;
  phone: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: message, url });
        setShared(true);
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-primary" onClick={() => void share()}>
        {shared ? "Shared" : copied && typeof navigator.share !== "function" ? "Copied" : "Share link…"}
      </button>
      <a className="btn btn-secondary" href={smsHref(phone, message)}>
        Text
      </a>
      <a className="btn btn-secondary" href={whatsAppHref(phone, message)}>
        WhatsApp
      </a>
      {email.trim() ? (
        <a className="btn btn-secondary" href={mailtoHref(email.trim(), title, message)}>
          Email
        </a>
      ) : null}
      <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
