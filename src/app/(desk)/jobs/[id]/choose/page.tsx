import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { deskCatalogueSrc, deskHeroSrc } from "@/lib/branding";
import { catalogueGroupsFor, defaultTileSource, fittingHeroId } from "@/lib/catalogue";
import { isEnabledTrade } from "@/lib/constants";
import { findStarterTemplate, isRetiredTemplateName } from "@/lib/trade-starters";
import { addJobMaterial, addSavedMaterialToJob, applyTemplate } from "@/server/actions/materials";
import { applyStarterToJob } from "@/server/actions/starters";
import { getJob, getLibrary, listCataloguePhotos, listHeroPhotos, requireUser } from "@/server/dal";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";
import { UnitSelect } from "@/components/unit-select";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  return { title: job ? `New item · ${job.customerName}` : "New item" };
}

export default async function ChooseItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.businessId, id);
  if (!job) notFound();
  const [heroes, tiles, library] = await Promise.all([
    listHeroPhotos(user.businessId),
    listCataloguePhotos(user.businessId),
    getLibrary(user.businessId),
  ]);
  const accent = user.branding.accentColour;
  const groups = catalogueGroupsFor(job.trade);
  const templates = library.templates.filter(
    (template) => template.trade === job.trade && isEnabledTrade(template.trade) && !isRetiredTemplateName(template.name),
  );
  const saved = library.savedItems.filter((item) => item.trade === job.trade && isEnabledTrade(item.trade));
  const tileUpdated = new Map(tiles.map((tile) => [tile.catalogueKey, tile.updatedAt]));

  function tileSrc(key: string, starterId?: string): { src: string; chip: boolean } | null {
    const custom = tileUpdated.get(key);
    const customSrc = custom ? deskCatalogueSrc(key, custom) : null;
    if (customSrc) return { src: customSrc, chip: true };
    if (starterId) {
      const heroId = fittingHeroId(starterId, heroes);
      const hero = heroId ? heroes.find((item) => item.id === heroId) : null;
      if (hero) return { src: deskHeroSrc(hero.id, hero.updatedAt), chip: true };
      const sample = defaultTileSource(starterId);
      if (sample) return { src: `/branding/sample/${sample}`, chip: false };
    }
    return null;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6" style={{ "--job-accent": accent } as CSSProperties}>
      <p>
        <Link href={`/jobs/${job.id}`} className="font-bold underline" style={{ color: accent }}>
          ← {job.customerName}
        </Link>
      </p>
      <header>
        <p className="text-sm font-extrabold tracking-wide" style={{ color: accent }}>
          NEW ITEM
        </p>
        <h1 className="font-display text-4xl leading-tight">New item · {job.customerName}</h1>
        <p className="mt-2 font-display text-3xl">Choose a job</p>
        <p className="mt-1 text-stone">
          Pick the work and its materials are added to this job, with a starting price where we have one. You can change
          any price. A list you have already saved is under Your templates.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.id} className="grid gap-3">
          <h2 className="font-display text-2xl">{group.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.starterIds.map((starterId) => {
              const starter = findStarterTemplate(starterId);
              if (!starter) return null;
              const picture = tileSrc(starter.id, starter.id);
              return (
                <li key={starter.id} className="soft-card overflow-hidden">
                  <div className="photo-zoom relative aspect-[4/3]" style={picture ? undefined : { background: `linear-gradient(145deg, #eef2f6, ${accent})` }}>
                    {picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={picture.src} alt="" className="h-full w-full object-cover" />
                    ) : null}
                    {picture?.chip ? <p className="catalogue-chip">{user.businessName} job</p> : null}
                  </div>
                  <div className="grid gap-2 p-4">
                    <h3 className="font-display text-2xl leading-tight">{starter.name}</h3>
                    <p className="text-sm text-stone">{starter.description}</p>
                    <Link href={`/jobs/${job.id}/measure?starter=${starter.id}`} className="btn text-center" style={{ background: accent, color: user.branding.accentInk }}>
                      Measure the room
                    </Link>
                    <form action={applyStarterToJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="starterId" value={starter.id} />
                      <button className="font-bold text-stone" type="submit">
                        Add the list without measuring
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {templates.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-display text-2xl">Your templates</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => {
              const picture = tileSrc(template.id);
              return (
                <li key={template.id} className="soft-card overflow-hidden">
                  <div className="photo-zoom relative aspect-[4/3]" style={picture ? undefined : { background: `linear-gradient(145deg, #eef2f6, ${accent})` }}>
                    {picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={picture.src} alt="" className="h-full w-full object-cover" />
                    ) : null}
                    {picture?.chip ? <p className="catalogue-chip">{user.businessName} job</p> : null}
                  </div>
                  <div className="grid gap-2 p-4">
                    <h3 className="font-display text-2xl leading-tight">{template.name}</h3>
                    <p className="text-sm text-stone">
                      Your saved list · {template.items.length} {template.items.length === 1 ? "item" : "items"}
                    </p>
                    <Link href={`/jobs/${job.id}/measure?template=${template.id}`} className="btn text-center" style={{ background: accent, color: user.branding.accentInk }}>
                      Measure the room
                    </Link>
                    <form action={applyTemplate}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="templateId" value={template.id} />
                      <button className="font-bold text-stone" type="submit">
                        Add the list without measuring
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {saved.length > 0 ? (
        <form action={addSavedMaterialToJob} className="card grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="field">
            Saved item
            <select name="savedId" required defaultValue={saved[0]?.id}>
              {saved.map((item) => (
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

      <section className="card">
        <h2 className="font-display text-2xl">One item</h2>
        <InlineForm action={addJobMaterial} className="mt-3 grid gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          <label className="field">
            Name
            <input name="name" required placeholder="Thistle MultiFinish plaster" />
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
          <SubmitButton>Add to the job</SubmitButton>
        </InlineForm>
      </section>
    </div>
  );
}
