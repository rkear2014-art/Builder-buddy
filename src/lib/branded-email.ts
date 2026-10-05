export function brandedEmailHtml(input: {
  businessName: string;
  accent: string;
  logoSrc: string | null;
  headline: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  badges: string[];
  footer: string;
}): string {
  const badges = input.badges
    .map(
      (badge) =>
        `<span style="display:inline-block;margin:0 8px 8px 0;padding:6px 10px;border-radius:999px;background:#f4f6f8;color:#1c1915;font-size:13px;font-weight:700;">${escapeHtml(badge)}</span>`,
    )
    .join("");
  const logo = input.logoSrc
    ? `<img src="${escapeHtml(input.logoSrc)}" alt="" width="160" style="display:block;max-width:160px;height:auto;margin-bottom:16px;" />`
    : "";
  return `<!doctype html>
<html lang="en-GB">
  <body style="margin:0;background:#eef1f4;color:#1c1915;font-family:Georgia, 'Source Sans 3', sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f4;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px;">
          <tr><td>
            ${logo}
            <p style="margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:0.04em;color:${escapeHtml(input.accent)};">${escapeHtml(input.businessName.toUpperCase())}</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;">${escapeHtml(input.headline)}</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(input.body)}</p>
            <p style="margin:0 0 20px;">
              <a href="${escapeHtml(input.buttonHref)}" style="display:inline-block;background:${escapeHtml(input.accent)};color:#ffffff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:999px;">${escapeHtml(input.buttonLabel)}</a>
            </p>
            <p style="margin:0 0 16px;">${badges}</p>
            <p style="margin:0;font-size:13px;color:#57534e;">${escapeHtml(input.footer)}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function documentEmail(input: {
  kind: "quote" | "invoice" | "review" | "test";
  businessName: string;
  accent: string;
  logoSrc: string | null;
  body: string;
  url: string;
  badges: string[];
}): { subject: string; html: string } {
  const subject =
    input.kind === "invoice"
      ? `Invoice from ${input.businessName}`
      : input.kind === "review"
        ? `How did we do?`
        : input.kind === "test"
          ? `Test email from ${input.businessName}`
          : `Quotation from ${input.businessName}`;
  const headline =
    input.kind === "invoice"
      ? "Your invoice"
      : input.kind === "review"
        ? "Would you leave a review?"
        : input.kind === "test"
          ? "This is a test email"
          : "Your quotation";
  const buttonLabel =
    input.kind === "invoice"
      ? "Open invoice"
      : input.kind === "review"
        ? "Leave a review"
        : input.kind === "test"
          ? "Open Builder Buddy"
          : "Open quotation";
  return {
    subject,
    html: brandedEmailHtml({
      businessName: input.businessName,
      accent: input.accent,
      logoSrc: input.logoSrc,
      headline,
      body: input.body,
      buttonLabel,
      buttonHref: input.url,
      badges: input.badges,
      footer: `${input.businessName}. Reply to this email and it comes back to the business.`,
    }),
  };
}

export function canSendBrandedEmail(env: Record<string, string | undefined>): boolean {
  const key = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.RESEND_FROM_EMAIL?.trim() ?? "";
  return key.length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from);
}
