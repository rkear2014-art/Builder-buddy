"use client";

import { useMemo, useState } from "react";
import { formatPence } from "@/lib/money";
import {
  DEFAULT_CEILING_HEIGHT_M,
  DEFAULT_DOOR_M2,
  DEFAULT_WINDOW_M2,
  DEFAULT_WASTAGE_PERCENT,
  formatM2,
  quoteFromMeasure,
  type MeasureMaterial,
  type MeasureMode,
  type RoomInput,
} from "@/lib/measure";
import { saveMeasuredQuote } from "@/server/actions/measure";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";

const MODES: Array<{ id: MeasureMode; label: string }> = [
  { id: "room", label: "Room" },
  { id: "elevation", label: "Wall" },
  { id: "floor", label: "Floor" },
  { id: "direct", label: "Type m²" },
];

function blankRoom(name: string, mode: MeasureMode, includeWalls: boolean, includeCeiling: boolean): RoomInput {
  return {
    name,
    mode,
    lengthM: 0,
    widthM: 0,
    heightM: DEFAULT_CEILING_HEIGHT_M,
    includeWalls,
    includeCeiling,
    directAreaM2: 0,
    doorCount: 0,
    doorAreaM2: DEFAULT_DOOR_M2,
    windowCount: 0,
    windowAreaM2: DEFAULT_WINDOW_M2,
  };
}

function nextName(count: number): string {
  if (count === 0) return "Living room";
  return `Bedroom ${count}`;
}

