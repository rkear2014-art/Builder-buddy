import { customerLineTotalPence } from "./materials";
import { coverageBasisLabel, type CoverageBasis } from "./coverage";

export const DEFAULT_CEILING_HEIGHT_M = 2.4;
export const DEFAULT_DOOR_M2 = 1.9;
export const DEFAULT_WINDOW_M2 = 1.5;
export const DEFAULT_WASTAGE_PERCENT = 10;

export type MeasureMode = "room" | "elevation" | "floor" | "direct";

export type RoomInput = {
  name: string;
  mode: MeasureMode;
  lengthM: number;
  widthM: number;
  heightM: number;
  includeWalls: boolean;
  includeCeiling: boolean;
  directAreaM2: number;
  doorCount: number;
  doorAreaM2: number;
  windowCount: number;
  windowAreaM2: number;
  /** Extra external corners, on top of two per door or window reveal. */
  externalCorners: number;
  /** Metres of stop bead. A plain room stays at 0. */
  stopBeadM: number;
};

export type RoomAreas = {
  wallM2: number;
  ceilingM2: number;
  floorM2: number;
  netM2: number;
  perimeterM: number;
  corners: number;
  deductionsM2: number;
};

export type MeasureMaterial = {
  name: string;
  unit: string;
  unitPricePence: number | null;
  coverage: { basis: CoverageBasis; perUnit: number } | null;
};

export type MeasureLine = {
  name: string;
  unit: string;
  quantity: string | null;
  unitPricePence: number | null;
  lineTotalPence: number | null;
  note: string | null;
};

export type MeasureQuote = {
  rooms: RoomAreas[];
  totalM2: number;
  perimeterM: number;
  corners: number;
  lines: MeasureLine[];
  totalPence: number;
  unpricedCount: number;
};

