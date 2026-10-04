"use client";

import { useState } from "react";
import { PHOTO_STAGE_LABELS, PHOTO_STAGES } from "@/lib/photos";
import { deleteJobPhoto, setShowPhotos, uploadJobPhoto } from "@/server/actions/customer-finish";

async function compressPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob) return file;
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function JobPhotoForm({ jobId }: { jobId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("photo");
    if (file instanceof File && file.size > 0) data.set("photo", await compressPhoto(file));
    const result = await uploadJobPhoto(data);
    if (result?.error) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <input type="hidden" name="jobId" value={jobId} />
      {error ? (
        <p role="alert" className="rounded-xl bg-blush px-3 py-2 font-bold text-clay">
          {error}
        </p>
      ) : null}
      <label className="field">
        Photo
        <span>Camera or gallery. The picture is made smaller on this device before it is saved.</span>
        <input name="photo" type="file" accept="image/*" required />
      </label>
      <label className="field">
        When
        <select name="stage" defaultValue="BEFORE">
          {PHOTO_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {PHOTO_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-secondary" type="submit" disabled={busy}>
        {busy ? "Saving photo…" : "Add photo"}
      </button>
    </form>
  );
}

export function PhotoShareButton({ src, filename }: { src: string; filename: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    setNote(null);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || "image/webp" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setNote("The photo could not be shared. Use Download instead.");
    }
  }

  return (
    <div className="grid gap-1">
      <button className="btn btn-secondary w-full" type="button" onClick={share}>
        Share
      </button>
      {note ? <p className="text-sm text-stone">{note}</p> : null}
    </div>
  );
}

export function ShowPhotosForm({ jobId, showPhotos }: { jobId: string; showPhotos: boolean }) {
  return (
    <form action={setShowPhotos}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="showPhotos" value={showPhotos ? "no" : "yes"} />
      <button className="font-extrabold underline" type="submit">
        {showPhotos ? "Hide photos on the customer link" : "Show photos on the customer link"}
      </button>
    </form>
  );
}

export function DeletePhotoForm({ photoId }: { photoId: string }) {
  return (
    <form action={deleteJobPhoto}>
      <input type="hidden" name="photoId" value={photoId} />
      <button className="btn btn-danger w-full" type="submit">
        Remove
      </button>
    </form>
  );
}
