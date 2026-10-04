import { tenantWhere } from "@/lib/tenancy";
import { getCurrentUser } from "@/server/dal";
import { logoHttpResponse } from "@/server/logo-http";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user || !/^[a-z0-9-]{8,80}$/i.test(id)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const photo = await getPrisma().heroPhoto.findFirst({
    where: { id, ...tenantWhere(user.businessId) },
    select: { bytes: true, mime: true },
  });
  if (!photo?.bytes || !photo.mime) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  return logoHttpResponse(photo.bytes, photo.mime);
}
