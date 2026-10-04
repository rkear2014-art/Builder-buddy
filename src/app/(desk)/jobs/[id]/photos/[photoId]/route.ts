import { getCurrentUser } from "@/server/dal";
import { logoHttpResponse } from "@/server/logo-http";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; photoId: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const { id, photoId } = await context.params;
  const photo = await getPrisma().jobPhoto.findFirst({
    where: { id: photoId, jobId: id, businessId: user.businessId },
  });
  if (!photo) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const response = logoHttpResponse(photo.bytes, photo.mime);
  if (!download) return response;
  const headers = new Headers(response.headers);
  const filename = `${photo.stage.toLowerCase()}-${photo.id.slice(0, 6)}.webp`;
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  return new Response(response.body, { status: 200, headers });
}
