import { canEditBusiness, deskHeroSrc, deskLogoSrc } from "@/lib/branding";
import type { SessionUser } from "@/lib/desk";
import {
  removeBusinessLogo,
  removeHeroPhoto,
  saveAccent,
  uploadBusinessLogo,
  uploadHeroPhoto,
  useLogoAccent,
  useSampleHeroes,
  useSampleLogo,
} from "@/server/actions/branding";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";
import { listHeroPhotos, requireUser } from "@/server/dal";

export const dynamic = "force-dynamic";

export const metadata = { title: "Business" };

function countParam(value: string | undefined): number | null {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  return Number(value);
}

function savedMessage(saved: string | undefined, added: string | undefined): string | null {
  const count = countParam(added);
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
      return count === 1 ? "Photo added. The dashboard shows one of your photos each visit." : "Photos added. The dashboard shows a different one each visit.";
    case "hero-removed":
      return "Photo removed. With none left, the dashboard uses the plaster gradient again.";
    case "heroes":
      if (count === 0) return "Those AK Plastering photos are already on this business. Nothing new was added.";
      if (count === 1) return "Added 1 AK Plastering photo. The dashboard shows a different photo each visit.";
      return `Added ${count ?? "the"} AK Plastering photos. The dashboard shows a different one each visit.`;
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
    case "heroes":
      return "Those photos could not be added. Try again, or upload your own.";
    case "heroes-full":
      return "This business already has 12 dashboard photos. Remove one before adding more.";
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
  const photos = await listHeroPhotos(user.businessId);
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

      <LogoSection user={user} owner={owner} />
      <HeroSection user={user} owner={owner} photos={photos} />
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
