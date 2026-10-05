import { PHOTO_STAGE_LABELS, type PhotoStage } from "@/lib/photos";

export function CustomerPhotos({
  photos,
}: {
  photos: Array<{ id: string; stage: PhotoStage; src: string }>;
}) {
  if (photos.length === 0) return null;
  return (
    <section className="card mt-4 grid gap-3">
      <h2 className="font-display text-3xl">Before and after</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo) => (
          <li key={photo.id} className="photo-zoom grid gap-2 rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt="" className="aspect-[4/3] w-full object-cover" />
            <p className="font-extrabold">{PHOTO_STAGE_LABELS[photo.stage]}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
