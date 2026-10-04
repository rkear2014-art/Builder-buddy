import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { agreementChanges, parseLockedAgreement, toPublicAgreement } from "@/lib/agreement";
import { JOB_STATUSES, STATUS_LABELS, slotLabel, visibleTradeLabel } from "@/lib/constants";
import { quoteMessage } from "@/lib/customer-message";
import { formatIsoDate, formatLondonDateTime } from "@/lib/dates";
import type { DeskJob } from "@/lib/desk";
import { quoteStatusLabel } from "@/lib/job-desk";
import { costTotals, materialsTotals } from "@/lib/materials";
import { formatPence } from "@/lib/money";
import { depositFromPercent, paymentNote, percentFromDeposit } from "@/lib/quote";
import { surveyForTrade, surveyIntro, surveyKeys, surveyProgress } from "@/lib/survey";
import { savePaymentTerms, setShowLinePrices, setSurveyTick } from "@/server/actions/job-desk";
import {
  deleteJob,
  revokeShareLink,
  rotateShareLink,
  saveJobAsTemplate,
  setJobStatus,
  updateJob,
} from "@/server/actions/jobs";
import { deleteJobMaterial, toggleMaterialBought } from "@/server/actions/materials";
import { getJob, getLibrary, requireUser } from "@/server/dal";
import { requestOrigin } from "@/server/origin";
import { InlineForm } from "@/components/inline-form";
import { JobForm } from "@/components/job-form";
import { SendQuote } from "@/components/send-quote";
import { SharePortal } from "@/components/share-portal";
import { SubmitButton } from "@/components/submit-button";

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
  const accent = user.branding.accentColour;
  const accentInk = user.branding.accentInk;
  const quoteStatus = quoteStatusLabel(job.status, job.showLinePrices);
  const survey = surveyForTrade(job.trade);
  const progress = surveyProgress(job.trade, job.surveyDone);
  const ticked = new Set(surveyKeys(job.surveyDone));
  const itemCount = job.materials.length;
  const depositPercent = percentFromDeposit(customerTotal.totalPence, job.depositPence);
  const tradeBit = visibleTradeLabel(job.trade);
  const message = quoteMessage({
    customerName: job.customerName,
    businessName: user.businessName,
    url: shareUrl,
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-4" style={{ "--job-accent": accent } as CSSProperties}>
      <p>
        <Link href="/jobs" className="font-bold underline" style={{ color: accent }}>
          Jobs
        </Link>
      </p>
      <header className="grid gap-2">
        <h1 className="font-display text-4xl leading-tight">{job.customerName}</h1>
        <p>{job.address}</p>
        <p className="font-bold text-stone">
          {[tradeBit, formatIsoDate(job.scheduledDate, "long"), slotLabel(job.timeSlot)].filter(Boolean).join(" · ")}
        </p>
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
        </div>
      </header>

      <p className="job-contact">Best time to contact: {slotLabel(job.timeSlot)}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="job-status-pill">{quoteStatus.pill}</p>
        <form action={setShowLinePrices}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="showLinePrices" value={quoteStatus.showPrices ? "yes" : "no"} />
          <button className="font-extrabold underline" style={{ color: accent }} type="submit">
            {quoteStatus.toggle}
          </button>
        </form>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Status">
        {JOB_STATUSES.map((status) => (
          <form key={status} action={setJobStatus}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="status" value={status} />
            <button
              className="btn btn-secondary"
              style={job.status === status ? { background: accent, color: accentInk, borderColor: accent } : undefined}
              type="submit"
            >
              {STATUS_LABELS[status]}
            </button>
          </form>
        ))}
      </div>

      <section className="card grid gap-3">
        <p className="text-xs font-extrabold tracking-wide" style={{ color: accent }}>
          SURVEY CHECKLIST
        </p>
        <p className="font-display text-3xl leading-none">
          {progress.done}/{progress.total} done
        </p>
        <div className="job-progress" aria-hidden="true">
          <span style={{ width: progress.total === 0 ? "0%" : `${(progress.done / progress.total) * 100}%` }} />
        </div>
        <p className="text-stone">{surveyIntro(job.trade)}</p>
        <details className="grid gap-3" open={progress.done > 0 ? true : undefined}>
          <summary className="btn w-full cursor-pointer" style={{ background: accent, color: accentInk }}>
            {progress.done === 0 ? "Start survey checklist" : "Survey checklist"}
          </summary>
          <ul className="mt-3 grid gap-2">
            {survey.map((item) => {
              const done = ticked.has(item.key);
              return (
                <li key={item.key}>
                  <form action={setSurveyTick}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="key" value={item.key} />
                    <input type="hidden" name="done" value={done ? "no" : "yes"} />
                    <button className={`btn w-full justify-start ${done ? "btn-pine" : "btn-secondary"}`} type="submit">
                      {done ? "Done" : "To do"} · {item.label}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </details>
      </section>

      <section className="card grid gap-4">
        <h2 className="text-center font-display text-3xl leading-tight">
          That&apos;s {itemCount} {itemCount === 1 ? "item" : "items"}! Now I want to…
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/jobs/${job.id}/choose`} className="job-choice" style={{ color: accent, borderColor: accent }}>
            <span className="text-3xl leading-none">+</span>
            Add materials
          </Link>
          {job.shareActive ? (
            <Link href={`/sign/${job.shareToken}`} className="job-choice job-choice-fill" style={{ background: accent, color: accentInk }}>
              <span className="text-3xl leading-none">→</span>
              Get a quote
            </Link>
          ) : (
            <p className="job-choice job-choice-fill" style={{ background: accent, color: accentInk }}>
              Turn the link back on to get a quote
            </p>
          )}
        </div>
        {job.shareActive ? (
          <SendQuote
            customerName={job.customerName}
            businessName={user.businessName}
            email={job.email}
            phone={job.phone}
            url={shareUrl}
          />
        ) : (
          <p className="text-stone">The customer link is switched off, so the quote cannot be sent until you make a new link.</p>
        )}
        <Link href={`/jobs/${job.id}/sheet`} className="btn btn-secondary w-full">
          Job sheet · no prices
        </Link>
      </section>

      <section id="payment" className="card grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Payment terms</h2>
          <span className="job-status-pill">{job.depositPence ? `${depositPercent ?? "A"}% deposit` : "No deposit"}</span>
        </div>
        <InlineForm action={savePaymentTerms} className="grid gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="choice-card">
              <span className="flex items-center gap-2 font-extrabold">
                <input type="radio" name="depositMode" value="deposit" defaultChecked={job.depositPence != null} />
                Deposit
              </span>
              <span className="mt-1 block text-sm text-stone">Deposit on signing, balance on completion.</span>
              <span className="mt-3 flex items-center gap-2">
                <input
                  name="depositPercent"
                  inputMode="numeric"
                  className="plain-input w-24"
                  defaultValue={String(depositPercent ?? 25)}
                  aria-label="Deposit percent"
                />
                <span className="font-bold">%</span>
              </span>
            </label>
            <label className="choice-card">
              <span className="flex items-center gap-2 font-extrabold">
                <input type="radio" name="depositMode" value="none" defaultChecked={job.depositPence == null} />
                No deposit
              </span>
              <span className="mt-1 block text-sm text-stone">Full payment on completion.</span>
            </label>
          </div>
          <p className="text-sm text-stone">
            The quote, the contract, and the customer’s page say “{paymentNote(job.depositPence)}”
            {depositPercent != null &&
            depositFromPercent(customerTotal.totalPence, depositPercent) !== job.depositPence
              ? ` The saved deposit is ${formatPence(job.depositPence ?? 0)}.`
              : "."}
          </p>
          <SubmitButton>Save payment terms</SubmitButton>
        </InlineForm>
      </section>

      <SignOffPanel
        job={job}
        shareUrl={shareUrl}
        changes={changes}
        damaged={Boolean(job.signOff) && !locked}
        accent={accent}
        accentInk={accentInk}
        message={message}
      />

      <section id="materials" className="card grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl">Materials</h2>
          <p className="font-display text-2xl">{job.showLinePrices ? formatPence(customerTotal.totalPence) : "Prices hidden"}</p>
        </div>
        {customerTotal.unpricedCount > 0 ? (
          <p className="text-stone">
            {customerTotal.unpricedCount} {customerTotal.unpricedCount === 1 ? "item has" : "items have"} no customer
            price. The total covers priced items only.
          </p>
        ) : null}
        {job.materials.length === 0 ? <p className="text-stone">No materials yet. Add them from the chooser.</p> : null}
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
                  {material.unitPricePence == null ? "" : ` · ${formatPence(material.unitPricePence)}`}
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
        {library.templates.length === 0 ? (
          <p>
            <Link href="/library" className="font-bold underline" style={{ color: accent }}>
              Save common lists in the library
            </Link>
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2 className="font-display text-2xl">The work</h2>
        <p className="mt-2 whitespace-pre-wrap text-lg">{job.description}</p>
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
          <p>This removes the job, the materials, and any signed agreement. The customer link will stop working.</p>
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
  accent,
  accentInk,
  message,
}: {
  job: DeskJob;
  shareUrl: string;
  changes: string[];
  damaged: boolean;
  accent: string;
  accentInk: string;
  message: string;
}) {
  return (
    <>
      <section className="card grid gap-3">
        <h2 className="font-display text-2xl">Customer acceptance</h2>
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
          <>
            <p>Get the customer to sign the quote here on the tablet, or send them a private link to sign on their phone.</p>
            <div className="flex flex-wrap gap-2">
              {job.shareActive ? (
                <Link href={`/sign/${job.shareToken}#quote-contract`} className="btn" style={{ background: accent, color: accentInk }}>
                  Customer accepts
                </Link>
              ) : null}
              <a href="#portal" className="btn btn-secondary">
                Send for signature
              </a>
            </div>
          </>
        )}
      </section>

      <section id="portal" className="card grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Customer link</h2>
          <span className={job.shareActive ? "status-complete" : "status-enquiry"}>
            {job.shareActive ? "Link active" : "Link revoked"}
          </span>
        </div>
        <p className="text-stone">
          One private page for {job.customerName}: their quote to sign, or the copy they already signed. Notes and your
          costs stay off it.
        </p>
        {job.shareActive ? (
          <>
            <p className="overflow-x-auto rounded-xl bg-[#f4f6f8] px-3 py-3 font-mono text-sm">{shareUrl}</p>
            <SharePortal
              url={shareUrl}
              title={`Quotation for ${job.customerName}`}
              message={message}
              email={job.email}
              phone={job.phone}
            />
            <Link href={`/sign/${job.shareToken}`} className="font-extrabold underline" style={{ color: accent }}>
              Preview ↗
            </Link>
          </>
        ) : (
          <p>This link is switched off. The old address no longer opens the quotation.</p>
        )}
        {job.signOff ? (
          <p className="text-sm text-stone">The link stays so they can open the agreed copy. It cannot be replaced after a signature.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            <form action={rotateShareLink}>
              <input type="hidden" name="jobId" value={job.id} />
              <button className="font-extrabold underline" style={{ color: accent }} type="submit">
                New link
              </button>
            </form>
            {job.shareActive ? (
              <form action={revokeShareLink}>
                <input type="hidden" name="jobId" value={job.id} />
                <button className="font-extrabold text-clay underline" type="submit">
                  Revoke link
                </button>
              </form>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
