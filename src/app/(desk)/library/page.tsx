import { canEditBusiness, deskCatalogueSrc } from "@/lib/branding";
import { enabledTrades, isEnabledTrade, singleEnabledTrade, tradeLabel } from "@/lib/constants";
import { formatPence } from "@/lib/money";
import { PLASTERING_STARTER_MATERIALS, PLASTERING_STARTER_TEMPLATES } from "@/lib/trade-starters";
import { removeCataloguePhoto, saveCataloguePhoto } from "@/server/actions/catalogue";
import { addTemplateItem, createSavedItem, createTemplate, deleteSavedItem, deleteTemplate } from "@/server/actions/library";
import { loadPlasteringStarters, saveStarterItem, saveStarterTemplate } from "@/server/actions/starters";
import { getLibrary, listCataloguePhotos, requireUser } from "@/server/dal";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";
import { UnitSelect } from "@/components/unit-select";

export const dynamic = "force-dynamic";

export const metadata = { title: "Library" };

function Price({ pence }: { pence: number | null }) {
  return <span>{pence == null ? "No price" : formatPence(pence)}</span>;
}

function countParam(value: string | undefined): number {
  if (!value || !/^\d{1,2}$/.test(value)) return 0;
  return Number(value);
}

function libraryNotice(notice: string | undefined, added: string | undefined, renamed: string | undefined): string | null {
  if (notice === "photo-saved") return "Tile photo saved. It shows on the chooser for that list.";
  if (notice === "photo-removed") return "Tile photo removed. The chooser uses a work photo or a plain tile.";
  if (notice === "photo") return "That picture could not be used. Choose a PNG, JPG, or WebP under 2 MB.";
  if (notice === "owner") return "Only the owner can change tile photos.";
  if (notice === "saved") return "Saved into your library. Set a price when you add it to a job, or leave it blank.";
  if (notice === "already") return "That is already in your library.";
  if (notice === "missing") return "That starter list could not be found.";
  if (notice !== "starters") return null;
  const addedCount = countParam(added);
  const renamedCount = countParam(renamed);
  if (addedCount === 0 && renamedCount === 0) {
    return "Your library already has these plastering lists. Nothing new was added.";
  }
  const parts: string[] = [];
  if (addedCount === 1) parts.push("Added 1 plastering list. Prices are blank.");
  else if (addedCount > 1) parts.push(`Added ${addedCount} plastering lists. Prices are blank.`);
  if (renamedCount === 1) parts.push("Updated 1 older name so it is not listed twice.");
  else if (renamedCount > 1) parts.push(`Updated ${renamedCount} older names so they are not listed twice.`);
  return parts.join(" ");
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; added?: string; renamed?: string }>;
}) {
  const user = await requireUser();
  const library = await getLibrary(user.businessId);
  const tiles = await listCataloguePhotos(user.businessId);
  const tileUpdated = new Map(tiles.map((tile) => [tile.catalogueKey, tile.updatedAt]));
  const owner = canEditBusiness(user.role);
  const onlyTrade = singleEnabledTrade();
  const { notice, added, renamed } = await searchParams;
  const noticeText = libraryNotice(notice, added, renamed);
  const savedItems = library.savedItems.filter((item) => isEnabledTrade(item.trade));
  const templates = library.templates.filter((template) => isEnabledTrade(template.trade));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">Library</h1>
        <p className="mt-1 text-stone">Saved items and templates, so a list is quick to build on site.</p>
      </div>
      {noticeText ? <p className="card font-bold">{noticeText}</p> : null}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl">Plastering starters</h2>
          <form action={loadPlasteringStarters}>
            <button className="btn btn-secondary" type="submit">
              Load plastering starter lists
            </button>
          </form>
        </div>
        <p className="text-stone">
          These lists are built in for every plastering business. Prices are blank, and each one has a short description
          the customer can read on the sign-off page. Load plastering starter lists adds only the ones missing from
          your library. A list you already saved under an older name is kept, and that name is brought up to date.
        </p>
        {PLASTERING_STARTER_TEMPLATES.map((starter) => (
          <article key={starter.id} className="card grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {onlyTrade ? null : <p className="text-sm font-bold text-stone">{tradeLabel(starter.trade)}</p>}
                <h3 className="font-display text-2xl">{starter.name}</h3>
                <p className="mt-1 text-stone">{starter.description}</p>
              </div>
              <form action={saveStarterTemplate}>
                <input type="hidden" name="starterId" value={starter.id} />
                <button className="btn btn-secondary" type="submit">
                  Save into my library
                </button>
              </form>
            </div>
            <TilePhoto
              catalogueKey={starter.id}
              updatedAt={tileUpdated.get(starter.id) ?? null}
              owner={owner}
            />
            <ul className="grid gap-1">
              {starter.items.map((item) => (
                <li key={item.name}>
                  {item.quantity} {item.unit} {item.name} · No price
                </li>
              ))}
            </ul>
          </article>
        ))}
        <details className="card">
          <summary className="btn btn-secondary w-full">Starter materials</summary>
          <ul className="mt-3 grid gap-2">
            {PLASTERING_STARTER_MATERIALS.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
                <p>
                  <span className="font-bold">{item.name}</span>
                  <span className="text-stone"> · per {item.unit} · No price</span>
                </p>
                <form action={saveStarterItem}>
                  <input type="hidden" name="starterId" value={item.id} />
                  <button className="btn btn-secondary" type="submit">
                    Save item
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-3xl">Saved items</h2>
        {savedItems.length === 0 ? <p className="card text-stone">None yet.</p> : null}
        <ul className="grid gap-2">
          {savedItems.map((item) => (
            <li key={item.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                {onlyTrade ? null : <p className="text-sm font-bold text-stone">{tradeLabel(item.trade)}</p>}
                <p className="text-lg font-bold">{item.name}</p>
                <p>
                  per {item.unit} · <Price pence={item.unitPricePence} />
                  {item.costPricePence == null ? "" : ` · your cost ${formatPence(item.costPricePence)}`}
                </p>
              </div>
              <form action={deleteSavedItem}>
                <input type="hidden" name="savedId" value={item.id} />
                <button className="btn btn-danger" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <div className="card">
          <h3 className="font-display text-2xl">Add a saved item</h3>
          <InlineForm action={createSavedItem} className="mt-3 grid gap-3">
            <TradeChoice />
            <label className="field">
              Name
              <input name="name" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="field">
                Quantity
                <span>Stored as 1 when added to a job</span>
                <input name="quantity" required defaultValue="1" />
              </label>
              <label className="field">
                Unit
                <UnitSelect defaultValue="bag" />
              </label>
              <label className="field">
                Customer price
                <input name="unitPrice" inputMode="decimal" placeholder="9.40" />
              </label>
            </div>
            <label className="field">
              Your cost
              <span>Hidden from customers</span>
              <input name="costPrice" inputMode="decimal" placeholder="7.10" />
            </label>
            <SubmitButton>Save item</SubmitButton>
          </InlineForm>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-3xl">Templates</h2>
        {templates.length === 0 ? <p className="card text-stone">None yet.</p> : null}
        {templates.map((template) => (
          <article key={template.id} className="card grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {onlyTrade ? null : <p className="text-sm font-bold text-stone">{tradeLabel(template.trade)}</p>}
                <h3 className="font-display text-2xl">{template.name}</h3>
              </div>
              <form action={deleteTemplate}>
                <input type="hidden" name="templateId" value={template.id} />
                <button className="btn btn-danger" type="submit">
                  Delete template
                </button>
              </form>
            </div>
            <TilePhoto
              catalogueKey={template.id}
              updatedAt={tileUpdated.get(template.id) ?? null}
              owner={owner}
            />
            <ul className="grid gap-1">
              {template.items.map((item) => (
                <li key={item.id}>
                  {item.quantity} {item.unit} {item.name}
                  {item.unitPricePence == null ? "" : ` · ${formatPence(item.unitPricePence)}`}
                </li>
              ))}
            </ul>
            <InlineForm action={addTemplateItem} className="grid gap-3 border-t border-line pt-3">
              <input type="hidden" name="templateId" value={template.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  Add an item
                  <input name="name" required />
                </label>
                <label className="field">
                  Quantity
                  <input name="quantity" required defaultValue="1" />
                </label>
                <label className="field">
                  Unit
                  <UnitSelect />
                </label>
                <label className="field">
                  Customer price
                  <input name="unitPrice" inputMode="decimal" />
                </label>
              </div>
              <label className="field">
                Your cost
                <input name="costPrice" inputMode="decimal" />
              </label>
              <SubmitButton variant="secondary">Add to template</SubmitButton>
            </InlineForm>
          </article>
        ))}

        <div className="card">
          <h3 className="font-display text-2xl">New template</h3>
          <p className="mt-1 text-stone">Start with the first item. You can add more afterwards.</p>
          <InlineForm action={createTemplate} className="mt-3 grid gap-3">
            <label className="field">
              Name
              <input name="name" required placeholder="Skimming for a smooth finish" />
            </label>
            <TradeChoice />
            <label className="field">
              First item
              <input name="itemName" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="field">
                Quantity
                <input name="quantity" required defaultValue="1" />
              </label>
              <label className="field">
                Unit
                <UnitSelect />
              </label>
              <label className="field">
                Customer price
                <input name="unitPrice" inputMode="decimal" />
              </label>
            </div>
            <label className="field">
              Your cost
              <input name="costPrice" inputMode="decimal" />
            </label>
            <SubmitButton>Create template</SubmitButton>
          </InlineForm>
        </div>
      </section>
    </div>
  );
}

function TradeChoice() {
  const only = singleEnabledTrade();
  if (only) return <input type="hidden" name="trade" value={only} />;
  return (
    <label className="field">
      Trade
      <select name="trade" required defaultValue={enabledTrades()[0]}>
        {enabledTrades().map((trade) => (
          <option key={trade} value={trade}>
            {tradeLabel(trade)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TilePhoto({
  catalogueKey,
  updatedAt,
  owner,
}: {
  catalogueKey: string;
  updatedAt: string | null;
  owner: boolean;
}) {
  const src = updatedAt ? deskCatalogueSrc(catalogueKey, updatedAt) : null;
  if (!owner && !src) return null;
  return (
    <div className="grid gap-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-28 w-full rounded-xl object-cover" />
      ) : (
        <p className="text-sm text-stone">No tile photo yet. The chooser uses a work photo where one fits, or a plain tile.</p>
      )}
      {owner ? (
        <div className="flex flex-wrap items-center gap-2">
          <form action={saveCataloguePhoto} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="catalogueKey" value={catalogueKey} />
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required />
            <button className="btn btn-secondary" type="submit">
              {src ? "Replace tile photo" : "Set tile photo"}
            </button>
          </form>
          {src ? (
            <form action={removeCataloguePhoto}>
              <input type="hidden" name="catalogueKey" value={catalogueKey} />
              <button className="btn btn-danger" type="submit">
                Remove photo
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
