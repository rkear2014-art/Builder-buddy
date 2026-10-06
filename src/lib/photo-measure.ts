import { z } from "zod";
import { starterCoverage } from "./coverage";
import {
  DEFAULT_CEILING_HEIGHT_M,
  DEFAULT_DOOR_M2,
  DEFAULT_WINDOW_M2,
  measureDefaults,
  quantityForQuote,
  quoteFromMeasure,
  roomAreas,
  type MeasureMode,
  type RoomInput,
} from "./measure";
import { defaultChoices, materialsForChoices, measurePlanFor, starterMeasureMaterials } from "./measure-plan";
import { isExteriorMeasure } from "./room-names";

export const PHOTO_MEASURE_DAILY_LIMIT = 30;
export const PHOTO_MEASURE_MAX_PHOTOS = 4;
export const PHOTO_MEASURE_MAX_BYTES = 4 * 1024 * 1024;
export const DEFAULT_VISION_MODEL = "gpt-4o";
export const PHOTO_MEASURE_NOT_READY = "AI photo measuring isn't switched on yet";

const openingSchema = z.object({
  kind: z.enum(["door", "window"]),
  widthM: z.number().finite().min(0).max(10),
  heightM: z.number().finite().min(0).max(10),
});

export const photoEstimateSchema = z.object({
  place: z.enum(["room", "wall"]),
  name: z.string().max(40),
  lengthM: z.number().finite().min(0).max(80),
  widthM: z.number().finite().min(0).max(80),
  heightM: z.number().finite().min(0).max(20),
  wallAreaM2: z.number().finite().min(0).max(2000),
  ceilingAreaM2: z.number().finite().min(0).max(2000),
  openings: z.array(openingSchema).max(20),
  netPlasterM2: z.number().finite().min(0).max(2000),
  revealsM: z.number().finite().min(0).max(200),
  angleBeadM: z.number().finite().min(0).max(200),
  stopBeadM: z.number().finite().min(0).max(200),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z.string().max(500),
});

export type PhotoEstimate = z.infer<typeof photoEstimateSchema>;
export type PhotoOpening = z.infer<typeof openingSchema>;

export const photoDraftSchema = z.object({
  name: z.string().trim().max(40),
  lengthM: z.number().finite().min(0).max(80),
  widthM: z.number().finite().min(0).max(80),
  heightM: z.number().finite().min(0).max(20),
  openings: z.array(openingSchema).max(20),
  stopBeadM: z.number().finite().min(0).max(200),
  angleBeadM: z.number().finite().min(0).max(200),
  materials: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        unit: z.string().trim().min(1).max(40),
        quantity: z.string().regex(/^\d{1,4}(\.\d{1,2})?$/),
      }),
    )
    .max(40),
});

export type PhotoDraft = z.infer<typeof photoDraftSchema>;

export type PhotoMaterialLine = {
  name: string;
  unit: string;
  quantity: string;
  unitPricePence: number | null;
};

/** Sent to OpenAI structured outputs. Zod checks the reply before it is shown. */
export const PHOTO_ESTIMATE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    place: { type: "string", enum: ["room", "wall"] },
    name: { type: "string" },
    lengthM: { type: "number" },
    widthM: { type: "number" },
    heightM: { type: "number" },
    wallAreaM2: { type: "number" },
    ceilingAreaM2: { type: "number" },
    openings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: { type: "string", enum: ["door", "window"] },
          widthM: { type: "number" },
          heightM: { type: "number" },
        },
        required: ["kind", "widthM", "heightM"],
      },
    },
    netPlasterM2: { type: "number" },
    revealsM: { type: "number" },
    angleBeadM: { type: "number" },
    stopBeadM: { type: "number" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    notes: { type: "string" },
  },
  required: [
    "place",
    "name",
    "lengthM",
    "widthM",
    "heightM",
    "wallAreaM2",
    "ceilingAreaM2",
    "openings",
    "netPlasterM2",
    "revealsM",
    "angleBeadM",
    "stopBeadM",
    "confidence",
    "notes",
  ],
} as const;

/**
 * A lounge a plasterer would recognise. Used when PHOTO_MEASURE_FIXTURE=1,
 * so screenshots and local checks never call the model.
 */
export const PHOTO_MEASURE_FIXTURE: PhotoEstimate = {
  place: "room",
  name: "Lounge",
  lengthM: 4.2,
  widthM: 3.6,
  heightM: 2.4,
  wallAreaM2: 37.44,
  ceilingAreaM2: 15.12,
  openings: [
    { kind: "door", widthM: 0.76, heightM: 1.98 },
    { kind: "window", widthM: 1.2, heightM: 1.05 },
  ],
  netPlasterM2: 49.8,
  revealsM: 9.22,
  angleBeadM: 9.6,
  stopBeadM: 0,
  confidence: "medium",
  notes: "Scaled from a 2.4m ceiling. The door looks like a standard 1.98m by 0.76m. Check the window width on site.",
};

export function photoMeasureReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim()) || env.PHOTO_MEASURE_FIXTURE === "1";
}

export function visionModel(env: NodeJS.ProcessEnv = process.env): string {
  const model = env.OPENAI_VISION_MODEL?.trim();
  return model || DEFAULT_VISION_MODEL;
}

