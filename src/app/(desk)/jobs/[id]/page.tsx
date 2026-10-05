import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { agreementChanges, parseLockedAgreement, toPublicAgreement } from "@/lib/agreement";
import { slotLabel } from "@/lib/constants";
import { customerSubtotalPence, hidesMaterialLines, poundsFieldValue, scopeLine } from "@/lib/customer-price";
import { quoteMessage, whatsAppHref } from "@/lib/customer-message";
import { formatDocumentNumber, quoteIsExpired } from "@/lib/documents";
import { formatIsoDate, formatLondonDateTime, londonToday } from "@/lib/dates";
import { bookingKindLabel } from "@/lib/diary";
import { jobNextStep, openJobSection } from "@/lib/job-next";
import { costTotals, materialsTotals } from "@/lib/materials";
import { formatPence } from "@/lib/money";
import { depositFromPercent, paymentNote, percentFromDeposit, pricesIncludeVatLine, quoteMoney } from "@/lib/quote";
import { raiseInvoice, saveQuoteValidity } from "@/server/actions/customer-finish";
import { saveCustomerPrice, savePaymentTerms, saveQuoteVat, setShowLinePrices } from "@/server/actions/job-desk";
import { deleteJob, revokeShareLink, rotateShareLink, saveJobAsTemplate, updateJob } from "@/server/actions/jobs";
import { deleteJobMaterial, toggleMaterialBought } from "@/server/actions/materials";
import { brandedEmailReady } from "@/server/email";
import { isInternalCrewName, startingCrew } from "@/lib/crew";
import { formatM2, roomAreas, type MeasureMode } from "@/lib/measure";
import { CrewForm } from "@/components/crew-form";
import { JobStatusRow } from "@/components/job-status-row";
import { getJob, getLibrary, listCrewRates, listJobCrew, listJobInvoices, listRoomMeasures, requireUser } from "@/server/dal";
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
  const customerSubtotal = customerSubtotalPence({
    materialsTotalPence: customerTotal.totalPence,
    fixedPricePence: job.fixedPricePence,
  });
  const price = quoteMoney({
    subtotalPence: customerSubtotal,
    vatRegistered: job.vatRegistered,
    vatRatePercent: job.vatRatePercent,
    depositPence: job.depositPence,
  });
  const tradeCost = costTotals(job.materials);
  const accent = user.branding.accentColour;
  const accentInk = user.branding.accentInk;
  const depositPercent = percentFromDeposit(price.totalPence, job.depositPence);
  const message = quoteMessage({
    customerName: job.customerName,
    businessName: user.businessName,
    url: shareUrl,
  });
  const quoteRef = formatDocumentNumber("Q", job.quoteNumber);
  const expired = quoteIsExpired(job.validUntil, londonToday(), Boolean(job.signOff));
  const canAskReview = job.status === "COMPLETE" || invoices.some((invoice) => invoice.standing === "Paid");
  const brandedReady = brandedEmailReady();
  const step = jobNextStep({
    quoteStage: job.quoteStage,
    status: job.status,
    onDiary: job.onDiary,
    signed: Boolean(job.signOff),
    jobId: job.id,
  });
  const open = openJobSection(step.id);
  const hello = whatsAppHref(job.phone, `Hello ${job.customerName.trim().split(/\s+/)[0] || "there"},`);

  return (
    <div className="mx-auto grid max-w-3xl gap-4" style={{ "--job-accent": accent } as CSSProperties}>
      <p>
        <Link href="/jobs" className="font-bold underline" style={{ color: accent }}>
          Jobs
        </Link>
      </p>
      <header className="grid gap-3">
        <h1 className="font-display text-5xl leading-tight tracking-tight">{job.customerName}</h1>
        <p className="text-lg">{job.address}</p>
        <p className="text-sm font-bold text-stone">
          {formatIsoDate(job.scheduledDate, "long")} · {slotLabel(job.timeSlot)}
          {job.onDiary ? "" : " · Not on the diary yet"}
        </p>
        <div className="flex gap-2">
          <IconLink href={telHref(job.phone)} label="Call">
            <PhoneIcon />
          </IconLink>
          <IconLink
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
            label="Map"
            external
          >
            <MapIcon />
          </IconLink>
          <IconLink href={hello} label="WhatsApp" external>
            <WhatsAppIcon />
          </IconLink>
        </div>
      </header>

      <JobStatusRow jobId={job.id} quoteStage={job.quoteStage} status={job.status} accent={accent} accentInk={accentInk} />

      {step.id === "materials" || step.id === "send" || step.id === "book" ? (
        <Link href={step.href} className="btn btn-primary min-h-[4.5rem] w-full text-xl">
          {step.label}
        </Link>
      ) : null}
      {step.id === "waiting" ? (
        <div className="grid gap-2">
          <p className="btn btn-primary min-h-[4.5rem] w-full text-xl">Waiting for signature</p>
          <a href="#send-row" className="btn btn-secondary min-h-14 w-full text-lg">
            Send it again
          </a>
        </div>
      ) : null}
      {step.id === "invoice" ? (
        <InlineForm action={raiseInvoice} className="grid gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          {job.depositPence ? (
            <label className="flex min-h-12 items-center gap-3 font-bold">
              <input type="checkbox" name="depositTaken" value="yes" defaultChecked={Boolean(job.signOff)} className="h-7 w-7" />
              Deposit already taken ({formatPence(job.depositPence)})
            </label>
          ) : null}
          <SubmitButton className="min-h-[4.5rem] text-xl sm:w-full">Raise invoice</SubmitButton>
        </InlineForm>
      ) : null}
      {step.id === "done" ? <p className="rounded-2xl border border-line bg-white px-4 py-4 text-xl font-extrabold">Job finished</p> : null}
      {step.id === "lost" ? <p className="rounded-2xl border border-line bg-white px-4 py-4 text-xl font-extrabold">This quote is lost</p> : null}

      <Fold title="1. Price" open={open === "price"}>
        <p className="font-display text-4xl leading-none">{formatPence(price.totalPence)}</p>
        {price.vatPence != null ? (
          <p className="text-sm font-bold text-stone">
            {formatPence(price.subtotalPence)} + VAT {formatPence(price.vatPence)}. {pricesIncludeVatLine(job.vatRatePercent)}
          </p>
        ) : (
          <p className="text-sm font-bold text-stone">No VAT on this quote.</p>
        )}
        <form action={setShowLinePrices}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="showLinePrices" value={job.showLinePrices ? "no" : "yes"} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-extrabold">Item prices on the quote</p>
            <button className="btn btn-secondary min-h-14 min-w-28" type="submit">
              {job.showLinePrices ? "On" : "Off"}
            </button>
          </div>
        </form>
        <InlineForm action={saveCustomerPrice} className="grid gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="totalOnly" value="no" />
          <label className="flex items-start gap-3 text-lg font-bold">
            <input type="checkbox" name="totalOnly" value="yes" defaultChecked={job.totalOnly} className="mt-1 h-7 w-7" />
            <span>
              Total only
              <span className="mt-1 block text-sm font-semibold text-stone">
                The customer sees “{scopeLine(job.trade)}” and the total. You still see the materials here.
              </span>
            </span>
          </label>
          <label className="field">
            Price the whole job
            <span>Before VAT. Leave blank to charge {formatPence(customerTotal.totalPence)} from the materials and labour.</span>
            <input
              name="fixedPrice"
              inputMode="decimal"
              defaultValue={poundsFieldValue(job.fixedPricePence)}
              placeholder="1079.00"
              className="text-2xl"
            />
          </label>
          {hidesMaterialLines(job) ? (
            <p className="font-bold">
              Customer sees {formatPence(price.subtotalPence)}
              {price.vatPence != null ? ` plus VAT, ${formatPence(price.totalPence)}` : ""}
            </p>
          ) : null}
          <SubmitButton variant="secondary">Save price</SubmitButton>
        </InlineForm>
        <InlineForm action={saveQuoteVat} className="grid gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="omitVat" value="no" />
          <label className="flex items-center gap-3 text-lg font-bold">
            <input type="checkbox" name="omitVat" value="yes" defaultChecked={job.omitVat} className="h-7 w-7" />
            No VAT on this quote
          </label>
          <SubmitButton variant="secondary">Save VAT</SubmitButton>
        </InlineForm>
        {step.id === "materials" ? null : (
          <Link href={`/jobs/${job.id}/choose`} className="btn btn-secondary w-full">
            Add materials
          </Link>
        )}
        {customerTotal.unpricedCount > 0 ? (
          <p className="text-stone">
            {customerTotal.unpricedCount} {customerTotal.unpricedCount === 1 ? "item has" : "items have"} no price yet.
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
        <div className="private-panel rounded-2xl p-4">
          <h3 className="font-bold">Your costs</h3>
          <p className="text-sm text-stone">Hidden from the customer.</p>
          <p className="mt-1 font-display text-2xl">{formatPence(tradeCost.totalPence)}</p>
        </div>
        <div id="payment" className="grid gap-3 border-t border-line pt-4">
          <h3 className="font-display text-2xl">Payment</h3>
          <p className="font-bold">{job.depositPence ? `Deposit ${formatPence(job.depositPence)}` : "No deposit"}</p>
          <InlineForm action={savePaymentTerms} className="grid gap-3">
            <input type="hidden" name="jobId" value={job.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="choice-card">
                <span className="flex items-center gap-2 font-extrabold">
                  <input type="radio" name="depositMode" value="deposit" defaultChecked={job.depositPence != null} />
                  Deposit
                </span>
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
                <span className="mt-1 block text-sm text-stone">Pay when the work is finished.</span>
              </label>
            </div>
            <p className="text-sm text-stone">{paymentNote(job.depositPence)}</p>
            {depositPercent != null && depositFromPercent(price.totalPence, depositPercent) !== job.depositPence ? (
              <p className="text-sm text-stone">Saved deposit {formatPence(job.depositPence ?? 0)}.</p>
            ) : null}
            <SubmitButton variant="secondary">Save payment</SubmitButton>
          </InlineForm>
        </div>
        {measured && measured.rooms.length > 0 ? (
          <div className="grid gap-2 border-t border-line pt-4">
            <div className="flex items-end justify-between gap-2">
              <h3 className="font-display text-2xl">Rooms</h3>
              <Link
                href={
                  measured.measureTypeKey.startsWith("template:")
                    ? `/jobs/${job.id}/measure?template=${measured.measureTypeKey.slice("template:".length)}`
                    : `/jobs/${job.id}/measure?starter=${measured.measureTypeKey}`
                }
                className="font-bold underline"
                style={{ color: accent }}
              >
                Change sizes
              </Link>
            </div>
            <ul className="grid gap-1">
              {measured.rooms.map((room, index) => (
                <li key={`${room.name}-${index}`}>
                  {room.name} · {formatM2(roomAreas({ ...room, mode: room.mode as MeasureMode }).netM2)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <CrewForm
          jobId={job.id}
          initialDays={crewStart.days}
          initialRoles={crewStart.roles}
          totalM2={crewArea}
          accent={accent}
          accentInk={accentInk}
          nested
        />
        {job.materials.length > 0 ? (
          <InlineForm action={saveJobAsTemplate} className="grid gap-3 border-t border-line pt-4">
            <h3 className="font-display text-xl">Save as a template</h3>
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
              Library
            </Link>
          </p>
        ) : null}
      </Fold>

      <Fold title="2. Quote and send" open={open === "quote"} id="quote">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-3xl">{quoteRef}</h3>
          <p className="font-bold">{job.lastViewedAt ? `Opened ${formatLondonDateTime(job.lastViewedAt)}` : "Not opened yet"}</p>
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
        {job.signOff ? (
          <div className="rounded-2xl bg-moss p-4">
            <p className="font-bold">
              Signed by {job.signOff.signerName} on {formatLondonDateTime(job.signOff.signedAt)}.
            </p>
            {job.signOff && !locked ? (
              <p className="mt-2 font-bold text-clay">The locked copy could not be read. It has not been replaced.</p>
            ) : null}
            {changes.length > 0 ? (
              <p className="mt-2">Changed since they signed ({changes.join(", ")}). Their copy stays as it was.</p>
            ) : (
              <p className="mt-2">Still matches what they signed.</p>
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
          <div className="flex flex-wrap gap-2">
            {job.shareActive ? (
              <Link href={`/sign/${job.shareToken}#quote-contract`} className="btn btn-secondary">
                Take the signature here
              </Link>
            ) : (
              <p className="text-stone">The customer link is off.</p>
            )}
            {job.shareActive ? (
              <Link href={`/sign/${job.shareToken}`} className="btn btn-secondary">
                Open the quote
              </Link>
            ) : null}
          </div>
        )}
        {job.shareActive ? (
          <SendQuote
            customerName={job.customerName}
            businessName={user.businessName}
            email={job.email}
            phone={job.phone}
            url={shareUrl}
            brandedReady={brandedReady}
            jobId={job.id}
            layout="row"
          />
        ) : (
          <p className="text-stone">Turn the link back on before sending.</p>
        )}
        <details>
          <summary className="cursor-pointer font-bold">Customer link</summary>
          <div className="mt-3 grid gap-3">
            <p className={job.shareActive ? "font-bold" : "font-bold text-stone"}>{job.shareActive ? "Link on" : "Link off"}</p>
            {job.shareActive ? (
              <>
                <p className="overflow-x-auto rounded-xl bg-[#f4f6f8] px-3 py-3 font-mono text-sm">{shareUrl}</p>
                <SharePortal url={shareUrl} title={`Quotation for ${job.customerName}`} message={message} email={job.email} phone={job.phone} />
              </>
            ) : (
              <p>The old address no longer opens the quote.</p>
            )}
            {job.signOff ? (
              <p className="text-sm text-stone">They can still open the signed copy. The link cannot be replaced.</p>
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
                      Turn link off
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        </details>
      </Fold>

      <Fold title="3. Diary" open={open === "diary"}>
        <p className="text-lg font-bold">
          {[
            bookingKindLabel(job.bookingKind),
            job.spanDays > 1 ? `${job.spanDays} days` : "1 day",
            formatIsoDate(job.scheduledDate, "long"),
            job.onDiary ? "On the diary" : "Not on the diary yet",
            job.assignedName.trim() || null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {step.id === "book" ? (
          <p className="text-stone">Use Book the job in above to pick the date.</p>
        ) : (
          <Link href={`/jobs/${job.id}/book`} className="btn btn-secondary w-full">
            Change the date
          </Link>
        )}
      </Fold>

      <Fold title="4. Invoice" open={open === "invoice"}>
        {invoices.length === 0 ? <p className="text-stone">No invoice yet.</p> : null}
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
        {step.id === "invoice" ? null : (
          <InlineForm action={raiseInvoice} className="grid gap-3">
            <input type="hidden" name="jobId" value={job.id} />
            {job.depositPence ? (
              <label className="flex items-center gap-3 font-bold">
                <input type="checkbox" name="depositTaken" value="yes" defaultChecked={Boolean(job.signOff)} className="h-7 w-7" />
                Deposit already taken ({formatPence(job.depositPence)})
              </label>
            ) : null}
            <SubmitButton variant="secondary">Raise invoice</SubmitButton>
          </InlineForm>
        )}
      </Fold>

      <Fold title="5. Notes and job sheet" open={false}>
        <h3 className="font-display text-2xl">The work</h3>
        <p className="whitespace-pre-wrap text-lg">{job.description}</p>
        <div className="private-panel rounded-2xl p-4">
          <h3 className="font-display text-2xl">Notes</h3>
          <p className="text-sm font-bold text-stone">The customer never sees this.</p>
          <p className="mt-2 whitespace-pre-wrap">{job.internalNotes || "None yet."}</p>
        </div>
        <Link href={`/jobs/${job.id}/sheet`} className="btn btn-secondary w-full">
          Job sheet
        </Link>
        {canAskReview ? (
          user.branding.reviewUrl ? (
            <div className="grid gap-2">
              <h3 className="font-display text-2xl">Ask for a review</h3>
              <SendQuote
                customerName={job.customerName}
                businessName={user.businessName}
                email={job.email}
                phone={job.phone}
                url={user.branding.reviewUrl}
                kind="review"
                brandedReady={brandedReady}
                jobId={job.id}
                layout="row"
              />
            </div>
          ) : (
            <p>
              Add a review link on the{" "}
              <Link href="/settings" className="font-bold underline" style={{ color: accent }}>
                Business
              </Link>{" "}
              page.
            </p>
          )
        ) : null}
      </Fold>

      <div className="flex flex-wrap items-start justify-between gap-4 px-1 pb-4 text-sm">
        <details className="max-w-full">
          <summary className="cursor-pointer font-bold underline">Edit customer</summary>
          <div className="mt-4">
            <JobForm action={updateJob} submitLabel="Save changes" defaultDate={job.scheduledDate} job={job} />
          </div>
        </details>
        <details>
          <summary className="cursor-pointer font-bold text-clay">Delete job</summary>
          <form action={deleteJob} className="mt-3 grid max-w-sm gap-3">
            <p>This removes the job, the materials, and any signed agreement.</p>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton variant="danger">Delete permanently</SubmitButton>
          </form>
        </details>
      </div>
    </div>
  );
}

function Fold({
  title,
  open,
  id,
  children,
}: {
  title: string;
  open: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <details id={id} className="card group" {...(open ? { open: true } : {})}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-xl font-extrabold [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden className="text-2xl leading-none text-stone group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-4 grid gap-4">{children}</div>
    </details>
  );
}

function IconLink({
  href,
  label,
  external,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-line bg-white"
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 3h3l1.5 4-2 1.5a12 12 0 0 0 5 5L17 12l4 1.5V17a2 2 0 0 1-2 2A15 15 0 0 1 5 5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4a8 8 0 0 0-6.9 12L4 20l4.2-1.1A8 8 0 1 0 12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 10.5c.4 1.6 1.9 3 3.5 3.4l1.2-1.2.8.2c.6.2 1 .6 1.1 1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
