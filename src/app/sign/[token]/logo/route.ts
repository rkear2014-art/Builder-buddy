import { isWellFormedShareToken } from "@/lib/access";
import { isConfigured } from "@/lib/config";
import { logoHttpResponse } from "@/server/logo-http";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  if (!isConfigured() || !isWellFormedShareToken(token)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const job = await getPrisma().job.findUnique({
    where: { shareToken: token },
    select: { business: { select: { logoBytes: true, logoMime: true } } },
  });
  if (!job?.business.logoBytes || !job.business.logoMime) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  return logoHttpResponse(job.business.logoBytes, job.business.logoMime);
}
