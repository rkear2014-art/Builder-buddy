import { canEditBusiness, deskHeroSrc, deskLogoSrc } from "@/lib/branding";
import { defaultTermsText } from "@/lib/terms";
import type { SessionUser } from "@/lib/desk";
import {
  removeBusinessLogo,
  removeHeroPhoto,
  saveAccent,
  saveOwnerName,
  saveQuoteSettings,
  saveTerms,
  uploadBusinessLogo,
  uploadHeroPhoto,
  useLogoAccent,
  useSampleHeroes,
  useSampleLogo,
} from "@/server/actions/branding";
import { saveBusinessExtras, sendTestEmail } from "@/server/actions/customer-finish";
import { saveReminderSettings } from "@/server/actions/reminders";
import { brandedEmailReady } from "@/server/email";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { PillLink } from "@/components/pill-link";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";
import { starterTemplatesFor } from "@/lib/trade-starters";
import { saveBusinessMeasure } from "@/server/actions/measure";
import { CREW_ROLES, poundsField } from "@/lib/crew";
import { getBusinessWastage, listCrewRates, listHeroPhotos, listLabourRates, requireUser } from "@/server/dal";
import { formatPence } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = { title: "Business" };

function countParam(value: string | undefined): number | null {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  return Number(value);
}

function savedMessage(saved: string | undefined, added: string | undefined): string | null {
  const count = countParam(added);
  switch (saved) {
    case "name":
      return "Your name was saved. The dashboard greeting uses it.";
    case "profile":
      return "Business details saved.";
    case "measure":
      return "Wastage and labour prices saved.";
    case "logo":
      return "Logo saved.";
    case "removed":
      return "Logo removed. The dashboard shows your business name, and the customer agreement has no picture.";
    case "sample":
      return "The AK Plastering logo is now on this business. You can replace it whenever you like.";
    case "hero":
      return count === 1 ? "Photo added. The dashboard shows one of your photos each visit." : "Photos added. The dashboard shows a different one each visit.";
    case "hero-removed":
      return "Photo removed. With none left, the dashboard uses the plaster gradient again.";
    case "heroes":
      if (count === 0) return "Those AK Plastering photos are already on this business. Nothing new was added.";
      if (count === 1) return "Added 1 AK Plastering photo. The dashboard shows a different photo each visit.";
      return `Added ${count ?? "the"} AK Plastering photos. The dashboard shows a different one each visit.`;
    case "accent":
      return "Accent colour saved.";
    case "quote":
      return "Quotation details saved.";
    case "terms":
      return "Terms and conditions saved.";
    case "extras":
      return "Payment terms, bank details, and trust badges saved.";
    case "reminders":
      return "Payment reminders saved.";
    case "test-email":
      return "Test email sent to the business email.";
    default:
      return null;
  }
}

function noticeMessage(notice: string | undefined): string | null {
  switch (notice) {
    case "owner":
      return "Only the owner can change the business details.";
    case "sample":
      return "That logo could not be used. Choose a PNG, JPG, or WebP picture instead.";
    case "accent":
      return "Add a logo first, then a colour can be taken from it.";
    case "heroes":
      return "Those photos could not be added. Try again, or upload your own.";
    case "heroes-full":
      return "This business already has 12 dashboard photos. Remove one before adding more.";
    case "wastage":
      return "Enter wastage from 0 to 100, and labour prices in pounds, or leave a labour price blank.";
    default:
      return null;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; notice?: string; added?: string }>;
}) {
  const user = await requireUser();
  const [photos, wastage, labourRates, crewRates] = await Promise.all([
    listHeroPhotos(user.businessId),
    getBusinessWastage(user.businessId),
    listLabourRates(user.businessId),
    listCrewRates(user.businessId),
  ]);
  const query = await searchParams;
  const saved = savedMessage(query.saved, query.added);
  const notice = noticeMessage(query.notice);
  const owner = canEditBusiness(user.role);

  return (
    <div className="grid max-w-xl gap-6">
      <div>
        <h1 className="font-display text-4xl">Business</h1>
        <p className="mt-1 text-stone">
          Your logo, colour, and contact details appear on the dashboard and on this business&apos;s customer agreement.
        </p>
      </div>

      {saved ? <p className="card font-bold">{saved}</p> : null}
      {notice ? (
        <p role="alert" className="rounded-xl bg-blush px-3 py-2 font-bold text-clay">
          {notice}
        </p>
      ) : null}

      <ReminderSection user={user} owner={owner} emailReady={brandedEmailReady()} />
      <OwnerNameSection user={user} owner={owner} />
      <LogoSection user={user} owner={owner} />
      <HeroSection user={user} owner={owner} photos={photos} />
      <AccentSection user={user} owner={owner} />
      <ProfileSection user={user} owner={owner} />
      <QuoteSection user={user} owner={owner} />
      <TermsSection user={user} owner={owner} />
      <ExtrasSection user={user} owner={owner} />
      <MeasureSection owner={owner} wastage={wastage} labourRates={labourRates} crewRates={crewRates} />
    </div>
  );
}

