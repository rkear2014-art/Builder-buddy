import { canEditBusiness, deskHeroSrc, deskLogoSrc } from "@/lib/branding";
import type { SessionUser } from "@/lib/desk";
import {
  removeBusinessLogo,
  removeHeroPhoto,
  saveAccent,
  uploadBusinessLogo,
  uploadHeroPhoto,
  useLogoAccent,
  useSampleLogo,
} from "@/server/actions/branding";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";

export const metadata = { title: "Business" };

function savedMessage(saved: string | undefined): string | null {
  switch (saved) {
    case "profile":
      return "Business details saved.";
    case "logo":
      return "Logo saved.";
    case "removed":
      return "Logo removed. The dashboard shows your business name, and the customer agreement has no picture.";
    case "sample":
      return "The AK Plastering logo is now on this business. You can replace it whenever you like.";
    case "hero":
      return "Hero photo saved. It shows on the dashboard.";
    case "hero-removed":
      return "Hero photo removed. The dashboard uses the plaster gradient again.";
    case "accent":
      return "Accent colour saved.";
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
    default:
      return null;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const saved = savedMessage(query.saved);
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

      <LogoSection user={user} owner={owner} />
      <HeroSection user={user} owner={owner} />
      <AccentSection user={user} owner={owner} />
      <ProfileSection user={user} owner={owner} />
    </div>
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
            {user.branding.hasLogo ? (
              <form action={removeBusinessLogo}>
                <button className="btn btn-danger" type="submit">
                  Remove logo
                </button>
              </form>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-stone">
            The AK Plastering logo is a sample for this business. Other businesses are not given it unless their owner
            uploads their own.
          </p>
        </>
      ) : (
        <p className="font-bold">Only the owner can change the logo.</p>
      )}
    </section>
  );
}

function HeroSection({ user, owner }: { user: SessionUser; owner: boolean }) {
  return (
    <section className="card grid gap-4">
      <h2 className="font-display text-2xl">Dashboard photo</h2>
      <p className="text-stone">
        Optional. It fills the top card on the dashboard. With no photo, that card uses a plaster-coloured gradient.
      </p>
      {user.branding.hasHero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deskHeroSrc(user.branding.heroUpdatedAt)}
          alt=""
          className="max-h-48 w-full rounded-2xl object-cover"
        />
      ) : null}
      {owner ? (
        <>
          <InlineForm action={uploadHeroPhoto} className="grid gap-3">
            <label className="field">
              Upload a photo
              <span>PNG, JPG, or WebP. Up to 2 MB.</span>
              <input name="hero" type="file" accept="image/png,image/jpeg,image/webp" required />
            </label>
            <SubmitButton>Save photo</SubmitButton>
          </InlineForm>
          {user.branding.hasHero ? (
            <form action={removeHeroPhoto}>
              <button className="btn btn-danger" type="submit">
                Remove photo
              </button>
            </form>
          ) : null}
        </>
      ) : (
        <p className="font-bold">Only the owner can change the photo.</p>
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
        Phone, email, address, website, and tagline are optional. They are printed at the top of this business&apos;s
        customer agreement. The customer&apos;s own phone and email stay on the job.
      </p>
      {owner ? (
        <BusinessProfileForm initial={profile} />
      ) : (
        <dl className="grid gap-2">
          <div>
            <dt className="text-sm font-bold text-stone">Business name</dt>
            <dd>{profile.name}</dd>
          </div>
          <ProfileLine label="Tagline" value={profile.tagline} />
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

function ProfileLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <dt className="text-sm font-bold text-stone">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
