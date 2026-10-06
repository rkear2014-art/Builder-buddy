"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatM2 } from "@/lib/measure";
import {
  PHOTO_MEASURE_NOT_READY,
  materialsForPhotoRoom,
  photoAreas,
  revealsLengthM,
  roomFromPhotoMeasure,
  type PhotoEstimate,
  type PhotoOpening,
} from "@/lib/photo-measure";
import { applyPhotoMeasure } from "@/server/actions/photo-measure";

type MaterialRow = { name: string; unit: string; quantity: string; touched: boolean };

type ReviewState = {
  source: "ai" | "manual";
  notice: string | null;
  name: string;
  lengthM: string;
  widthM: string;
  heightM: string;
  openings: Array<{ kind: "door" | "window"; widthM: string; heightM: string }>;
  stopBeadM: string;
  angleBeadM: string;
  confidence: PhotoEstimate["confidence"] | null;
  notes: string;
  materials: MaterialRow[];
};

const MAX_EDGE = 1600;

function metres(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

function fieldNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("canvas");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("jpeg");
  return blob;
}

function openingsFrom(rows: ReviewState["openings"]): PhotoOpening[] {
  return rows.map((row) => ({ kind: row.kind, widthM: metres(row.widthM), heightM: metres(row.heightM) }));
}

function materialsFor(review: ReviewState, typeKey: string, place: "room" | "wall", wastagePercent: number): MaterialRow[] {
  const room = roomFromPhotoMeasure({
    typeKey,
    place,
    name: review.name,
    lengthM: metres(review.lengthM),
    widthM: metres(review.widthM),
    heightM: metres(review.heightM),
    openings: openingsFrom(review.openings),
    stopBeadM: metres(review.stopBeadM),
    angleBeadM: metres(review.angleBeadM),
  });
  const suggested = materialsForPhotoRoom({ typeKey, room, wastagePercent });
  return suggested.map((line) => {
    const previous = review.materials.find((item) => item.name === line.name);
    if (previous?.touched) return previous;
    return { ...line, touched: false };
  });
}

function blankReview(place: "room" | "wall", notice: string | null): ReviewState {
  return {
    source: "manual",
    notice,
    name: place === "wall" ? "Wall" : "Room",
    lengthM: "",
    widthM: "",
    heightM: "2.4",
    openings: [],
    stopBeadM: "0",
    angleBeadM: "0",
    confidence: null,
    notes: "",
    materials: [],
  };
}

function reviewFromEstimate(estimate: PhotoEstimate, typeKey: string, place: "room" | "wall", wastagePercent: number): ReviewState {
  const review: ReviewState = {
    source: "ai",
    notice: null,
    name: estimate.name || (place === "wall" ? "Wall" : "Room"),
    lengthM: fieldNumber(estimate.lengthM),
    widthM: fieldNumber(estimate.widthM),
    heightM: fieldNumber(estimate.heightM),
    openings: estimate.openings.map((opening) => ({
      kind: opening.kind,
      widthM: fieldNumber(opening.widthM),
      heightM: fieldNumber(opening.heightM),
    })),
    stopBeadM: fieldNumber(estimate.stopBeadM),
    angleBeadM: fieldNumber(estimate.angleBeadM),
    confidence: estimate.confidence,
    notes: estimate.notes,
    materials: [],
  };
  return { ...review, materials: materialsFor(review, typeKey, place, wastagePercent) };
}

