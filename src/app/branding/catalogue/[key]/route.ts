import { isCatalogueKey } from "@/lib/catalogue";
import { tenantWhere } from "@/lib/tenancy";
import { getCurrentUser } from "@/server/dal";
import { logoHttpResponse } from "@/server/logo-http";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  const { key } = await context.params;
  const user = await getCurrentUser();
  if (!user || !isCatalogueKey(key)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const photo = await getPrisma().cataloguePhoto.findFirst({
    where: { catalogueKey: key, ...tenantWhere(user.businessId) },
    select: { bytes: true, mime: true },
  });
  if (!photo?.bytes || !photo.mime) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  return logoHttpResponse(photo.bytes, photo.mime);
}
