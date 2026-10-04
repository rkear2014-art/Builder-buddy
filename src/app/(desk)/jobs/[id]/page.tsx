import Link from "next/link";
import { notFound } from "next/navigation";
import { agreementChanges, parseLockedAgreement, toPublicAgreement } from "@/lib/agreement";
import { JOB_STATUSES, STATUS_LABELS, slotLabel } from "@/lib/constants";
import { formatIsoDate, formatLondonDateTime } from "@/lib/dates";
import type { DeskJob } from "@/lib/desk";
import { costTotals, materialsTotals } from "@/lib/materials";
import { starterTemplatesFor } from "@/lib/trade-starters";
import { formatPence } from "@/lib/money";
import {
  deleteJob,
  rotateShareLink,
  saveJobAsTemplate,
  setJobStatus,
  updateJob,
} from "@/server/actions/jobs";
import {
  addJobMaterial,
  addSavedMaterialToJob,
  applyTemplate,
  deleteJobMaterial,
  toggleMaterialBought,
} from "@/server/actions/materials";
import { applyStarterToJob } from "@/server/actions/starters";
import { getJob, getLibrary, requireUser } from "@/server/dal";
import { requestOrigin } from "@/server/origin";
import { CopyLink } from "@/components/copy-link";
import { InlineForm } from "@/components/inline-form";
import { JobForm } from "@/components/job-form";
import { SubmitButton } from "@/components/submit-button";
import { UnitSelect } from "@/components/unit-select";

