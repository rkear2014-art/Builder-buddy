"use client";

import { useMemo, useState } from "react";
import type { CrewDraftRole, CrewRoleId } from "@/lib/crew";
import { formatPence, parsePoundsToPence } from "@/lib/money";
import {
  DEFAULT_CEILING_HEIGHT_M,
  DEFAULT_DOOR_M2,
  DEFAULT_WINDOW_M2,
  DEFAULT_WASTAGE_PERCENT,
  externalCornerCount,
  formatM2,
  quoteFromMeasure,
  type MeasureMaterial,
  type MeasureMode,
  type RoomInput,
} from "@/lib/measure";
import {
  defaultIncludedNames,
  materialsForChoices,
  type MeasurePlan,
} from "@/lib/measure-plan";
import { saveMeasuredQuote } from "@/server/actions/measure";
import { CrewEditor, CrewHiddenFields } from "@/components/crew-editor";
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
    externalCorners: 0,
    stopBeadM: 0,
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
  initialDays,
  initialRoles,
  defaults,
  plan,
  initialChoices,
  initialIncluded,
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
  initialDays: string;
  initialRoles: CrewDraftRole[];
  defaults: { mode: MeasureMode; includeWalls: boolean; includeCeiling: boolean };
  plan: MeasurePlan;
  initialChoices: Record<string, string>;
  initialIncluded: string[] | null;
}) {
  const [rooms, setRooms] = useState<RoomInput[]>(
    initialRooms.length > 0 ? initialRooms : [blankRoom("Living room", defaults.mode, defaults.includeWalls, defaults.includeCeiling)],
  );
  const [wastage, setWastage] = useState(String(wastagePercent || DEFAULT_WASTAGE_PERCENT));
  const [days, setDays] = useState(initialDays);
  const [roles, setRoles] = useState(initialRoles);
  const [choices, setChoices] = useState(initialChoices);
  const [included, setIncluded] = useState<string[]>(
    initialIncluded ?? defaultIncludedNames(materialsForChoices(materials, plan, initialChoices), plan),
  );
  const wastageNumber = /^\d{1,3}$/.test(wastage) ? Math.min(100, Number(wastage)) : DEFAULT_WASTAGE_PERCENT;
  const daysNumber = days.trim() && /^\d+(\.\d{1,2})?$/.test(days.trim()) ? Number(days) : null;

  function onRole(role: CrewRoleId, patch: Partial<CrewDraftRole>) {
    setRoles((current) => current.map((item) => (item.role === role ? { ...item, ...patch } : item)));
  }

  const activeMaterials = useMemo(() => materialsForChoices(materials, plan, choices), [materials, plan, choices]);
  const quote = useMemo(
    () =>
      quoteFromMeasure({
        rooms,
        materials: activeMaterials,
        wastagePercent: wastageNumber,
        labourPerM2Pence,
        dayRatePence: null,
        dayCount: null,
        crew: {
          days: daysNumber,
          roles: roles.map((role) => ({
            role: role.role,
            count: role.count,
            basis: role.basis,
            ratePence: (() => {
              const parsed = parsePoundsToPence(role.rate);
              return parsed.ok ? parsed.pence : null;
            })(),
          })),
        },
        included,
      }),
    [rooms, activeMaterials, wastageNumber, labourPerM2Pence, daysNumber, roles, included],
  );

  function choose(groupId: string, optionId: string) {
    const group = plan.groups.find((item) => item.id === groupId);
    if (!group) return;
    setChoices((current) => ({ ...current, [groupId]: optionId }));
    setIncluded((current) => {
      const next = new Set(current);
      for (const option of group.options) {
        if (option.materialName) next.delete(option.materialName);
      }
      const picked = group.options.find((option) => option.id === optionId);
      if (picked?.materialName) next.add(picked.materialName);
      return [...next];
    });
  }

  function toggleLine(name: string) {
    setIncluded((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

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
                <label className="field">
                  External corners
                  <span>Angle bead is for external corners only. A plain room has none. Each door or window reveal adds two on top of this number. Using {externalCornerCount(room)}.</span>
                  <input inputMode="numeric" value={room.externalCorners || ""} placeholder="0" onChange={(event) => update(index, { externalCorners: Number(event.target.value) || 0 })} />
                </label>
                <label className="field">
                  Stop bead (m)
                  <span>Leave this at 0 for a plain room. It is not the length of the walls.</span>
                  <input inputMode="decimal" value={room.stopBeadM || ""} placeholder="0" onChange={(event) => update(index, { stopBeadM: Number(event.target.value) || 0 })} />
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
        {plan.groups.map((group) => (
          <div key={group.id} className="grid gap-2">
            <p className="font-extrabold">{group.label}</p>
            <div className="grid grid-cols-3 gap-2">
              {group.options.map((option) => {
                const pressed = (choices[group.id] ?? group.defaultOptionId) === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className="btn"
                    aria-pressed={pressed}
                    style={pressed ? { background: accent, color: accentInk } : undefined}
                    onClick={() => choose(group.id, option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-sm text-stone">
          Tick a line to include it. Untick it to leave it off the quote.
          {plan.groups.length > 0 ? " One backing coat and one primer." : ""}
        </p>
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
        <CrewEditor
          days={days}
          roles={roles}
          totalM2={quote.totalM2}
          accent={accent}
          accentInk={accentInk}
          onDays={setDays}
          onRole={onRole}
        />
        {labourPerM2Pence != null ? (
          <p className="text-sm text-stone">
            This job type has {formatPence(labourPerM2Pence)} per m² in Library. It is used for the plasterer when that rate is still blank and nobody has been added yet. Add a plasterer to use the crew rate instead.
          </p>
        ) : null}
        <ul className="grid gap-3">
          {quote.lines.map((line) => {
            const on = included.includes(line.name);
            return (
              <li key={`${line.name}-${line.unit}`} className={`border-b border-line pb-3 ${on ? "" : "opacity-60"}`}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-7 w-7 shrink-0" checked={on} onChange={() => toggleLine(line.name)} style={{ accentColor: accent }} />
                  <span>
                    <span className="block text-lg font-bold">{line.name}</span>
                    {line.quantity ? (
                      <span className="block">
                        {line.quantity} {line.unit}
                        {line.unitPricePence == null ? "" : ` · ${formatPence(line.unitPricePence)}`}
                        {line.lineTotalPence == null ? "" : ` · ${formatPence(line.lineTotalPence)}`}
                      </span>
                    ) : (
                      <span className="block text-stone">{line.note}</span>
                    )}
                    {line.quantity && line.note ? <span className="block font-bold text-clay">{line.note}</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
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
          <CrewHiddenFields days={days} roles={roles} />
          <input type="hidden" name="choices" value={JSON.stringify(choices)} />
          <input type="hidden" name="included" value={JSON.stringify(included)} />
          <SubmitButton>Add to quote</SubmitButton>
          <p className="text-sm text-stone">This replaces the lines this calculator added last time. Lines you typed yourself stay, and you can still change any quantity on the job.</p>
        </InlineForm>
      </section>
    </div>
  );
}
