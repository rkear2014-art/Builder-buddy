import { isWellFormedShareToken } from "@/lib/access";
import { isConfigured } from "@/lib/config";
import { logoHttpResponse } from "@/server/logo-http";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; id: string }> },
): Promise<Response> {
  const { token, id } = await context.params;
  if (!isConfigured() || !isWellFormedShareToken(token) || !/^[a-z0-9]{8,40}$/i.test(id)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const job = await getPrisma().job.findUnique({
    where: { shareToken: token },
    select: { id: true, shareActive: true, showPhotos: true, businessId: true },
  });
  if (!job?.shareActive || !job.showPhotos) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const photo = await getPrisma().jobPhoto.findFirst({
    where: { id, jobId: job.id, businessId: job.businessId },
  });
  if (!photo) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return logoHttpResponse(photo.bytes, photo.mime);
}
