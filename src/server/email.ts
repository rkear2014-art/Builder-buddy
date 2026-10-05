import "server-only";
import { canSendBrandedEmail } from "@/lib/branded-email";

export function brandedEmailReady(): boolean {
  return canSendBrandedEmail(process.env);
}

export async function sendBrandedEmail(input: {
  to: string;
  replyTo: string;
  fromName: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim() ?? "";
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
  if (!canSendBrandedEmail({ RESEND_API_KEY: key, RESEND_FROM_EMAIL: fromEmail })) {
    return { ok: false, error: "Branded email is not set up." };
  }
  const fromName = input.fromName.replace(/[<>"]/g, "").trim() || "Builder Buddy";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [input.to],
      reply_to: input.replyTo || undefined,
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!response.ok) {
    return { ok: false, error: "The email could not be sent. Check the Resend domain and try again." };
  }
  return { ok: true };
}
