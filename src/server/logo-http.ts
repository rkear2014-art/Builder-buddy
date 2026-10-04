import "server-only";

const LOGO_TYPES = new Set(["image/webp", "image/png", "image/jpeg"]);

export function logoHttpResponse(bytes: Uint8Array, mime: string): Response {
  if (!LOGO_TYPES.has(mime) || bytes.byteLength === 0) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