export function MeasureForm({
  jobId,
  typeKey,
  typeName,
  accent,
  accentInk,
  materials,
  wastagePercent,
  labourPerM2Pence,
  initialRooms,
  initialDayRate,
  initialDayCount,
  defaults,
}: {
  jobId: string;
  typeKey: string;
  typeName: string;
  accent: string;
  accentInk: string;
  materials: MeasureMaterial[];
  wastagePercent: number;
  labourPerM2Pence: number | null;
  initialRooms: RoomInput[];
  initialDayRate: string;
  initialDayCount: string;
  defaults: { mode: MeasureMode; includeWalls: boolean; includeCeiling: boolean };
}) {
  const [rooms, setRooms] = useState<RoomInput[]>(
    initialRooms.length > 0 ? initialRooms : [blankRoom("Living room", defaults.mode, defaults.includeWalls, defaults.includeCeiling)],
  );
  const [wastage, setWastage] = useState(String(wastagePercent || DEFAULT_WASTAGE_PERCENT));
  const [dayRate, setDayRate] = useState(initialDayRate);
  const [dayCount, setDayCount] = useState(initialDayCount);
  const wastageNumber = /^\d{1,3}$/.test(wastage) ? Math.min(100, Number(wastage)) : DEFAULT_WASTAGE_PERCENT;
  const dayRatePence = dayRate.trim() ? Math.round(Number(dayRate) * 100) : null;
  const dayCountNumber = dayCount.trim() ? Number(dayCount) : null;

  const quote = useMemo(
    () =>
      quoteFromMeasure({
        rooms,
        materials,
        wastagePercent: wastageNumber,
        labourPerM2Pence,
        dayRatePence: dayRatePence != null && Number.isFinite(dayRatePence) ? dayRatePence : null,
        dayCount: dayCountNumber != null && Number.isFinite(dayCountNumber) ? dayCountNumber : null,
      }),
    [rooms, materials, wastageNumber, labourPerM2Pence, dayRatePence, dayCountNumber],
  );

  function update(index: number, patch: Partial<RoomInput>) {
    setRooms((current) => current.map((room, roomIndex) => (roomIndex === index ? { ...room, ...patch } : room)));
  }

  return (
    <div className="grid gap-4">
      {rooms.map((room, index) => {
        const areas = quote.rooms[index];
        return (
          <section key={`${room.name}-${index}`} className="card grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="field min-w-48 flex-1">
                Room
                <input value={room.name} onChange={(event) => update(index, { name: event.target.value })} />
              </label>
              {rooms.length > 1 ? (
                <button type="button" className="btn btn-secondary" onClick={() => setRooms((current) => current.filter((_, roomIndex) => roomIndex !== index))}>
                  Remove room
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className="btn"
                  aria-pressed={room.mode === mode.id}
                  style={room.mode === mode.id ? { background: accent, color: accentInk } : undefined}
                  onClick={() => update(index, { mode: mode.id })}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {room.mode === "direct" ? (
              <label className="field">
                Area
                <span>Type the m². Doors and windows are already taken off.</span>
                <input inputMode="decimal" value={room.directAreaM2 || ""} placeholder="32" onChange={(event) => update(index, { directAreaM2: Number(event.target.value) || 0 })} />
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="field">
                  Length (m)
                  <input inputMode="decimal" value={room.lengthM || ""} placeholder="6" onChange={(event) => update(index, { lengthM: Number(event.target.value) || 0 })} />
                </label>
                {room.mode === "elevation" ? null : (
                  <label className="field">
                    Width (m)
                    <input inputMode="decimal" value={room.widthM || ""} placeholder="4" onChange={(event) => update(index, { widthM: Number(event.target.value) || 0 })} />
                  </label>
                )}
                {room.mode === "floor" ? null : (
                  <label className="field">
                    {room.mode === "elevation" ? "Height (m)" : "Ceiling height (m)"}
                    <input inputMode="decimal" value={room.heightM || ""} placeholder="2.4" onChange={(event) => update(index, { heightM: Number(event.target.value) || 0 })} />
                  </label>
                )}
              </div>
            )}
            {room.mode === "room" ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn" aria-pressed={room.includeWalls} style={room.includeWalls ? { background: accent, color: accentInk } : undefined} onClick={() => update(index, { includeWalls: !room.includeWalls })}>
                  Walls {areas ? formatM2(areas.wallM2) : ""}
                </button>
                <button type="button" className="btn" aria-pressed={room.includeCeiling} style={room.includeCeiling ? { background: accent, color: accentInk } : undefined} onClick={() => update(index, { includeCeiling: !room.includeCeiling })}>
                  Ceiling {areas ? formatM2(areas.ceilingM2) : ""}
                </button>
              </div>
            ) : null}
            {room.mode === "direct" ? null : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  Doors
                  <span>Each door is taken off at this size. 1.9 m² is a standard door.</span>
                  <input inputMode="decimal" value={room.doorCount || ""} placeholder="0" onChange={(event) => update(index, { doorCount: Number(event.target.value) || 0 })} />
                </label>
                <label className="field">
                  Door size (m²)
                  <input inputMode="decimal" value={room.doorAreaM2 || ""} onChange={(event) => update(index, { doorAreaM2: Number(event.target.value) || 0 })} />
                </label>
                <label className="field">
                  Windows
                  <span>1.5 m² is a useful starting size.</span>
                  <input inputMode="decimal" value={room.windowCount || ""} placeholder="0" onChange={(event) => update(index, { windowCount: Number(event.target.value) || 0 })} />
                </label>
                <label className="field">
                  Window size (m²)
                  <input inputMode="decimal" value={room.windowAreaM2 || ""} onChange={(event) => update(index, { windowAreaM2: Number(event.target.value) || 0 })} />
                </label>
              </div>
            )}
            <p className="font-display text-3xl">{areas ? formatM2(areas.netM2) : ""}</p>
            {areas && areas.deductionsM2 > 0 ? <p className="text-stone">Taken off: {formatM2(areas.deductionsM2)}</p> : null}
          </section>
        );
      })}

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setRooms((current) => [...current, blankRoom(nextName(current.length), defaults.mode, defaults.includeWalls, defaults.includeCeiling)])}
      >
        Add a room
      </button>

      <section className="card grid gap-3">
        <h2 className="font-display text-3xl">Materials</h2>
        <p className="font-display text-4xl">{formatM2(quote.totalM2)} in total</p>
        <ul className="grid gap-1 text-stone">
          {rooms.map((room, index) => (
            <li key={`total-${index}`}>
              {room.name || "Room"} · {formatM2(quote.rooms[index]?.netM2 ?? 0)}
            </li>
          ))}
        </ul>
        <label className="field">
          Wastage %
          <span>Added before bags, sheets and rolls are rounded up. 10% is the usual. You can change the business default on the Business page.</span>
          <input inputMode="decimal" value={wastage} onChange={(event) => setWastage(event.target.value)} />
        </label>
        <p className="text-stone">
          {labourPerM2Pence == null
            ? "No labour price per m² for this job type yet. Set one in Library or on the Business page. It is left blank until you do."
            : `Labour is ${formatPence(labourPerM2Pence)} per m².`}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">
            Day rate (£)
            <span>Optional. Added as its own line.</span>
            <input inputMode="decimal" value={dayRate} placeholder="180" onChange={(event) => setDayRate(event.target.value)} />
          </label>
          <label className="field">
            Days
            <input inputMode="decimal" value={dayCount} placeholder="1" onChange={(event) => setDayCount(event.target.value)} />
          </label>
        </div>
        <ul className="grid gap-3">
          {quote.lines.map((line) => (
            <li key={`${line.name}-${line.unit}`} className="border-b border-line pb-3">
              <p className="text-lg font-bold">{line.name}</p>
              {line.quantity ? (
                <p>
                  {line.quantity} {line.unit}
                  {line.unitPricePence == null ? "" : ` · ${formatPence(line.unitPricePence)}`}
                  {line.lineTotalPence == null ? "" : ` · ${formatPence(line.lineTotalPence)}`}
                </p>
              ) : (
                <p className="text-stone">{line.note}</p>
              )}
              {line.quantity && line.note ? <p className="font-bold text-clay">{line.note}</p> : null}
            </li>
          ))}
        </ul>
        <p className="font-display text-4xl">{formatPence(quote.totalPence)}</p>
        {quote.unpricedCount > 0 ? (
          <p className="font-bold text-clay">
            {quote.unpricedCount} {quote.unpricedCount === 1 ? "material has" : "materials have"} no price. The total leaves those out.
          </p>
        ) : null}
        <InlineForm action={saveMeasuredQuote} className="grid gap-3">
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="typeKey" value={typeKey} />
          <input type="hidden" name="typeName" value={typeName} />
          <input type="hidden" name="rooms" value={JSON.stringify(rooms)} />
          <input type="hidden" name="wastagePercent" value={wastage} />
          <input type="hidden" name="dayRate" value={dayRate} />
          <input type="hidden" name="dayCount" value={dayCount} />
          <SubmitButton>Add to quote</SubmitButton>
          <p className="text-sm text-stone">This replaces the lines this calculator added last time. Lines you typed yourself stay, and you can still change any quantity on the job.</p>
        </InlineForm>
      </section>
    </div>
  );
}
