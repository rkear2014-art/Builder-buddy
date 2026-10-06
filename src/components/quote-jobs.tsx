import { startingCrew } from "@/lib/crew";
import type { DeskSection } from "@/lib/desk";
import { formatM2, roomAreas, type MeasureMode } from "@/lib/measure";
import { formatPence } from "@/lib/money";
import { poundsFieldValue } from "@/lib/customer-price";
import { areasLabelFor, sectionSubtotalPence } from "@/lib/quote-sections";
import { addQuoteJob, removeQuoteJob, saveQuoteJob } from "@/server/actions/quote-jobs";
import { deleteJobMaterial, toggleMaterialBought } from "@/server/actions/materials";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PillLink } from "@/components/pill-link";
import { CrewForm } from "@/components/crew-form";
import { SubmitButton } from "@/components/submit-button";

const MODES = new Set<MeasureMode>(["room", "elevation", "floor", "direct"]);

function areaOf(room: DeskSection["rooms"][number]): number {
  const mode = MODES.has(room.mode as MeasureMode) ? (room.mode as MeasureMode) : "room";
  return roomAreas({ ...room, mode }).netM2;
}

export function QuoteJobs({
  jobId,
  sections,
  accent,
  accentInk,
  crewRates,
  legacyDayRatePence,
  legacyDays,
}: {
  jobId: string;
  sections: DeskSection[];
  accent: string;
  accentInk: string;
  crewRates: Array<{ role: string; basis: string; ratePence: number | null }>;
  legacyDayRatePence: number | null;
  legacyDays: string | null;
}) {
  return (
    <section id="quote-jobs" className="card grid gap-4">
      <h2 className="font-display text-3xl">Jobs on this quote</h2>
      {sections.length === 0 ? <p className="text-stone">No jobs yet. Add the first one below.</p> : null}
      {sections.map((section, index) => {
        const label = areasLabelFor(section.typeKey, section.title);
        const place = label === "Walls" ? "wall" : "room";
        const subtotal = sectionSubtotalPence(section);
        const crew = startingCrew({
          defaults: crewRates,
          saved: section.crew.length > 0 ? section.crew : null,
          legacyDayRatePence: section.crew.length > 0 || index > 0 ? null : legacyDayRatePence,
          legacyDays: section.dayCount ?? (section.crew.length === 0 && index === 0 ? legacyDays : null),
        });
        const totalM2 = section.rooms.reduce((sum, room) => sum + areaOf(room), 0);
        const measureHref = section.typeKey.startsWith("template:")
          ? `/jobs/${jobId}/measure?template=${section.typeKey.slice("template:".length)}&section=${section.id}`
          : section.typeKey
            ? `/jobs/${jobId}/measure?starter=${section.typeKey}&section=${section.id}`
            : `/jobs/${jobId}/choose?section=${section.id}`;
        return (
          <article key={section.id} className="grid gap-3 border-t border-line pt-4">
            <form action={saveQuoteJob} className="grid gap-3">
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="sectionId" value={section.id} />
              <label className="field">
                Job
                <input name="title" maxLength={80} defaultValue={section.title} placeholder="Skim lounge" />
              </label>
              <p className="font-display text-3xl">{formatPence(subtotal)}</p>
              <details>
                <summary className="cursor-pointer font-bold">Price this job</summary>
                <label className="field mt-3">
                  Before VAT
                  <span>Leave blank to use the materials and labour on this job.</span>
                  <input name="fixedPrice" inputMode="decimal" defaultValue={poundsFieldValue(section.fixedPricePence)} placeholder="360.00" />
                </label>
              </details>
              <SubmitButton variant="secondary">Save this job</SubmitButton>
            </form>
            {section.rooms.length > 0 ? (
              <div>
                <div className="flex items-end justify-between gap-2">
                  <h3 className="font-display text-2xl">{label}</h3>
                  <PillLink href={measureHref}>Change sizes</PillLink>
                </div>
                <ul className="mt-1 grid gap-1">
                  {section.rooms.map((room, roomIndex) => (
                    <li key={`${room.name}-${roomIndex}`}>
                      {room.name || (place === "wall" ? "Wall" : "Room")} · {formatM2(areaOf(room))}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <PillLink href={measureHref}>
                {place === "wall" ? "Measure the wall" : section.typeKey ? "Measure the room" : "Choose this job"}
              </PillLink>
            )}
            <PillLink href={`/jobs/${jobId}/choose?section=${section.id}`}>Add materials</PillLink>
            {section.materials.length === 0 ? <p className="text-stone">No materials yet.</p> : null}
            {section.materials.length > 0 ? (
              <details>
                <summary className="cursor-pointer font-bold">Materials ({section.materials.length})</summary>
                <ul className="mt-3 grid gap-3">
                  {section.materials.map((material) => (
                    <li key={material.id} className="grid gap-3 border-b border-line pb-3 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
                      <form action={toggleMaterialBought}>
                        <input type="hidden" name="materialId" value={material.id} />
                        <button className={`btn w-full ${material.bought ? "btn-pine" : "btn-secondary"}`} type="submit">
                          {material.bought ? "Bought" : "To buy"}
                        </button>
                      </form>
                      <div>
                        <p className="text-lg font-bold">{material.name}</p>
                        <p>
                          {material.quantity} {material.unit}
                          {material.unitPricePence == null ? "" : ` · ${formatPence(material.unitPricePence)}`}
                        </p>
                      </div>
                      <form action={deleteJobMaterial}>
                        <input type="hidden" name="materialId" value={material.id} />
                        <button className="btn btn-secondary w-full" type="submit">
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <details>
              <summary className="cursor-pointer font-bold">Crew and labour</summary>
              <div className="mt-3">
                <CrewForm
                  jobId={jobId}
                  sectionId={section.id}
                  initialDays={crew.days}
                  initialRoles={crew.roles}
                  totalM2={totalM2}
                  accent={accent}
                  accentInk={accentInk}
                  nested
                />
              </div>
            </details>
            <form action={removeQuoteJob}>
              <input type="hidden" name="sectionId" value={section.id} />
              <ConfirmSubmit
                label="Remove this job"
                message="Remove this job from the quote? Its rooms, materials and labour come off too."
                className="font-bold text-clay underline"
              />
            </form>
          </article>
        );
      })}
      <form action={addQuoteJob}>
        <input type="hidden" name="jobId" value={jobId} />
        <button className="btn min-h-[4.5rem] w-full text-xl" style={{ background: accent, color: accentInk }} type="submit">
          Add another job
        </button>
      </form>
    </section>
  );
}
