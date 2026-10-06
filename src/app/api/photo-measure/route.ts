import { measureFromPhotos, type PhotoMeasureResult } from "@/server/photo-measure";
import { PHOTO_MEASURE_MAX_BYTES, PHOTO_MEASURE_MAX_PHOTOS } from "@/lib/photo-measure";
import { getCurrentUser } from "@/server/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(result: PhotoMeasureResult, status = 200): Response {
  return Response.json(result, { status });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, reason: "failed" }, 401);

  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > PHOTO_MEASURE_MAX_BYTES * PHOTO_MEASURE_MAX_PHOTOS + 64_000) {
    return json({ ok: false, reason: "too-large" }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, reason: "bad-photo" }, 400);
  }

  const files = form
    .getAll("photos")
    .filter((item): item is File => item instanceof File)
    .slice(0, PHOTO_MEASURE_MAX_PHOTOS);
  const images: Buffer[] = [];
  for (const file of files) {
    if (file.size > PHOTO_MEASURE_MAX_BYTES) return json({ ok: false, reason: "too-large" }, 413);
    images.push(Buffer.from(await file.arrayBuffer()));
  }

  const result = await measureFromPhotos({
    businessId: user.businessId,
    jobId: String(form.get("jobId") ?? ""),
    sectionId: String(form.get("sectionId") ?? ""),
    typeTitle: String(form.get("typeTitle") ?? "").slice(0, 80),
    place: String(form.get("place") ?? "room") === "wall" ? "wall" : "room",
    knownMeasurement: String(form.get("knownMeasurement") ?? ""),
    images,
  });
  const status = result.ok ? 200 : result.reason === "missing" ? 404 : result.reason === "too-large" ? 413 : 400;
  return json(result, status);
}
