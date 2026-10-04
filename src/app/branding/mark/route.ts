import { businessLogoQuery } from "@/lib/branding";
import { getCurrentUser } from "@/server/dal";
import { logoHttpResponse } from "@/server/logo-http";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user?.branding.hasMark) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const business = await getPrisma().business.findFirst({
    where: businessLogoQuery(user.businessId),
    select: { markBytes: true, markMime: true },
  });
  if (!business?.markBytes || !business.markMime) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  return logoHttpResponse(business.markBytes, business.markMime);
}
