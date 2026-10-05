import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { agreementChanges, parseLockedAgreement, toPublicAgreement } from "@/lib/agreement";
import { JOB_STATUSES, STATUS_LABELS, slotLabel, visibleTradeLabel } from "@/lib/constants";
import { quoteMessage } from "@/lib/customer-message";
import { formatDocumentNumber, quoteIsExpired } from "@/lib/documents";
import { formatIsoDate, formatLondonDateTime, londonToday } from "@/lib/dates";
import { bookingKindLabel } from "@/lib/diary";
import type { DeskJob } from "@/lib/desk";
import { quoteStatusLabel } from "@/lib/job-desk";
import { costTotals, materialsTotals } from "@/lib/materials";
import { formatPence } from "@/lib/money";
import { depositFromPercent, paymentNote, percentFromDeposit, pricesIncludeVatLine, quoteMoney } from "@/lib/quote";
import { raiseInvoice, saveQuoteValidity } from "@/server/actions/customer-finish";
import { savePaymentTerms, saveQuoteVat, setShowLinePrices } from "@/server/actions/job-desk";
import {
  deleteJob,
  revokeShareLink,
  rotateShareLink,
  saveJobAsTemplate,
  setJobStatus,
  updateJob,
} from "@/server/actions/jobs";
import { deleteJobMaterial, toggleMaterialBought } from "@/server/actions/materials";
import { brandedEmailReady } from "@/server/email";
import { isInternalCrewName, startingCrew } from "@/lib/crew";
import { formatM2, roomAreas, type MeasureMode } from "@/lib/measure";
import { CrewForm } from "@/components/crew-form";
import { EmptyState } from "@/components/empty-state";
import { getJob, getLibrary, listCrewRates, listJobCrew, listJobInvoices, listJobPhotos, listRoomMeasures, requireUser } from "@/server/dal";
import { requestOrigin } from "@/server/origin";
import { InlineForm } from "@/components/inline-form";
import { DeletePhotoForm, JobPhotoForm, PhotoShareButton, ShowPhotosForm } from "@/components/job-photo-form";
import { JobForm } from "@/components/job-form";
import { PHOTO_STAGE_LABELS } from "@/lib/photos";
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
  const photos = await listJobPhotos(user.businessId, job.id);
  const invoices = await listJobInvoices(user.businessId, job.id);
  const measured = await listRoomMeasures(user.businessId, job.id);
  const [crewRates, jobCrew] = await Promise.all([listCrewRates(user.businessId), listJobCrew(user.businessId, job.id)]);
  const crewArea = (measured?.rooms ?? []).reduce(
    (sum, room) => sum + roomAreas({ ...room, mode: (["room", "elevation", "floor", "direct"].includes(room.mode) ? room.mode : "room") as MeasureMode }).netM2,
    0,
  );
  const crewStart = startingCrew({
    defaults: crewRates,
    saved: jobCrew.length > 0 ? jobCrew : null,
    legacyDayRatePence: jobCrew.length > 0 ? null : measured?.dayRatePence,
    legacyDays: measured?.dayCount,
  });
  const origin = await requestOrigin();
  const shareUrl = origin ? `${origin}/sign/${job.shareToken}` : `/sign/${job.shareToken}`;
  const locked = job.signOff ? parseLockedAgreement(job.signOff.snapshot) : null;
  const changes = locked ? agreementChanges(locked, toPublicAgreement(job)) : [];
  const customerTotal = materialsTotals(job.materials.filter((material) => !isInternalCrewName(material.name)));
  const price = quoteMoney({
    subtotalPence: customerTotal.totalPence,
    vatRegistered: job.vatRegistered,
    vatRatePercent: job.vatRatePercent,
    depositPence: job.depositPence,
  });
  const tradeCost = costTotals(job.materials);
  const accent = user.branding.accentColour;
  const accentInk = user.branding.accentInk;
  const quoteStatus = quoteStatusLabel(job.status, job.showLinePrices);
  const itemCount = job.materials.length;
  const depositPercent = percentFromDeposit(price.totalPence, job.depositPence);
  const tradeBit = visibleTradeLabel(job.trade);
  const message = quoteMessage({
    customerName: job.customerName,
    businessName: user.businessName,
    url: shareUrl,
  });
  const quoteRef = formatDocumentNumber("Q", job.quoteNumber);
  const expired = quoteIsExpired(job.validUntil, londonToday(), Boolean(job.signOff));
  const canAskReview = job.status === "COMPLETE" || invoices.some((invoice) => invoice.standing === "Paid");
  const brandedReady = brandedEmailReady();

  return (
    <div className="mx-auto grid max-w-3xl gap-4" style={{ "--job-accent": accent } as CSSProperties}>
      <p>
        <Link href="/jobs" className="font-bold underline" style={{ color: accent }}>
          Jobs
        </Link>
      </p>
      <header className="grid gap-2">
        <h1 className="font-display text-5xl leading-tight tracking-tight">{job.customerName}</h1>
        <p>{job.address}</p>
        <p className="font-bold text-stone">
          {[tradeBit, formatIsoDate(job.scheduledDate, "long"), slotLabel(job.timeSlot)].filter(Boolean).join(" · ")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/jobs/${job.id}/book`} className="btn btn-primary min-h-[4.5rem] w-full text-xl">
            Book in on diary
          </Link>
          <Link href={`/jobs/${job.id}/choose`} className="btn" style={{ background: accent, color: accentInk }}>
            Choose a job / add materials
          </Link>
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
      {job.bookingKind !== "job" || job.spanDays > 1 || job.assignedName.trim() || !job.onDiary ? (
        <p className="font-bold">
          {[
            bookingKindLabel(job.bookingKind),
            job.spanDays > 1 ? `${job.spanDays} days` : null,
            job.assignedName.trim() || null,
            job.onDiary ? null : "Date still to book",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">{quoteRef}</h2>
          {job.lastViewedAt ? (
            <p className="font-extrabold">✓ Viewed {formatLondonDateTime(job.lastViewedAt)}</p>
          ) : (
            <p className="text-stone">Not opened yet</p>
          )}
        </div>
        <p>
          Valid until {formatIsoDate(job.validUntil, "long")}
          {expired ? " · Expired" : ""}
        </p>
        {job.signOff ? null : (
          <InlineForm action={saveQuoteValidity} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="jobId" value={job.id} />
            <label className="field">
              Valid until
              <input name="validUntil" type="date" defaultValue={job.validUntil} required />
            </label>
            <SubmitButton variant="secondary">Save date</SubmitButton>
          </InlineForm>
        )}
      </section>

      <section className="card grid gap-4">
        <h2 className="text-center font-display text-3xl leading-tight">
          That&apos;s {itemCount} {itemCount === 1 ? "item" : "items"}! Now I want to…
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/jobs/${job.id}/choose`} className="job-choice" style={{ color: accent, borderColor: accent }}>
            <span className="text-3xl leading-none">+</span>
            Choose a job / add materials
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
            brandedReady={brandedReady}
            jobId={job.id}
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
            depositFromPercent(price.totalPence, depositPercent) !== job.depositPence
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

      {measured && measured.rooms.length > 0 ? (
        <section className="card grid gap-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-2xl">Rooms</h2>
            <Link
              href={
                measured.measureTypeKey.startsWith("template:")
                  ? `/jobs/${job.id}/measure?template=${measured.measureTypeKey.slice("template:".length)}`
                  : `/jobs/${job.id}/measure?starter=${measured.measureTypeKey}`
              }
              className="font-bold underline"
              style={{ color: accent }}
            >
              Change the sizes
            </Link>
          </div>
          <p className="text-stone">{measured.measureTypeName}</p>
          <ul className="grid gap-1">
            {measured.rooms.map((room, index) => (
              <li key={`${room.name}-${index}`}>
                {room.name} · {formatM2(roomAreas({ ...room, mode: room.mode as MeasureMode }).netM2)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CrewForm
        jobId={job.id}
        initialDays={crewStart.days}
        initialRoles={crewStart.roles}
        totalM2={crewArea}
        accent={accent}
        accentInk={accentInk}
      />

      <section id="materials" className="card grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl">Materials</h2>
          {job.showLinePrices ? (
            <div className="text-right">
              {price.vatPence != null ? (
                <>
                  <p>Subtotal {formatPence(price.subtotalPence)}</p>
                  <p>
                    VAT ({job.vatRatePercent}%) {formatPence(price.vatPence)}
                  </p>
                  <p className="font-display text-2xl">Total {formatPence(price.totalPence)}</p>
                  <p className="text-sm font-bold">{pricesIncludeVatLine(job.vatRatePercent)}</p>
                </>
              ) : (
                <p className="font-display text-2xl">{formatPence(price.totalPence)}</p>
              )}
            </div>
          ) : (
            <p className="font-display text-2xl">Prices hidden</p>
          )}
        </div>
        <InlineForm action={saveQuoteVat} className="grid gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="omitVat" value="no" />
          <label className="flex items-start gap-3 text-lg font-bold">
            <input type="checkbox" name="omitVat" value="yes" defaultChecked={job.omitVat} className="mt-1 h-7 w-7" />
            <span>
              No VAT on this quote
              <span className="mt-1 block text-sm font-semibold text-stone">
                {job.omitVat
                  ? "VAT is turned off for this quote. Untick it to follow the Business page."
                  : job.vatRegistered
                    ? `VAT at ${job.vatRatePercent}% is added to the customer price. Tick this to leave it off.`
                    : "This business is not VAT registered, so this quote has no VAT."}
                {job.signOff ? " The signed copy keeps the VAT it was agreed with." : ""}
              </span>
            </span>
          </label>
          <SubmitButton variant="secondary">Save VAT</SubmitButton>
        </InlineForm>
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

      <section className="card grid gap-3">
        <h2 className="font-display text-2xl">Invoice</h2>
        {invoices.length === 0 ? <p className="text-stone">No invoice yet. The lines are copied from this quote.</p> : null}
        <ul className="grid gap-2">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link href={`/invoices/${invoice.id}`} className="font-extrabold underline" style={{ color: accent }}>
                {invoice.reference}
              </Link>
              <span className="text-stone"> · {invoice.standing}</span>
            </li>
          ))}
        </ul>
        <InlineForm action={raiseInvoice} className="grid gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          {job.depositPence ? (
            <label className="flex items-center gap-3 font-bold">
              <input type="checkbox" name="depositTaken" value="yes" defaultChecked={Boolean(job.signOff)} />
              Deposit already taken ({formatPence(job.depositPence)})
            </label>
          ) : null}
          <SubmitButton>Raise invoice</SubmitButton>
        </InlineForm>
      </section>

      <section id="photos" className="card grid gap-4">
        <h2 className="font-display text-2xl">Before and after</h2>
        <p className="text-stone">Add several photos from the camera or gallery. They are stored with this job.</p>
        <ShowPhotosForm jobId={job.id} showPhotos={job.showPhotos} />
        {photos.length === 0 ? <EmptyState compact>No photos yet.</EmptyState> : null}
        <ul className="grid gap-4 sm:grid-cols-2">
          {photos.map((photo) => {
            const src = `/jobs/${job.id}/photos/${photo.id}`;
            const filename = `${photo.stage.toLowerCase()}.webp`;
            return (
              <li key={photo.id} className="grid gap-2">
                <div className="photo-zoom rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                </div>
                <p className="font-extrabold">{PHOTO_STAGE_LABELS[photo.stage]}</p>
                <div className="grid grid-cols-2 gap-2">
                  <a className="btn btn-secondary" href={`${src}?download=1`}>
                    Download
                  </a>
                  <PhotoShareButton src={src} filename={filename} />
                </div>
                <DeletePhotoForm photoId={photo.id} />
              </li>
            );
          })}
        </ul>
        <JobPhotoForm jobId={job.id} />
      </section>

      {canAskReview ? (
        <section id="review" className="card grid gap-3">
          <h2 className="font-display text-2xl">Ask for a review</h2>
          {user.branding.reviewUrl ? (
            <SendQuote
              customerName={job.customerName}
              businessName={user.businessName}
              email={job.email}
              phone={job.phone}
              url={user.branding.reviewUrl}
              kind="review"
              brandedReady={brandedReady}
              jobId={job.id}
            />
          ) : (
            <p>
              Add a review link on the{" "}
              <Link href="/settings" className="font-bold underline" style={{ color: accent }}>
                Business
              </Link>{" "}
              page, then you can send it from here.
            </p>
          )}
        </section>
      ) : null}

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
