import { getGlance, requireUser } from "@/server/dal";
import { GlanceBoard } from "@/components/glance-board";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const glance = await getGlance(user.businessId, user.branding);
  return <GlanceBoard data={glance} />;
}
