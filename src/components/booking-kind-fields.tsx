"use client";

import { useState } from "react";
import { BOOKING_KINDS, MAX_SPAN_DAYS, normaliseBookingKind } from "@/lib/diary";

export function BookingKindFields({
  bookingKind = "job",
  spanDays = 1,
  assignedName = "",
  onDiary = true,
  dateChoice,
}: {
  bookingKind?: string;
  spanDays?: number;
  assignedName?: string;
  onDiary?: boolean;
  dateChoice: "create" | "edit";
}) {
  const [kind, setKind] = useState(normaliseBookingKind(bookingKind));
  const [days, setDays] = useState(spanDays >= 1 && spanDays <= MAX_SPAN_DAYS ? spanDays : 1);

  function setDayCount(next: number) {
    if (!Number.isFinite(next)) return;
    setDays(Math.min(MAX_SPAN_DAYS, Math.max(1, Math.trunc(next))));
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="font-extrabold">What are you booking?</legend>
        {BOOKING_KINDS.map((item) => (
          <label key={item.id} className="diary-kind">
            <input type="radio" name="bookingKind" value={item.id} checked={kind === item.id} onChange={() => setKind(item.id)} />
            <span className={`diary-swatch diary-swatch-${item.id}`} aria-hidden="true" />
            <span>
              <span className="block font-extrabold">{item.label}</span>
              <span className="block text-sm font-semibold text-stone">{item.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-2">
        <span className="font-extrabold">Days on site</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secondary h-16 w-16 text-3xl" onClick={() => setDayCount(days - 1)} aria-label="Fewer days">
            −
          </button>
          <input
            name="spanDays"
            inputMode="numeric"
            aria-label="Days on site"
            className="plain-input h-16 text-center text-2xl font-extrabold"
            value={String(days)}
            onChange={(event) => setDayCount(Number(event.target.value))}
          />
          <button type="button" className="btn btn-secondary h-16 w-16 text-3xl" onClick={() => setDayCount(days + 1)} aria-label="More days">
            +
          </button>
        </div>
      </div>
      <label className="field">
        Who is on the job
        <span>Optional. Leave blank to use your name.</span>
        <input name="assignedName" defaultValue={assignedName} autoComplete="name" placeholder="e.g. Sam" />
      </label>
      {dateChoice === "create" ? (
        <label className="flex items-start gap-3 font-bold">
          <input type="checkbox" name="dateToBook" value="yes" className="mt-1 h-6 w-6" />
          <span>
            Won — date still to book
            <span className="mt-1 block text-sm font-semibold text-stone">
              It waits under To book. Tap it, then tap a day. The date above stays aside until then.
            </span>
          </span>
        </label>
      ) : (
        <label className="flex items-start gap-3 font-bold">
          <input type="hidden" name="onDiary" value="no" />
          <input type="checkbox" name="onDiary" value="yes" defaultChecked={onDiary} className="mt-1 h-6 w-6" />
          <span>
            On the diary
            <span className="mt-1 block text-sm font-semibold text-stone">
              Untick a won job that still needs a day. It then shows under To book.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