function ReminderSection({ user, owner, emailReady }: { user: SessionUser; owner: boolean; emailReady: boolean }) {
  const [first, second, third] = user.branding.reminderDays;
  return (
    <section id="reminders" className="card grid gap-4">
      <h2 className="font-display text-2xl">Payment reminders</h2>
      <p className="text-stone">
        When an issued invoice is still unpaid, a reminder goes out 3, 7, and 14 days after the due date. Change the
        days here, or turn reminders off.
      </p>
      {owner ? (
        <InlineForm action={saveReminderSettings} className="grid gap-3">
          <input type="hidden" name="remindersOn" value="no" />
          <label className="flex items-start gap-3 text-lg font-bold">
            <input
              type="checkbox"
              name="remindersOn"
              value="yes"
              defaultChecked={user.branding.remindersOn}
              className="mt-1 h-7 w-7"
            />
            <span>
              Reminders on
              <span className="mt-1 block text-sm font-semibold text-stone">
                {emailReady
                  ? "Branded email is set up, so each reminder is sent for you once. A customer with no email address still appears in To chase."
                  : "Branded email is not set up, so due reminders appear in To chase. Tap WhatsApp, text, or email there. Nothing is sent until you tap."}
              </span>
            </span>
          </label>
          <label className="field">
            First reminder
            <span>Days after the due date.</span>
            <input name="reminderDay1" inputMode="numeric" defaultValue={String(first)} />
          </label>
          <label className="field">
            Second reminder
            <span>Days after the due date.</span>
            <input name="reminderDay2" inputMode="numeric" defaultValue={String(second)} />
          </label>
          <label className="field">
            Third reminder
            <span>Days after the due date. After this, reminders stop.</span>
            <input name="reminderDay3" inputMode="numeric" defaultValue={String(third)} />
          </label>
          <SubmitButton>Save reminders</SubmitButton>
        </InlineForm>
      ) : (
        <p className="font-bold">
          Reminders are {user.branding.remindersOn ? "on" : "off"} at {first}, {second}, and {third} days. Only the
          owner can change these.
        </p>
      )}
    </section>
  );
}

function LogoSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Logo</h2>
      {user.branding.hasLogo ? (
        <div className="flex justify-center rounded-2xl bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={deskLogoSrc(user.branding.logoUpdatedAt)}
            alt={`${user.businessName} logo`}
            className="brand-logo brand-logo-home"
          />
        </div>
      ) : (
        <p className="text-stone">No logo yet. The dashboard shows your business name, and the customer agreement has no picture.</p>
      )}
      {owner ? (
        <>
          <InlineForm action={uploadBusinessLogo} className="grid gap-3">
            <label className="field">
              Upload a logo
              <span>PNG, JPG, or WebP. Up to 2 MB. It is resized before it is saved.</span>
              <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required />
            </label>
            <SubmitButton>Save logo</SubmitButton>
          </InlineForm>
          <div className="flex flex-wrap gap-2">
            <form action={useSampleLogo}>
              <button className="btn btn-secondary" type="submit">
                Use the AK Plastering logo
              </button>
            </form>
            <form action={useSampleHeroes}>
              <button className="btn btn-secondary" type="submit">
                Use the AK Plastering photos
              </button>
            </form>
            {user.branding.hasLogo ? (
              <form action={removeBusinessLogo}>
                <button className="btn btn-danger" type="submit">
                  Remove logo
                </button>
              </form>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-stone">
            The AK Plastering logo is a sample for this business. Pressing it again replaces the logo already saved
            here, including an older copy of this sample. The agreement uses the full logo. The dashboard uses a smaller
            mark of the AK. Use the AK Plastering photos adds any sample photos that are not already on this business.
            Other businesses are not given either unless their owner chooses them.
          </p>
        </>
      ) : (
        <p className="font-bold">Only the owner can change the logo.</p>
      )}
    </section>
  );
}