export function measureDefaults(typeKey: string): {
  mode: MeasureMode;
  includeWalls: boolean;
  includeCeiling: boolean;
} {
  if (typeKey === "plaster-render" || typeKey === "plaster-stud-wall") {
    return { mode: "elevation", includeWalls: true, includeCeiling: false };
  }
  if (typeKey === "plaster-screed") return { mode: "floor", includeWalls: false, includeCeiling: false };
  if (typeKey === "plaster-artex" || typeKey === "plaster-coving" || typeKey === "plaster-cornice") {
    return { mode: "room", includeWalls: false, includeCeiling: true };
  }
  if (
    typeKey === "plaster-dry-lining" ||
    typeKey === "plaster-wire-mesh" ||
    typeKey === "plaster-tape-joint"
  ) {
    return { mode: "room", includeWalls: true, includeCeiling: false };
  }
  return { mode: "room", includeWalls: true, includeCeiling: true };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function externalCornerCount(room: RoomInput): number {
  const typed = Math.min(40, Math.round(nonNegative(room.externalCorners)));
  if (room.mode === "floor" || room.mode === "direct") return typed;
  const openings = Math.min(20, Math.round(nonNegative(room.doorCount))) + Math.min(40, Math.round(nonNegative(room.windowCount)));
  return typed + openings * 2;
}

function isStopBead(name: string): boolean {
  return name.trim().toLowerCase() === "stop bead";
}

export function roomAreas(room: RoomInput): RoomAreas {
  const doorM2 = nonNegative(room.doorCount) * nonNegative(room.doorAreaM2);
  const windowM2 = nonNegative(room.windowCount) * nonNegative(room.windowAreaM2);
  const openings = round2(doorM2 + windowM2);
  const length = nonNegative(room.lengthM);
  const width = nonNegative(room.widthM);
  const height = nonNegative(room.heightM);

  if (room.mode === "direct") {
    const net = round2(nonNegative(room.directAreaM2));
    return { wallM2: 0, ceilingM2: 0, floorM2: 0, netM2: net, perimeterM: 0, corners: externalCornerCount(room), deductionsM2: 0 };
  }

  if (room.mode === "elevation") {
    const gross = round2(length * height);
    const deducted = Math.min(openings, gross);
    return {
      wallM2: round2(gross - deducted),
      ceilingM2: 0,
      floorM2: 0,
      netM2: round2(gross - deducted),
      perimeterM: round2(length),
      corners: externalCornerCount(room),
      deductionsM2: deducted,
    };
  }

  if (room.mode === "floor") {
    const floor = round2(length * width);
    const deducted = Math.min(openings, floor);
    return {
      wallM2: 0,
      ceilingM2: 0,
      floorM2: round2(floor - deducted),
      netM2: round2(floor - deducted),
      perimeterM: round2(2 * (length + width)),
      corners: externalCornerCount(room),
      deductionsM2: deducted,
    };
  }

  const wallGross = round2(2 * (length + width) * height);
  const ceiling = round2(length * width);
  const deducted = room.includeWalls ? Math.min(openings, wallGross) : 0;
  const wallNet = round2(wallGross - deducted);
  const net = round2((room.includeWalls ? wallNet : 0) + (room.includeCeiling ? ceiling : 0));
  return {
    wallM2: room.includeWalls ? wallNet : wallGross,
    ceilingM2: ceiling,
    floorM2: ceiling,
    netM2: net,
    perimeterM: round2(2 * (length + width)),
    corners: externalCornerCount(room),
    deductionsM2: deducted,
  };
}

export function roundsUp(unit: string): boolean {
  const value = unit.trim().toLowerCase();
  if (["bag", "sheet", "roll", "box", "length", "tube", "each"].includes(value)) return true;
  return /tub|bucket|cartridge|bag/.test(value);
}

export function quantityForQuote(raw: number, roundUp: boolean): string | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  if (roundUp) {
    const units = Math.ceil(raw - 1e-9);
    return units > 0 ? String(units) : null;
  }
  const hundredths = Math.round(raw * 100);
  if (hundredths <= 0) return null;
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

function basisAmount(areas: { netM2: number; perimeterM: number; corners: number }, basis: CoverageBasis): number {
  if (basis === "perimeter") return areas.perimeterM;
  if (basis === "corners") return areas.corners;
  return areas.netM2;
}

export function quoteFromMeasure(input: {
  rooms: RoomInput[];
  materials: MeasureMaterial[];
  wastagePercent: number;
  labourPerM2Pence: number | null;
  dayRatePence: number | null;
  dayCount: number | null;
  /** When set, only these line names are added into the total. */
  included?: readonly string[] | null;
}): MeasureQuote {
  const rooms = input.rooms.map(roomAreas);
  const totalM2 = round2(rooms.reduce((sum, room) => sum + room.netM2, 0));
  const perimeterM = round2(rooms.reduce((sum, room) => sum + room.perimeterM, 0));
  const corners = rooms.reduce((sum, room) => sum + room.corners, 0);
  const stopBeadM = round2(input.rooms.reduce((sum, room) => sum + nonNegative(room.stopBeadM), 0));
  const wastage = Number.isFinite(input.wastagePercent) ? Math.min(100, Math.max(0, input.wastagePercent)) : 0;
  const factor = 1 + wastage / 100;
  const totals = { netM2: totalM2, perimeterM, corners, stopBeadM };
  const counted = input.included == null ? null : new Set(input.included);
  const lines: MeasureLine[] = [];

  for (const material of input.materials) {
    if (!material.coverage || material.coverage.perUnit <= 0) {
      lines.push({
        name: material.name,
        unit: material.unit,
        quantity: null,
        unitPricePence: material.unitPricePence,
        lineTotalPence: null,
        note: "No coverage set. Add it in Library, or type this line on the job.",
      });
      continue;
    }
    const amount = isStopBead(material.name) ? totals.stopBeadM : basisAmount(totals, material.coverage.basis);
    if (amount <= 0) {
      const needs = isStopBead(material.name)
        ? "No stop bead metres yet. A plain room often needs none."
        : material.coverage.basis === "corners"
          ? "No external corners yet. A plain room has none. Each door or window reveal adds two."
          : material.coverage.basis === "area"
            ? "This needs an area. Measure a room or type the m²."
            : `This is worked out from ${coverageBasisLabel(material.coverage.basis)}. Type the m² on its own does not include that.`;
      lines.push({
        name: material.name,
        unit: material.unit,
        quantity: null,
        unitPricePence: material.unitPricePence,
        lineTotalPence: null,
        note: needs,
      });
      continue;
    }
    const raw = (amount / material.coverage.perUnit) * factor;
    const quantity = quantityForQuote(raw, roundsUp(material.unit));
    const lineTotalPence =
      quantity == null ? null : customerLineTotalPence({ quantity, unitPricePence: material.unitPricePence });
    lines.push({
      name: material.name,
      unit: material.unit,
      quantity,
      unitPricePence: material.unitPricePence,
      lineTotalPence,
      note: material.unitPricePence == null ? "No price" : null,
    });
  }

  if (input.labourPerM2Pence != null && totalM2 > 0) {
    const quantity = quantityForQuote(totalM2, false);
    lines.push({
      name: "Labour",
      unit: "m²",
      quantity,
      unitPricePence: input.labourPerM2Pence,
      lineTotalPence: quantity ? customerLineTotalPence({ quantity, unitPricePence: input.labourPerM2Pence }) : null,
      note: null,
    });
  }

  if (input.dayRatePence != null && input.dayRatePence > 0 && input.dayCount != null && input.dayCount > 0) {
    const quantity = quantityForQuote(input.dayCount, false);
    lines.push({
      name: "Labour, day rate",
      unit: "day",
      quantity,
      unitPricePence: input.dayRatePence,
      lineTotalPence: quantity ? customerLineTotalPence({ quantity, unitPricePence: input.dayRatePence }) : null,
      note: null,
    });
  }

  let totalPence = 0;
  let unpricedCount = 0;
  for (const line of lines) {
    if (counted && !counted.has(line.name)) continue;
    if (line.quantity == null) continue;
    if (line.lineTotalPence == null) {
      unpricedCount += 1;
      continue;
    }
    totalPence += line.lineTotalPence;
  }

  return { rooms, totalM2, perimeterM, corners, lines, totalPence, unpricedCount };
}

export function formatM2(value: number): string {
  return `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })} m²`;
}

const MODES = new Set<MeasureMode>(["room", "elevation", "floor", "direct"]);

function readNumber(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number) || number < 0 || number > 10000) return fallback;
  return number;
}

