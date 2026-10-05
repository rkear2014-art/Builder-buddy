import { isSampleHeroKey } from "@/lib/heroes";
import { getCurrentUser } from "@/server/dal";
import { logoHttpResponse } from "@/server/logo-http";
import { readSampleHero } from "@/server/sample-heroes";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sourceKey: string }> },
): Promise<Response> {
  const { sourceKey } = await context.params;
  const user = await getCurrentUser();
  if (!user || !isSampleHeroKey(sourceKey)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const bytes = await readSampleHero(sourceKey);
    return logoHttpResponse(bytes, "image/webp");
  } catch {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
