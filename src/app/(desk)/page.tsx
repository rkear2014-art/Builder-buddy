import { getGlance, requireUser } from "@/server/dal";
import { GlanceBoard } from "@/components/glance-board";
import { listDueManualReminders } from "@/server/invoice-reminders";
import { requestOrigin } from "@/server/origin";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const origin = await requestOrigin();
  const [glance, reminders] = await Promise.all([
    getGlance(user.businessId, user.branding),
    listDueManualReminders(user.businessId, origin),
  ]);
  return <GlanceBoard data={glance} reminders={reminders} />;
}