export const dynamic = "force-dynamic";

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  return { title: job?.customerName ?? "Job" };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  if (!job) notFound();
  const library = await getLibrary(user.businessId);
  const origin = await requestOrigin();
  const shareUrl = origin ? `${origin}/sign/${job.shareToken}` : `/sign/${job.shareToken}`;
  const locked = job.signOff ? parseLockedAgreement(job.signOff.snapshot) : null;
  const changes = locked ? agreementChanges(locked, toPublicAgreement(job)) : [];
  const customerTotal = materialsTotals(job.materials);
  const tradeCost = costTotals(job.materials);
  const relevantSaved = library.savedItems.filter((item) => item.trade === job.trade || item.trade === "Other");
  const relevantTemplates = library.templates.filter((template) => template.trade === job.trade);
  const starters = starterTemplatesFor(job.trade);

  return (
    <div className="grid gap-4">
      <p>
        <Link href="/diary" className="font-bold text-sky underline">
          Diary
        </Link>
      </p>
      <header className="grid gap-3">
        <p className="font-bold text-stone">
          {job.trade} · {formatIsoDate(job.scheduledDate, "long")} · {slotLabel(job.timeSlot)}
        </p>
        <h1 className="font-display text-4xl leading-tight">{job.customerName}</h1>
        <p>{job.address}</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-pine" href={telHref(job.phone)}>
            Call
          </a>
          <a
            className="btn btn-secondary"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            Map
          </a>
          {job.email ? (
            <a className="btn btn-secondary" href={`mailto:${job.email}`}>
              Email
            </a>
          ) : null}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Status">
        {JOB_STATUSES.map((status) => (
          <form key={status} action={setJobStatus}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="status" value={status} />
            <button className={`btn w-full ${job.status === status ? "btn-primary" : "btn-secondary"}`} type="submit">
              {STATUS_LABELS[status]}
            </button>
          </form>
        ))}
      </section>

      <section className="card">
        <h2 className="font-display text-2xl">The work</h2>
        <p className="mt-2 whitespace-pre-wrap text-lg">{job.description}</p>
      </section>

      <SignOffPanel job={job} shareUrl={shareUrl} changes={changes} damaged={Boolean(job.signOff) && !locked} />

      <section id="materials" className="card grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl">Materials</h2>
          <p className="font-display text-2xl">{formatPence(customerTotal.totalPence)}</p>
        </div>
        {customerTotal.unpricedCount > 0 ? (
          <p className="text-stone">
            {customerTotal.unpricedCount} {customerTotal.unpricedCount === 1 ? "item has" : "items have"} no customer
            price. The total covers priced items only.
          </p>
        ) : null}
        {job.materials.length === 0 ? <p className="text-stone">No materials yet.</p> : null}
        <ul className="grid gap-3">
          {job.materials.map((material) => (
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
                  {material.unitPricePence == null ? " · No price" : ` · ${formatPence(material.unitPricePence)}`}
                </p>
              </div>
              <form action={deleteJobMaterial}>
                <input type="hidden" name="materialId" value={material.id} />
                <button className="btn btn-danger w-full" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>

        <div className="private-panel rounded-2xl p-4">
          <h3 className="font-bold">Your costs — hidden from the customer</h3>
          <p className="mt-1 font-display text-2xl">{formatPence(tradeCost.totalPence)}</p>
          {tradeCost.unpricedCount > 0 ? (
            <p className="text-sm text-stone">{tradeCost.unpricedCount} without a cost.</p>
          ) : null}
        </div>

        <InlineForm action={addJobMaterial} className="grid gap-3">
          <h3 className="font-display text-xl">Add an item</h3>
          <input type="hidden" name="jobId" value={job.id} />
          <label className="field">
            Name
            <input name="name" required placeholder="Multi-finish plaster" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">
              Quantity
              <input name="quantity" required inputMode="decimal" defaultValue="1" />
            </label>
            <label className="field">
              Unit
              <UnitSelect defaultValue="bag" />
            </label>
            <label className="field">
              Customer price
              <span>Optional, in £</span>
              <input name="unitPrice" inputMode="decimal" placeholder="9.40" />
            </label>
          </div>
          <label className="field">
            Your cost
            <span>Optional. Never shown on the customer link.</span>
            <input name="costPrice" inputMode="decimal" placeholder="7.10" />
          </label>
          <SubmitButton>Add to the list</SubmitButton>
        </InlineForm>

        {starters.length > 0 ? (
          <form action={applyStarterToJob} className="grid gap-3">
            <label className="field">
              Starter list
              <span>
                Built in for plastering, for any business. Prices are left blank. It does not remove what is already
                on the job. If this job has no work description yet, the customer wording from the list is used.
              </span>
              <select name="starterId" required defaultValue={starters[0]?.id}>
                {starters.map((starter) => (
                  <option key={starter.id} value={starter.id}>
                    {starter.name} ({starter.items.length})
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton variant="secondary">Add a starter list</SubmitButton>
          </form>
        ) : null}

        {relevantSaved.length > 0 ? (
          <form action={addSavedMaterialToJob} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="field">
              Saved item
              <select name="savedId" required defaultValue={relevantSaved[0]?.id}>
                {relevantSaved.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton variant="secondary">Add saved item</SubmitButton>
          </form>
        ) : null}

        {relevantTemplates.length > 0 ? (
          <form action={applyTemplate} className="grid gap-3">
            <label className="field">
              Template
              <span>Adds these items. It does not remove what is already on the job.</span>
              <select name="templateId" required defaultValue={relevantTemplates[0]?.id}>
                {relevantTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.items.length})
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton variant="secondary">Add template items</SubmitButton>
          </form>
        ) : (
          <p>
            <Link href="/library" className="font-bold text-sky underline">
              Save common items in the library
            </Link>
          </p>
        )}

        {job.materials.length > 0 ? (
          <InlineForm action={saveJobAsTemplate} className="grid gap-3 border-t border-line pt-4">
            <h3 className="font-display text-xl">Save this list as a template</h3>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="trade" value={job.trade} />
            <label className="field">
              Template name
              <input name="name" required placeholder="Skimming for a smooth finish" />
            </label>
            <SubmitButton variant="secondary">Save template</SubmitButton>
          </InlineForm>
        ) : null}
      </section>

      <section className="private-panel card">
        <h2 className="font-display text-2xl">Internal notes</h2>
        <p className="mt-1 text-sm font-bold text-stone">The customer never sees this.</p>
        <p className="mt-2 whitespace-pre-wrap">{job.internalNotes || "None yet."}</p>
      </section>

      <details className="card">
        <summary className="btn btn-secondary w-full">Edit customer and visit</summary>
        <div className="mt-4">
          <JobForm action={updateJob} submitLabel="Save changes" defaultDate={job.scheduledDate} job={job} />
        </div>
      </details>

      <details className="card">
        <summary className="btn btn-danger w-full">Delete this job</summary>
        <form action={deleteJob} className="mt-4 grid gap-3">
          <p>
            This removes the job, the materials, and any signed agreement. The customer link will stop working.
          </p>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton variant="danger">Delete permanently</SubmitButton>
        </form>
      </details>
    </div>
  );
}

function SignOffPanel({
  job,
  shareUrl,
  changes,
  damaged,
}: {
  job: DeskJob;
  shareUrl: string;
  changes: string[];
  damaged: boolean;
}) {
  return (
    <section className="card grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl">Customer sign-off</h2>
        <span className={job.signOff ? "status-complete" : "status-enquiry"}>
          {job.signOff ? "Signed" : "Not signed"}
        </span>
      </div>
      <p>
        The customer opens this on their own phone. They see the work, materials, and prices. They do not see your
        notes or your costs.
      </p>
      <CopyLink url={shareUrl} />
      <div className="flex flex-wrap gap-2">
        <Link href={`/sign/${job.shareToken}`} className="btn btn-secondary">
          Open customer page
        </Link>
        <Link href={`/sign/${job.shareToken}/print`} className="btn btn-secondary">
          Printable copy
        </Link>
      </div>
      {job.signOff ? (
        <div className="rounded-2xl bg-moss p-4">
          <p className="font-bold">
            Signed by {job.signOff.signerName} on {formatLondonDateTime(job.signOff.signedAt)}.
          </p>
          {damaged ? (
            <p className="mt-2 font-bold text-clay">The locked copy could not be read. It has not been replaced.</p>
          ) : null}
          {changes.length > 0 ? (
            <p className="mt-2">
              The job has changed since they signed ({changes.join(", ")}). Their agreed copy stays as it was.
            </p>
          ) : (
            <p className="mt-2">The working job still matches what they signed.</p>
          )}
          {job.signOff.signatureDataUrl.startsWith("data:image/png;base64,") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.signOff.signatureDataUrl}
              alt={`Signature of ${job.signOff.signerName}`}
              className="mt-3 max-h-32 rounded-xl bg-white"
            />
          ) : null}
        </div>
      ) : (
        <form action={rotateShareLink}>
          <input type="hidden" name="jobId" value={job.id} />
          <button className="btn btn-secondary" type="submit">
            New link
          </button>
          <p className="mt-2 text-sm text-stone">The old link stops working. Use this if you sent it to the wrong person.</p>
        </form>
      )}
    </section>
  );
}