export function PhotoMeasure({
  jobId,
  sectionId,
  roomIndex,
  typeKey,
  typeTitle,
  place,
  wastagePercent,
  aiReady,
  accent,
  accentInk,
}: {
  jobId: string;
  sectionId: string;
  roomIndex: number | null;
  typeKey: string;
  typeTitle: string;
  place: "room" | "wall";
  wastagePercent: number;
  aiReady: boolean;
  accent: string;
  accentInk: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"closed" | "capture" | "reading" | "review">("closed");
  const [known, setKnown] = useState("Ceiling height 2.4m");
  const [photoCount, setPhotoCount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function close() {
    setStep("closed");
    setFiles([]);
    setReview(null);
    setSaving(false);
    setSaveError(null);
  }

  function openManual(notice: string) {
    const next = blankReview(place, notice);
    setReview({ ...next, materials: materialsFor(next, typeKey, place, wastagePercent) });
    setStep("review");
  }

  function update(patch: Partial<ReviewState>) {
    setReview((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      return { ...next, materials: materialsFor(next, typeKey, place, wastagePercent) };
    });
  }

  async function onFiles(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((file) => file.type.startsWith("image/") || file.size > 0).slice(0, 4);
    if (inputRef.current) inputRef.current.value = "";
    if (picked.length === 0) return;
    setFiles(picked);
    setPhotoCount(picked.length);
    setStep("capture");
  }

  async function readPhotos() {
    setStep("reading");
    setSaveError(null);
    try {
      const body = new FormData();
      body.set("jobId", jobId);
      body.set("sectionId", sectionId);
      body.set("typeTitle", typeTitle);
      body.set("place", place);
      body.set("knownMeasurement", known);
      for (const file of files) {
        const jpeg = await resizeToJpeg(file);
        body.append("photos", jpeg, "room.jpg");
      }
      const response = await fetch("/api/photo-measure", { method: "POST", body });
      const result = (await response.json()) as
        | { ok: true; estimate: PhotoEstimate }
        | { ok: false; reason?: string };
      if (result.ok) {
        setReview(reviewFromEstimate(result.estimate, typeKey, place, wastagePercent));
        setStep("review");
        return;
      }
      if (result.reason === "not-configured") {
        openManual(PHOTO_MEASURE_NOT_READY);
        return;
      }
      const notice =
        result.reason === "limit"
          ? "That's 30 photo measures for today. Type the sizes instead, or try again tomorrow."
          : result.reason === "too-large"
            ? "Those photos are too large. Try fewer, or type the sizes."
            : result.reason === "bad-photo"
              ? "Use a photo from the camera or camera roll, then try again. Or type the sizes."
              : "The photo could not be read. Type the sizes instead.";
      openManual(notice);
    } catch {
      openManual("The photo could not be read. Type the sizes instead.");
    }
  }

  async function saveReview() {
    if (!review) return;
    setSaving(true);
    setSaveError(null);
    const result = await applyPhotoMeasure({
      jobId,
      sectionId,
      roomIndex,
      draft: {
        name: review.name,
        lengthM: metres(review.lengthM),
        widthM: metres(review.widthM),
        heightM: metres(review.heightM),
        openings: openingsFrom(review.openings),
        stopBeadM: metres(review.stopBeadM),
        angleBeadM: metres(review.angleBeadM),
        materials: review.materials.flatMap((line) => {
          const quantity = Number(line.quantity);
          if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999) return [];
          const rounded = Math.round(quantity * 100) / 100;
          return [{ name: line.name, unit: line.unit, quantity: String(rounded) }];
        }),
      },
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    close();
    router.refresh();
  }

  const room = review
    ? roomFromPhotoMeasure({
        typeKey,
        place,
        name: review.name,
        lengthM: metres(review.lengthM),
        widthM: metres(review.widthM),
        heightM: metres(review.heightM),
        openings: openingsFrom(review.openings),
        stopBeadM: metres(review.stopBeadM),
        angleBeadM: metres(review.angleBeadM),
      })
    : null;
  const areas = room ? photoAreas(room) : null;
  const reveals = review ? revealsLengthM(openingsFrom(review.openings)) : 0;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        data-photo-measure="file"
        onChange={(event) => void onFiles(event.target.files)}
      />
      <button
        type="button"
        className="btn min-h-[4.5rem] w-full text-xl"
        style={{ background: accent, color: accentInk }}
        data-photo-measure="button"
        onClick={() => {
          if (!aiReady) {
            openManual(PHOTO_MEASURE_NOT_READY);
            return;
          }
          inputRef.current?.click();
        }}
      >
        <CameraIcon />
        Measure from photo
      </button>

      {step === "closed" ? null : (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-measure-title"
            data-photo-measure={step === "review" ? "review" : "capture"}
            className="photo-sheet grid max-h-[calc(100dvh-1rem)] w-full max-w-lg gap-2 overflow-y-auto rounded-2xl bg-card p-3 shadow-xl"
          >
            <h3 id="photo-measure-title" className="font-display text-2xl leading-none">
              Measure from photo
            </h3>

            {step === "capture" ? (
              <>
                <p className="font-bold">
                  {photoCount} photo{photoCount === 1 ? "" : "s"} ready. A known size makes the estimate closer.
                </p>
                <label className="field">
                  Known measurement
                  <span>Optional. Ceiling height 2.4m, or a door 1.98m tall.</span>
                  <input value={known} maxLength={120} onChange={(event) => setKnown(event.target.value)} />
                </label>
                <button type="button" className="btn btn-primary" data-photo-measure="read" onClick={() => void readPhotos()}>
                  Read the photos
                </button>
                <button type="button" className="btn btn-secondary" onClick={close}>
                  Cancel
                </button>
              </>
            ) : null}

            {step === "reading" ? <p className="text-lg font-bold">Reading the photos…</p> : null}

            {step === "review" && review && areas ? (
              <>
                {review.source === "ai" ? (
                  <p className="rounded-xl bg-blush px-3 py-2 font-extrabold text-clay">AI estimate, check before quoting</p>
                ) : (
                  <p className="rounded-xl bg-blush px-3 py-2 font-extrabold text-clay">{review.notice}</p>
                )}
                {review.confidence ? (
                  <p className="text-sm font-bold text-stone">
                    {review.confidence === "high" ? "High" : review.confidence === "medium" ? "Medium" : "Low"} confidence
                    {review.notes ? `. ${review.notes}` : ""}
                  </p>
                ) : null}
                <label className="field">
                  Name
                  <input value={review.name} maxLength={40} onChange={(event) => update({ name: event.target.value })} />
                </label>
                <div className={`grid gap-2 ${place === "wall" ? "grid-cols-2" : "grid-cols-3"}`}>
                  <label className="field">
                    Length m
                    <input inputMode="decimal" value={review.lengthM} onChange={(event) => update({ lengthM: event.target.value })} />
                  </label>
                  {place === "wall" ? null : (
                    <label className="field">
                      Width m
                      <input inputMode="decimal" value={review.widthM} onChange={(event) => update({ widthM: event.target.value })} />
                    </label>
                  )}
                  <label className="field">
                    Height m
                    <input inputMode="decimal" value={review.heightM} onChange={(event) => update({ heightM: event.target.value })} />
                  </label>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">Openings</p>
                    <button
                      type="button"
                      className="font-bold text-sky underline"
                      onClick={() =>
                        update({
                          openings: [...review.openings, { kind: "door", widthM: "0.76", heightM: "1.98" }],
                        })
                      }
                    >
                      Add opening
                    </button>
                  </div>
                  {review.openings.length === 0 ? <p className="text-sm text-stone">No doors or windows marked.</p> : null}
                  {review.openings.map((opening, index) => (
                    <div key={`${opening.kind}-${index}`} className="grid grid-cols-[6.5rem_1fr_1fr_auto] items-end gap-1">
                      <label className="field">
                        Type
                        <select
                          value={opening.kind}
                          onChange={(event) => {
                            const openings = review.openings.slice();
                            openings[index] = { ...opening, kind: event.target.value === "window" ? "window" : "door" };
                            update({ openings });
                          }}
                        >
                          <option value="door">Door</option>
                          <option value="window">Window</option>
                        </select>
                      </label>
                      <label className="field">
                        Width m
                        <input
                          inputMode="decimal"
                          value={opening.widthM}
                          onChange={(event) => {
                            const openings = review.openings.slice();
                            openings[index] = { ...opening, widthM: event.target.value };
                            update({ openings });
                          }}
                        />
                      </label>
                      <label className="field">
                        Height m
                        <input
                          inputMode="decimal"
                          value={opening.heightM}
                          onChange={(event) => {
                            const openings = review.openings.slice();
                            openings[index] = { ...opening, heightM: event.target.value };
                            update({ openings });
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary px-2"
                        onClick={() => update({ openings: review.openings.filter((_, item) => item !== index) })}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-bold" data-photo-measure="areas">
                  Walls {formatM2(areas.wallAreaM2)} · Ceiling {formatM2(areas.ceilingAreaM2)} · Net plaster {formatM2(areas.netPlasterM2)} · Reveals {fieldNumber(reveals)} m
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="field">
                    Angle bead m
                    <input inputMode="decimal" value={review.angleBeadM} onChange={(event) => update({ angleBeadM: event.target.value })} />
                  </label>
                  <label className="field">
                    Stop bead m
                    <input inputMode="decimal" value={review.stopBeadM} onChange={(event) => update({ stopBeadM: event.target.value })} />
                  </label>
                </div>
                <div className="grid gap-1">
                  <p className="font-bold">Materials</p>
                  {review.materials.length === 0 ? <p className="text-sm text-stone">Enter the sizes to suggest materials.</p> : null}
                  {review.materials.map((line) => (
                    <label key={line.name} className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2 text-sm font-bold">
                      {line.name}
                      <input
                        className="plain-input"
                        inputMode="decimal"
                        value={line.quantity}
                        onChange={(event) =>
                          update({
                            materials: review.materials.map((item) =>
                              item.name === line.name ? { ...item, quantity: event.target.value, touched: true } : item,
                            ),
                          })
                        }
                      />
                      <span>{line.unit}</span>
                    </label>
                  ))}
                  <p className="text-sm text-stone">Saving adds these quantities onto materials already on this job.</p>
                </div>
                {saveError ? <p className="font-bold text-clay">{saveError}</p> : null}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-secondary" disabled={saving} onClick={close}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" data-photo-measure="use" disabled={saving} onClick={() => void saveReview()}>
                    {saving ? "Saving…" : "Use these"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 8.5h3.2l1.4-2h6.8l1.4 2H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      <circle cx="12" cy="13.2" r="3" />
    </svg>
  );
}
