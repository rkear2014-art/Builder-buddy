import { canSendBrandedEmail } from "@/lib/branded-email";
import { cronAuthorised } from "@/lib/invoice-reminders";
import { sendDueInvoiceReminders } from "@/server/invoice-reminders";
import { requestOrigin } from "@/server/origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!cronAuthorised(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!canSendBrandedEmail(process.env)) {
    return Response.json({ ok: true, sent: 0, mode: "manual" });
  }
  const origin = await requestOrigin();
  const result = await sendDueInvoiceReminders(origin);
  return Response.json({ ok: true, mode: "email", ...result });
}
