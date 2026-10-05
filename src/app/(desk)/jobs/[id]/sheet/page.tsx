import Link from "next/link";
import { notFound } from "next/navigation";
import { slotLabel } from "@/lib/constants";
import { formatIsoDate } from "@/lib/dates";
import { formatM2, roomAreas, type MeasureMode } from "@/lib/measure";
import { areasLabelFor, sectionTitle } from "@/lib/quote-sections";
import { getJob, requireUser } from "@/server/dal";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  return { title: job ? `Job sheet · ${job.customerName}` : "Job sheet" };
}

export default async function JobSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  if (!job) notFound();

  return (
    <main className="mx-auto max-w-3xl bg-white px-4 py-6">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <PrintButton />
        <Link href={`/jobs/${job.id}`} className="btn btn-secondary">
          Back to the job
        </Link>
      </div>
      <article className="grid gap-4">
        <header>
          <p className="text-sm font-extrabold tracking-wide text-stone">{user.businessName}</p>
          <h1 className="font-display text-4xl">Job sheet</h1>
          <p className="mt-2 text-stone">For the people doing the work. Prices are not on this sheet.</p>
        </header>
        <section>
          <h2 className="font-display text-2xl">{job.customerName}</h2>
          <p className="whitespace-pre-wrap">{job.address}</p>
          <p className="mt-2">{job.phone}</p>
          <p>
            {formatIsoDate(job.scheduledDate, "long")} · {slotLabel(job.timeSlot)}
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">The work</h2>
          <p className="mt-2 whitespace-pre-wrap">{job.description}</p>
        </section>
        {job.sections.map((section) => {
          const label = areasLabelFor(section.typeKey, section.title);
          return (
            <section key={section.id}>
              <h2 className="font-display text-2xl">{sectionTitle(section.title)}</h2>
              {section.rooms.length > 0 ? (
                <>
                  <h3 className="mt-2 font-bold">{label}</h3>
                  <ul className="mt-2 grid gap-1">
                    {section.rooms.map((room, index) => {
                      const areas = roomAreas({ ...room, mode: room.mode as MeasureMode });
                      return (
                        <li key={`${room.name}-${index}`}>
                          {room.name || (label === "Walls" ? "Wall" : "Room")} · {formatM2(areas.netM2)}
                          {room.mode === "room" ? ` · walls ${formatM2(areas.wallM2)} · ceiling ${formatM2(areas.ceilingM2)}` : ""}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
              {section.materials.length > 0 ? (
                <ol className="mt-2 grid gap-2">
                  {section.materials.map((material, index) => (
                    <li key={material.id}>
                      {index + 1}. {material.name} — {material.quantity} {material.unit}
                      {material.bought ? " · bought" : ""}
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          );
        })}
        {job.sections.length === 0 ? (
        <section>
          <h2 className="font-display text-2xl">Materials</h2>
          {job.materials.length === 0 ? <p className="mt-2 text-stone">No materials listed.</p> : null}
          <ol className="mt-2 grid gap-2">
            {job.materials.map((material, index) => (
              <li key={material.id}>
                {index + 1}. {material.name} — {material.quantity} {material.unit}
                {material.bought ? " · bought" : ""}
              </li>
            ))}
          </ol>
        </section>
        ) : null}
        {job.internalNotes.trim() ? (
          <section>
            <h2 className="font-display text-2xl">Notes for the team</h2>
            <p className="mt-2 whitespace-pre-wrap">{job.internalNotes}</p>
          </section>
        ) : null}
      </article>
    </main>
  );
}