export function parsePhotoEstimate(value: unknown): PhotoEstimate | null {
  const parsed = photoEstimateSchema.safeParse(value);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    name: parsed.data.name.trim().slice(0, 40),
    notes: parsed.data.notes.trim().slice(0, 500),
  };
}

export function parsePhotoEstimateJson(text: string): PhotoEstimate | null {
  try {
    return parsePhotoEstimate(JSON.parse(text));
  } catch {
    return null;
  }
}

export function placeForJob(typeKey: string, typeTitle: string): "room" | "wall" {
  return isExteriorMeasure(typeKey, typeTitle) ? "wall" : "room";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function averageArea(items: PhotoOpening[], fallback: number): number {
  if (items.length === 0) return fallback;
  const total = items.reduce((sum, item) => sum + item.widthM * item.heightM, 0);
  const average = total / items.length;
  if (!Number.isFinite(average) || average <= 0) return fallback;
  return round2(average);
}

/** Metres of reveal: both jambs and the head, plus the sill on a window. */
export function revealsLengthM(openings: PhotoOpening[]): number {
  const total = openings.reduce((sum, opening) => {
    if (opening.kind === "door") return sum + 2 * opening.heightM + opening.widthM;
    return sum + 2 * (opening.widthM + opening.heightM);
  }, 0);
  return round2(total);
}

/**
 * Angle bead is sold as one length per external corner. Each opening already
 * adds two corners, so those are not counted again.
 */
export function externalCornersFromBead(angleBeadM: number, openingCount: number): number {
  const openings = Math.min(20, Math.max(0, Math.round(openingCount)));
  const fromOpenings = openings * 2;
  if (angleBeadM <= 0) return 0;
  const lengths = Math.ceil(angleBeadM / 2.4 - 1e-9);
  return Math.max(0, Math.min(40, lengths - fromOpenings));
}

export function roomFromPhotoMeasure(input: {
  typeKey: string;
  place: "room" | "wall";
  name: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  openings: PhotoOpening[];
  stopBeadM: number;
  angleBeadM: number;
}): RoomInput {
  const defaults = measureDefaults(input.typeKey);
  const wall = input.place === "wall" || defaults.mode === "elevation";
  const doors = input.openings.filter((opening) => opening.kind === "door");
  const windows = input.openings.filter((opening) => opening.kind === "window");
  const mode: MeasureMode = wall ? "elevation" : defaults.mode;
  const name = input.name.trim().slice(0, 40) || (wall ? "Wall" : "Room");
  return {
    name,
    mode,
    lengthM: round2(input.lengthM),
    widthM: wall || mode === "elevation" ? 0 : round2(input.widthM),
    heightM: round2(input.heightM > 0 ? input.heightM : DEFAULT_CEILING_HEIGHT_M),
    includeWalls: wall ? true : defaults.includeWalls,
    includeCeiling: wall ? false : defaults.includeCeiling,
    directAreaM2: 0,
    doorCount: doors.length,
    doorAreaM2: averageArea(doors, DEFAULT_DOOR_M2),
    windowCount: windows.length,
    windowAreaM2: averageArea(windows, DEFAULT_WINDOW_M2),
    externalCorners: externalCornersFromBead(input.angleBeadM, doors.length + windows.length),
    stopBeadM: round2(input.stopBeadM),
  };
}

export function materialsForPhotoRoom(input: {
  typeKey: string;
  room: RoomInput;
  wastagePercent: number;
}): PhotoMaterialLine[] {
  const starterId = input.typeKey.startsWith("template:") ? "" : input.typeKey;
  if (!starterId) return [];
  const plan = measurePlanFor(starterId);
  const excluded = new Set(plan.excludedByDefault);
  const chosen = materialsForChoices(starterMeasureMaterials(starterId), plan, defaultChoices(plan)).filter(
    (material) => !excluded.has(material.name) && material.coverage,
  );
  const withGuide = chosen.map((material) => {
    const guide = starterCoverage(starterId, material.name);
    return {
      ...material,
      coverage: guide ? { basis: guide.basis, perUnit: guide.perUnit } : material.coverage,
    };
  });
  const quote = quoteFromMeasure({
    rooms: [input.room],
    materials: withGuide,
    wastagePercent: input.wastagePercent,
    labourPerM2Pence: null,
    dayRatePence: null,
    dayCount: null,
  });
  return quote.lines.flatMap((line) =>
    line.quantity
      ? [{ name: line.name, unit: line.unit, quantity: line.quantity, unitPricePence: line.unitPricePence }]
      : [],
  );
}

export function addQuantity(current: string, extra: string): string {
  const sum = Number(current) + Number(extra);
  if (!Number.isFinite(sum) || sum <= 0) return extra;
  return quantityForQuote(sum, false) ?? extra;
}

export function photoAreas(room: RoomInput): { wallAreaM2: number; ceilingAreaM2: number; netPlasterM2: number } {
  const areas = roomAreas(room);
  return {
    wallAreaM2: areas.wallM2,
    ceilingAreaM2: areas.ceilingM2,
    netPlasterM2: areas.netM2,
  };
}
