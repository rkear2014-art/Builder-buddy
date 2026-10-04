import { TRADES } from "@/lib/constants";
import { formatPence } from "@/lib/money";
import { addTemplateItem, createSavedItem, createTemplate, deleteSavedItem, deleteTemplate } from "@/server/actions/library";
import { getLibrary, requireUser } from "@/server/dal";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";
import { UnitSelect } from "@/components/unit-select";

export const dynamic = "force-dynamic";

export const metadata = { title: "Library" };

function Price({ pence }: { pence: number | null }) {
  return <span>{pence == null ? "No price" : formatPence(pence)}</span>;
}

export default async function LibraryPage() {
  const user = await requireUser();
  const library = await getLibrary(user.businessId);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">Library</h1>
        <p className="mt-1 text-stone">Saved items and templates, kept by trade, so a list is quick to build on site.</p>
      </div>

      <section className="grid gap-3">
        <h2 className="font-display text-3xl">Saved items</h2>
        {library.savedItems.length === 0 ? <p className="card text-stone">None yet.</p> : null}
        <ul className="grid gap-2">
          {library.savedItems.map((item) => (
            <li key={item.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-stone">{item.trade}</p>
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
            <label className="field">
              Trade
              <select name="trade" required defaultValue="Plasterer">
                {TRADES.map((trade) => (
                  <option key={trade}>{trade}</option>
                ))}
              </select>
            </label>
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
        {library.templates.length === 0 ? <p className="card text-stone">None yet.</p> : null}
        {library.templates.map((template) => (
          <article key={template.id} className="card grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-stone">{template.trade}</p>
                <h3 className="font-display text-2xl">{template.name}</h3>
              </div>
              <form action={deleteTemplate}>
                <input type="hidden" name="templateId" value={template.id} />
                <button className="btn btn-danger" type="submit">
                  Delete template
                </button>
              </form>
            </div>
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
              <input name="name" required placeholder="Skim a room" />
            </label>
            <label className="field">
              Trade
              <select name="trade" required defaultValue="Plasterer">
                {TRADES.map((trade) => (
                  <option key={trade}>{trade}</option>
                ))}
              </select>
            </label>
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