export function parseRoomInputs(value: unknown): RoomInput[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;
  const rooms: RoomInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const mode = typeof row.mode === "string" && MODES.has(row.mode as MeasureMode) ? (row.mode as MeasureMode) : null;
    if (!mode) return null;
    const name = typeof row.name === "string" ? row.name.trim().slice(0, 40) : "";
    rooms.push({
      name: name || "Room",
      mode,
      lengthM: readNumber(row.lengthM, 0),
      widthM: readNumber(row.widthM, 0),
      heightM: readNumber(row.heightM, DEFAULT_CEILING_HEIGHT_M),
      includeWalls: row.includeWalls === true,
      includeCeiling: row.includeCeiling === true,
      directAreaM2: readNumber(row.directAreaM2, 0),
      doorCount: Math.min(20, Math.round(readNumber(row.doorCount, 0))),
      doorAreaM2: readNumber(row.doorAreaM2, DEFAULT_DOOR_M2),
      windowCount: Math.min(40, Math.round(readNumber(row.windowCount, 0))),
      windowAreaM2: readNumber(row.windowAreaM2, DEFAULT_WINDOW_M2),
      externalCorners: Math.min(40, Math.round(readNumber(row.externalCorners, 0))),
      stopBeadM: readNumber(row.stopBeadM, 0),
    });
  }
  return rooms;
}

export function parseWastagePercent(raw: string, fallback = DEFAULT_WASTAGE_PERCENT): { ok: true; percent: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, percent: fallback };
  if (!/^\d{1,3}$/.test(trimmed)) return { ok: false, error: "Enter wastage as a whole number, such as 10." };
  const percent = Number(trimmed);
  if (percent > 100) return { ok: false, error: "Enter wastage from 0 to 100." };
  return { ok: true, percent };
}