function HeroSection({
  user,
  owner,
  photos,
}: {
  user: SessionUser;
  owner: boolean;
  photos: Array<{ id: string; caption: string; updatedAt: string }>;
}) {
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Dashboard photos</h2>
      <p className="text-stone">
        Optional. The top card on the dashboard shows a different photo each visit, with a dark overlay so the greeting
        stays readable. With no photo, that card uses a plaster-coloured gradient.
      </p>
      {photos.length > 0 ? (
        <ul className="grid gap-3">
          {photos.map((photo) => (
            <li key={photo.id} className="grid gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deskHeroSrc(photo.id, photo.updatedAt)}
                alt={photo.caption || `${user.businessName} dashboard photo`}
                className="max-h-40 w-full rounded-2xl object-cover"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-stone">{photo.caption || "No caption"}</p>
                {owner ? (
                  <form action={removeHeroPhoto}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <button className="btn btn-danger" type="submit">
                      Remove
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-stone">No photos yet.</p>
      )}
      {owner ? (
        <InlineForm action={uploadHeroPhoto} className="grid gap-3">
          <label className="field">
            Add photos
            <span>PNG, JPG, or WebP. Up to 6 at a time, 2 MB each. You can keep 12.</span>
            <input name="hero" type="file" accept="image/png,image/jpeg,image/webp" multiple required />
          </label>
          <label className="field">
            Caption
            <span>Optional. Shown as a small label on the photo.</span>
            <input name="caption" maxLength={80} placeholder="Recent work" />
          </label>
          <SubmitButton>Add photos</SubmitButton>
        </InlineForm>
      ) : (
        <p className="font-bold">Only the owner can change the photos.</p>
      )}
    </section>
  );
}

function AccentSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Accent colour</h2>
      <p className="text-stone">
        Used for the New job button, links, and the strip on the dashboard. Uploading a logo fills this in when you
        have not chosen a colour yet.
      </p>
      <p className="flex items-center gap-3 font-bold">
        <span className="inline-block h-8 w-8 rounded-full" style={{ background: user.branding.accentColour }} />
        {user.branding.accentColour}
      </p>
      {owner ? (
        <>
          <InlineForm action={saveAccent} className="grid gap-3">
            <label className="field">
              Colour
              <input name="accent" type="color" defaultValue={user.branding.accentColour} className="h-14 w-24 p-1" />
            </label>
            <SubmitButton>Save colour</SubmitButton>
          </InlineForm>
          <form action={useLogoAccent}>
            <button className="btn btn-secondary" type="submit">
              Use a colour from the logo
            </button>
          </form>
        </>
      ) : (
        <p className="font-bold">Only the owner can change the colour.</p>
      )}
    </section>
  );
}

function OwnerNameSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  return (
    <section className="card grid gap-3">
      <h2 className="font-display text-2xl">Your name</h2>
      <p className="text-stone">
        The dashboard greeting uses this name. For example, Good evening, {user.name.trim() || "AK"}.
      </p>
      {owner ? (
        <InlineForm action={saveOwnerName} className="grid gap-3">
          <label className="field">
            Your name
            <input name="name" required maxLength={80} autoComplete="name" defaultValue={user.name} />
          </label>
          <SubmitButton>Save name</SubmitButton>
        </InlineForm>
      ) : (
        <>
          <p className="font-bold">{user.name}</p>
          <p className="font-bold">Only the owner can change this.</p>
        </>
      )}
    </section>
  );
}

function ProfileSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  const profile = {
    name: user.branding.name,
    phone: user.branding.phone,
    email: user.branding.email,
    address: user.branding.address,
    website: user.branding.website,
    tagline: user.branding.tagline,
  };
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Letterhead</h2>
      <p className="text-stone">
        The subtitle is the line under your business name. Phone, email, address, and website are optional. They are
        printed at the top of this business&apos;s customer agreement. The customer&apos;s own phone and email stay on the job.
      </p>
      {owner ? (
        <BusinessProfileForm initial={profile} />
      ) : (
        <dl className="grid gap-2">
          <div>
            <dt className="text-sm font-bold text-stone">Business name</dt>
            <dd>{profile.name}</dd>
          </div>
          <ProfileLine label="Subtitle" value={profile.tagline} />
          <ProfileLine label="Phone" value={profile.phone} />
          <ProfileLine label="Email" value={profile.email} />
          <ProfileLine label="Address" value={profile.address} />
          <ProfileLine label="Website" value={profile.website} />
          <p className="font-bold">Only the owner can change these.</p>
        </dl>
      )}
    </section>
  );
}

function QuoteSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  const branding = user.branding;
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Quotation</h2>
      <p className="text-stone">
        These appear on the customer quotation. The tagline and the town from your address are added as badges. Anything
        else, such as Fully insured, only shows if you write it here.
      </p>
      {owner ? (
        <InlineForm action={saveQuoteSettings} className="grid gap-3">
          <input type="hidden" name="vatRegistered" value="no" />
          <label className="flex items-center gap-3 text-lg font-bold">
            <input type="checkbox" name="vatRegistered" value="yes" defaultChecked={branding.vatRegistered} className="h-7 w-7" />
            VAT registered
          </label>
          <p className="text-sm text-stone">On for new quotes and draft invoices. Turn it off if this business is not VAT registered. The standard UK rate is 20%.</p>
          <label className="field">
            VAT rate
            <span>Percent. Used when VAT registered is ticked.</span>
            <input name="vatRatePercent" inputMode="numeric" defaultValue={String(branding.vatRatePercent)} className="text-2xl" />
          </label>
          <label className="field">
            VAT number
            <span>Shown on quotes and invoices. Leave blank to leave it off. For example GB123456789.</span>
            <input name="vatNumber" defaultValue={branding.vatNumber} autoComplete="off" placeholder="GB123456789" className="text-2xl" />
          </label>
          <input type="hidden" name="totalOnlyDefault" value="no" />
          <label className="flex items-start gap-3 text-lg font-bold">
            <input
              type="checkbox"
              name="totalOnlyDefault"
              value="yes"
              defaultChecked={branding.totalOnlyDefault}
              className="mt-1 h-7 w-7"
            />
            <span>
              Show customers the total only
              <span className="mt-1 block text-sm font-semibold text-stone">
                New quotes hide material lines, quantities and unit prices. The customer sees one line for the work, then
                subtotal, VAT and total. Change it on a job if that quote should list materials. Jobs already saved stay
                as they are.
              </span>
            </span>
          </label>
          <input type="hidden" name="showQuoteRooms" value="no" />
          <label className="flex items-start gap-3 text-lg font-bold">
            <input
              type="checkbox"
              name="showQuoteRooms"
              value="yes"
              defaultChecked={branding.showQuoteRooms}
              className="mt-1 h-7 w-7"
            />
            <span>
              Show rooms and materials on quotes
              <span className="mt-1 block text-sm font-semibold text-stone">
                The customer quote, the print copy and the quote email list each room and the materials with quantities.
                They never show a material price. A whole-job price still shows only the total. A job with no rooms or
                no materials leaves that section off.
              </span>
            </span>
          </label>
          <label className="field">
            Badges
            <span>One per line. Up to six, 40 characters each.</span>
            <textarea name="quoteChips" defaultValue={branding.quoteChips} placeholder={"Fully insured"} />
          </label>
          <label className="field">
            Covering letter
            <span>Leave this blank to use the standard letter. The customer’s name is added above it.</span>
            <textarea name="quoteLetter" defaultValue={branding.quoteLetter} placeholder="Thank you for asking us to quote for this work." />
          </label>
          <SubmitButton>Save quotation</SubmitButton>
        </InlineForm>
      ) : (
        <p className="font-bold">Only the owner can change the quotation.</p>
      )}
    </section>
  );
}

function TermsSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  const branding = user.branding;
  const shown = branding.terms.trim() ? branding.terms : defaultTermsText(branding);
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Terms and conditions</h2>
      <p className="text-stone">
        Printed at the bottom of every customer quote. Leave the box matching the standard wording, or clear it, and the
        footer keeps this business&apos;s saved name, address and phone.
      </p>
      {owner ? (
        <InlineForm action={saveTerms} className="grid gap-3">
          <label className="field">
            Terms and conditions
            <span>Numbered paragraphs stay as you type them. **double asterisks** make bold text.</span>
            <textarea name="terms" defaultValue={shown} className="terms-box" />
          </label>
          <SubmitButton>Save terms</SubmitButton>
        </InlineForm>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{shown}</p>
          <p className="font-bold">Only the owner can change these.</p>
        </>
      )}
    </section>
  );
}

function ExtrasSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  const branding = user.branding;
  const emailReady = brandedEmailReady();
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Invoices, quotes, and trust</h2>
      <p className="text-stone">
        Due dates, how long a quote stays valid, bank details, and the badges on quotes, invoices, and customer links.
        Insurance is only shown when you fill it in.
      </p>
      {owner ? (
        <InlineForm action={saveBusinessExtras} className="grid gap-3">
          <label className="field">
            Invoice due in
            <span>Days after the issue date. New invoices use this. 14 is the usual.</span>
            <input name="invoiceDueDays" inputMode="numeric" defaultValue={String(branding.invoiceDueDays)} />
          </label>
          <label className="field">
            Quote valid for
            <span>Days. New quotes use this. You can still change the date on a quote.</span>
            <input name="quoteValidDays" inputMode="numeric" defaultValue={String(branding.quoteValidDays)} />
          </label>
          <label className="field">
            Account name
            <input name="bankAccountName" defaultValue={branding.bankAccountName} />
          </label>
          <label className="field">
            Sort code
            <input name="bankSortCode" defaultValue={branding.bankSortCode} placeholder="12-34-56" />
          </label>
          <label className="field">
            Account number
            <input name="bankAccountNumber" defaultValue={branding.bankAccountNumber} />
          </label>
          <label className="field">
            Review link
            <span>For example a Google review page. Used by Ask for a review.</span>
            <input name="reviewUrl" defaultValue={branding.reviewUrl} placeholder="https://" />
          </label>
          <label className="field">
            Public liability insurer
            <input name="insurer" defaultValue={branding.insurer} />
          </label>
          <label className="field">
            Cover amount
            <input name="coverAmount" defaultValue={branding.coverAmount} placeholder="£2 million" />
          </label>
          <label className="field">
            Workmanship guarantee
            <input name="guarantee" defaultValue={branding.guarantee} placeholder="12 months" />
          </label>
          <label className="field">
            Memberships and accreditations
            <span>One badge per line, up to 60 characters.</span>
            <textarea name="accreditations" defaultValue={branding.accreditations} />
          </label>
          <SubmitButton>Save details</SubmitButton>
        </InlineForm>
      ) : (
        <p className="font-bold">Only the owner can change these.</p>
      )}
      <p>
        <PillLink href="/settings/email-preview">Preview branded email</PillLink>
      </p>
      {emailReady && owner ? (
        <InlineForm action={sendTestEmail} className="grid gap-3">
          <p className="text-stone">Sends a test to {branding.email || "the business email"}.</p>
          <SubmitButton variant="secondary">Send test email</SubmitButton>
        </InlineForm>
      ) : (
        <p className="text-stone">
          Branded email stays off until RESEND_API_KEY and RESEND_FROM_EMAIL are set. Quotes, invoices, and review
          requests still open in your own email, WhatsApp, or text app.
        </p>
      )}
    </section>
  );
}

function MeasureSection({
  owner,
  wastage,
  labourRates,
  crewRates,
}: {
  owner: boolean;
  wastage: number;
  labourRates: Array<{ jobTypeKey: string; labourPerM2Pence: number | null }>;
  crewRates: Array<{ role: string; basis: string; ratePence: number | null }>;
}) {
  const rates = new Map(labourRates.map((rate) => [rate.jobTypeKey, rate.labourPerM2Pence]));
  const types = starterTemplatesFor("Plasterer");
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Rooms and labour</h2>
      <p className="text-stone">
        Wastage is added before bags, sheets and rolls are rounded up. Labour per m² and crew rates are optional and start blank. The same
        prices can be set in Library.
      </p>
      {owner ? (
        <form action={saveBusinessMeasure} className="grid gap-3">
          <label className="field">
            Wastage %
            <input name="wastagePercent" inputMode="decimal" defaultValue={String(wastage)} />
          </label>
          {CREW_ROLES.map((role) => {
            const stored = crewRates.find((item) => item.role === role.id);
            const basis = stored?.basis === "m2" || stored?.basis === "day" ? stored.basis : role.defaultBasis;
            return (
              <div key={role.id} className="grid gap-2 sm:grid-cols-[1fr_12rem]">
                <label className="field">
                  {role.label} rate (£)
                  <span>Blank until you set it. A job can override it.</span>
                  <input name={`crewRate:${role.id}`} inputMode="decimal" placeholder="Blank" defaultValue={poundsField(stored?.ratePence)} />
                </label>
                <label className="field">
                  Rate type
                  <select name={`crewBasis:${role.id}`} defaultValue={basis}>
                    <option value="day">Per day</option>
                    <option value="m2">Per m²</option>
                  </select>
                </label>
              </div>
            );
          })}
          {types.map((type) => (
            <label key={type.id} className="field">
              {type.name} labour per m²
              <span>{rates.get(type.id) == null ? "Blank" : formatPence(rates.get(type.id) ?? 0)}</span>
              <input
                name={`labour:${type.id}`}
                inputMode="decimal"
                placeholder="Blank"
                defaultValue={rates.get(type.id) == null ? "" : ((rates.get(type.id) ?? 0) / 100).toFixed(2)}
              />
            </label>
          ))}
          <SubmitButton>Save rooms and labour</SubmitButton>
        </form>
      ) : (
        <p className="font-bold">Only the owner can change these.</p>
      )}
    </section>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <dt className="text-sm font-bold text-stone">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
