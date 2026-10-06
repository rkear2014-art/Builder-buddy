import "server-only";

import { londonToday } from "@/lib/dates";
import {
  PHOTO_MEASURE_DAILY_LIMIT,
  PHOTO_MEASURE_FIXTURE,
  PHOTO_MEASURE_MAX_BYTES,
  PHOTO_MEASURE_MAX_PHOTOS,
  parsePhotoEstimateJson,
  photoEstimateRequestSchema,
  photoMeasureInstruction,
  photoMeasureReady,
  visionModel,
  type PhotoEstimate,
} from "@/lib/photo-measure";
import { tenantWhere } from "@/lib/tenancy";
import { getPrisma } from "@/server/prisma";

const JPEG = [0xff, 0xd8, 0xff];

export type PhotoMeasureResult =
  | { ok: true; estimate: PhotoEstimate }
  | { ok: false; reason: "not-configured" | "limit" | "too-large" | "bad-photo" | "failed" | "missing" };

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && JPEG.every((byte, index) => bytes[index] === byte);
}

async function takeSlot(businessId: string): Promise<boolean> {
  const day = londonToday();
  const row = await getPrisma().photoMeasureDay.upsert({
    where: { businessId_day: { businessId, day } },
    create: { businessId, day, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  if (row.count <= PHOTO_MEASURE_DAILY_LIMIT) return true;
  await getPrisma().photoMeasureDay.update({
    where: { businessId_day: { businessId, day } },
    data: { count: { decrement: 1 } },
  });
  return false;
}

async function releaseSlot(businessId: string): Promise<void> {
  const day = londonToday();
  await getPrisma().photoMeasureDay.updateMany({
    where: { ...tenantWhere(businessId), day, count: { gt: 0 } },
    data: { count: { decrement: 1 } },
  });
}

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object" || !("text" in part)) return "";
      return String((part as { text?: unknown }).text ?? "");
    })
    .join("");
}

async function readModel(input: {
  images: Buffer[];
  typeKey: string;
  typeTitle: string;
  place: string;
  knownMeasurement: string;
}): Promise<PhotoEstimate | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const known = input.knownMeasurement.trim().slice(0, 120);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: visionModel(),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You measure plastering jobs from site photos. Reply in metres.",
            "place is wall for one elevation and room for an enclosed room.",
            "Use the known measurement as the scale. If none is given, assume a UK ceiling of 2.4m, or a standard door of 1.98m by 0.76m when one is visible.",
            "lengthM and widthM are the floor. heightM is floor to ceiling. For one wall, lengthM is the wall length, widthM is 0 and heightM is the wall height.",
            "wallAreaM2 is the wall area before openings. ceilingAreaM2 is 0 for a single wall.",
            "List doors and windows you can see, width then height.",
            "netPlasterM2 is the walls plus the ceiling, minus openings. A single wall has no ceiling.",
            "revealsM is the metres of opening reveal: both jambs and the head, and the sill on a window.",
            "angleBeadM is metres of angle bead, usually 2.4m per external corner, including two per opening.",
            "stopBeadM is metres of stop bead. Use 0 when you cannot see a stop.",
            "confidence is low when the scale is a guess.",
            "notes is one or two short sentences for the plasterer. No prices.",
            photoMeasureInstruction(input.typeKey, input.typeTitle),
          ].join(" "),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${photoMeasureInstruction(input.typeKey, input.typeTitle)} Measure this as a ${input.place}. Known measurement: ${known || "none"}.`,
            },
            ...input.images.map((image) => ({
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image.toString("base64")}`, detail: "high" },
            })),
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "photo_measure",
          strict: true,
          schema: photoEstimateRequestSchema(input.typeKey, input.typeTitle),
        },
      },
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  return parsePhotoEstimateJson(messageText(payload.choices?.[0]?.message?.content));
}

export async function measureFromPhotos(input: {
  businessId: string;
  jobId: string;
  sectionId: string;
  typeKey: string;
  typeTitle: string;
  place: string;
  knownMeasurement: string;
  images: Buffer[];
}): Promise<PhotoMeasureResult> {
  if (input.images.length < 1 || input.images.length > PHOTO_MEASURE_MAX_PHOTOS) {
    return { ok: false, reason: "bad-photo" };
  }
  if (input.images.some((image) => image.length > PHOTO_MEASURE_MAX_BYTES || !isJpeg(image))) {
    return { ok: false, reason: "bad-photo" };
  }
  const section = await getPrisma().jobSection.findFirst({
    where: { id: input.sectionId, jobId: input.jobId, ...tenantWhere(input.businessId) },
    select: { id: true, typeKey: true, title: true },
  });
  if (!section) return { ok: false, reason: "missing" };
  const typeKey = section.typeKey || input.typeKey;
  const typeTitle = section.title || input.typeTitle;

  if (process.env.PHOTO_MEASURE_FIXTURE === "1") {
    return { ok: true, estimate: PHOTO_MEASURE_FIXTURE };
  }
  if (!photoMeasureReady() || !process.env.OPENAI_API_KEY?.trim()) {
    return { ok: false, reason: "not-configured" };
  }

  const allowed = await takeSlot(input.businessId);
  if (!allowed) return { ok: false, reason: "limit" };
  try {
    const estimate = await readModel({
      images: input.images,
      typeKey,
      typeTitle,
      place: input.place,
      knownMeasurement: input.knownMeasurement,
    });
    if (!estimate) {
      await releaseSlot(input.businessId);
      return { ok: false, reason: "failed" };
    }
    return { ok: true, estimate };
  } catch {
    await releaseSlot(input.businessId);
    return { ok: false, reason: "failed" };
  }
}
