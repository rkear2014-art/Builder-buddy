import { isInternalCrewName } from "./crew";
import { formatM2, roomAreas, type RoomInput } from "./measure";
import { normaliseQuantity } from "./materials";

export type QuoteRoomLine = {
  name: string;
  size: string;
  areas: string;
};

export type QuoteMaterialInput = {
  name: string;
  quantity: string;
  unit: string;
};

function formatMetres(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString("en-GB", { maximumFractionDigits: 2 })} m`;
}

function areaBit(label: string, squareMetres: number, afterOpenings: boolean): string {
  const amount = formatM2(squareMetres);
  return afterOpenings ? `${label} ${amount} after doors and windows` : `${label} ${amount}`;
}

/** One room from the calculator: size, then wall and ceiling area after openings. */
export function quoteRoomLine(room: RoomInput): QuoteRoomLine | null {
  const name = room.name.trim() || "Room";
  const measured = roomAreas(room);
  const afterOpenings = measured.deductionsM2 > 0;
  const size =
    room.mode === "direct"
      ? ""
      : [formatMetres(room.lengthM), formatMetres(room.widthM), formatMetres(room.heightM)].filter(Boolean).join(" × ");
  const bits: string[] = [];
  if (room.mode === "floor") {
    if (measured.floorM2 > 0) bits.push(areaBit("Floor", measured.floorM2, afterOpenings));
  } else if (room.mode === "elevation") {
    if (measured.wallM2 > 0) bits.push(areaBit("Walls", measured.wallM2, afterOpenings));
  } else if (room.mode === "direct") {
    if (measured.netM2 > 0) bits.push(areaBit("Area", measured.netM2, false));
  } else {
    if (room.includeWalls && measured.wallM2 > 0) bits.push(areaBit("Walls", measured.wallM2, afterOpenings));
    if (room.includeCeiling && measured.ceilingM2 > 0) bits.push(areaBit("Ceiling", measured.ceilingM2, false));
  }
  if (!size && bits.length === 0) return null;
  return { name, size, areas: bits.join(" · ") };
}

/**
 * Customer material line. Quantity only: "Multi-finish plaster 25kg x 6".
 * Unit prices and trade costs are never included.
 */
export function materialQuantityLabel(input: QuoteMaterialInput): string | null {
  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name || isInternalCrewName(name)) return null;
  let quantity = "";
  try {
    quantity = normaliseQuantity(input.quantity);
  } catch {
    quantity = input.quantity.trim();
  }
  if (!quantity || quantity === "0") return name;
  return `${name} x ${quantity}`;
}

export function roomInputFromStored(room: {
  name: string;
  mode: string;
  lengthM: { toString(): string } | number | null;
  widthM: { toString(): string } | number | null;
  heightM: { toString(): string } | number | null;
  includeWalls: boolean;
  includeCeiling: boolean;
  directAreaM2: { toString(): string } | number | null;
  doorCount: number;
  doorAreaM2: { toString(): string } | number;
  windowCount: number;
  windowAreaM2: { toString(): string } | number;
  externalCorners: number;
  stopBeadM: { toString(): string } | number | null;
}): RoomInput {
  const number = (value: { toString(): string } | number | null, fallback: number) => {
    if (value == null) return fallback;
    const parsed = Number(typeof value === "number" ? value : value.toString());
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const mode = room.mode === "elevation" || room.mode === "floor" || room.mode === "direct" ? room.mode : "room";
  return {
    name: room.name,
    mode,
    lengthM: number(room.lengthM, 0),
    widthM: number(room.widthM, 0),
    heightM: number(room.heightM, 2.4),
    includeWalls: room.includeWalls,
    includeCeiling: room.includeCeiling,
    directAreaM2: number(room.directAreaM2, 0),
    doorCount: room.doorCount,
    doorAreaM2: number(room.doorAreaM2, 1.9),
    windowCount: room.windowCount,
    windowAreaM2: number(room.windowAreaM2, 1.5),
    externalCorners: room.externalCorners,
    stopBeadM: number(room.stopBeadM, 0),
  };
}

export function customerQuoteSections(input: {
  show: boolean;
  /** A whole-job price keeps the money as one total, so the material list stays off. */
  wholeJob?: boolean;
  rooms: RoomInput[];
  materials: QuoteMaterialInput[];
}): { rooms: QuoteRoomLine[]; materials: string[] } {
  if (!input.show) return { rooms: [], materials: [] };
  return {
    rooms: input.rooms.flatMap((room) => {
      const line = quoteRoomLine(room);
      return line ? [line] : [];
    }),
    materials: input.wholeJob
      ? []
      : input.materials.flatMap((line) => {
          const label = materialQuantityLabel(line);
          return label ? [label] : [];
        }),
  };
}

/** Plain text for the quote email. Empty when both sections are hidden. */
export function quoteBreakdownText(sections: { rooms: QuoteRoomLine[]; materials: string[] }): string {
  const blocks: string[] = [];
  if (sections.rooms.length > 0) {
    blocks.push(
      [
        "Rooms",
        ...sections.rooms.map((room) => [room.name, room.size, room.areas].filter(Boolean).join("\n")),
      ].join("\n"),
    );
  }
  if (sections.materials.length > 0) {
    blocks.push(["Materials", ...sections.materials].join("\n"));
  }
  return blocks.join("\n\n");
}
