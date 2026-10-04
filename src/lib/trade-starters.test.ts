import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UNITS } from "./constants";
import {
  blankPriceUpdate,
  findStarterMaterial,
  findStarterTemplate,
  planStarterLibraryUpdate,
  PLASTERING_STARTER_MATERIALS,
  PLASTERING_STARTER_TEMPLATES,
  starterMaterialsFor,
  starterTemplatesFor,
} from "./trade-starters";

const SERVICE_NAMES = [
  "General plastering work",
  "Skimming for a smooth finish",
  "Hardwall/Skim finishes",
  "Dot and dab plastering",
  "Stud wall partitioning",
  "Covering Artex on ceilings and walls",
  "Dry-lining and wire mesh",
  "Plaster repairs and remodelling",
  "Lime plastering",
  "Dry walling, tape and jointing",
  "Cornices and dado rails",
  "Coving and decorative plasterwork",
  "Rendering",
  "Screeding",
];

describe("plastering starters", () => {
  it("offers Richard's plastering services, plus rendering and screeding, to any plasterer", () => {
    const templates = starterTemplatesFor("Plasterer");
    const names = templates.map((template) => template.name);
    assert.deepEqual(names, SERVICE_NAMES);
    assert.equal(templates.some((template) => template.id === "plaster-board-on-stud"), false);
    assert.equal(starterTemplatesFor("Electrician").length, 0);
    assert.equal(starterTemplatesFor("Builder").length, 0);
    assert.equal(starterMaterialsFor("Plumber").length, 0);
    assert.ok(starterMaterialsFor("Plasterer").length > 10);
    const ids = new Set(templates.map((template) => template.id));
    assert.equal(ids.size, templates.length);
  });

  it("uses a Travis Perkins price where one was published, and leaves the rest blank", () => {
    const allowed = new Set<string>([...UNITS, "5L tub", "10L tub", "5kg bag", "310ml cartridge"]);
    const blank = new Set([
      "Artex covering primer",
      "Wide angle bead",
      "Lime putty",
      "Lime finish plaster",
      "Decorative plaster moulding",
      "Alkali-resistant render mesh",
      "Perimeter foam strip",
    ]);
    const seen = new Map<string, { unit: string; unitPricePence: number | null }>();
    for (const template of PLASTERING_STARTER_TEMPLATES) {
      assert.equal(template.trade, "Plasterer");
      assert.ok(template.items.length > 0);
      assert.ok(template.description.length >= 20);
      for (const item of template.items) {
        assert.equal(item.costPricePence, null);
        assert.ok(allowed.has(item.unit), item.unit);
        assert.equal(blank.has(item.name), item.unitPricePence == null, item.name);
        const previous = seen.get(item.name);
        if (previous) {
          assert.equal(previous.unit, item.unit, item.name);
          assert.equal(previous.unitPricePence, item.unitPricePence, item.name);
        } else {
          seen.set(item.name, { unit: item.unit, unitPricePence: item.unitPricePence });
        }
      }
    }
    assert.equal(seen.get("Thistle MultiFinish plaster")?.unitPricePence, 1310);
    assert.equal(seen.get("PVA bonding agent")?.unit, "5L tub");
    assert.equal(seen.get("PVA bonding agent")?.unitPricePence, 1796);
    assert.equal(seen.get("Blue Grit")?.unit, "10L tub");
    assert.equal(seen.get("Blue Grit")?.unitPricePence, 3960);
    assert.equal(seen.get("Coving adhesive")?.unit, "5kg bag");
    assert.equal(seen.get("Coving adhesive")?.unitPricePence, 1979);
    assert.equal(seen.get("Filler")?.unit, "310ml cartridge");
    assert.equal(seen.get("Filler")?.unitPricePence, 506);
    assert.equal(seen.get("Dado rail")?.unit, "m");
    assert.equal(seen.get("Dado rail")?.unitPricePence, 432);
    assert.equal(seen.get("Galvanised angle bead")?.unitPricePence, 384);
    for (const name of blank) assert.equal(seen.get(name)?.unitPricePence, null, name);
    for (const item of PLASTERING_STARTER_MATERIALS) {
      assert.equal(item.costPricePence, null);
      assert.equal(item.unitPricePence, seen.get(item.name)?.unitPricePence ?? null);
      assert.equal(item.trade, "Plasterer");
    }
  });

  it("fills a blank starter price and leaves a price the business already set", () => {
    const pva = PLASTERING_STARTER_TEMPLATES[0].items.find((item) => item.name === "PVA bonding agent");
    assert.ok(pva);
    assert.deepEqual(blankPriceUpdate({ name: "PVA bonding agent", unit: "litre", unitPricePence: null }, pva), {
      unit: "5L tub",
      unitPricePence: 1796,
    });
    assert.equal(blankPriceUpdate({ name: "PVA bonding agent", unit: "5L tub", unitPricePence: null }, pva)?.unitPricePence, 1796);
    assert.equal(blankPriceUpdate({ name: "PVA bonding agent", unit: "litre", unitPricePence: 250 }, pva), null);
    assert.equal(blankPriceUpdate({ name: "PVA bonding agent", unit: "each", unitPricePence: null }, pva), null);
    const bead = PLASTERING_STARTER_TEMPLATES.flatMap((template) => template.items).find(
      (item) => item.name === "Wide angle bead",
    );
    assert.ok(bead);
    assert.equal(blankPriceUpdate({ name: "Wide angle bead", unit: "length", unitPricePence: null }, bead), null);
    const plaster = PLASTERING_STARTER_TEMPLATES[0].items[0];
    assert.equal(blankPriceUpdate({ name: plaster.name, unit: "bag", unitPricePence: 999 }, plaster), null);
    assert.deepEqual(blankPriceUpdate({ name: plaster.name, unit: "bag", unitPricePence: null }, plaster), {
      unit: "bag",
      unitPricePence: 1310,
    });
  });

  it("is not tied to one company's details", () => {
    const text = JSON.stringify({
      templates: PLASTERING_STARTER_TEMPLATES,
      materials: PLASTERING_STARTER_MATERIALS,
    });
    assert.equal(text.includes("07512"), false);
    assert.equal(text.includes("Birchfield"), false);
    assert.equal(text.includes("AK Plastering"), false);
    assert.equal(text.includes("plastererinredditch"), false);
    assert.equal(findStarterTemplate("plaster-skim")?.name, "Skimming for a smooth finish");
    assert.equal(findStarterTemplate("other-business-row"), null);
    assert.ok(findStarterMaterial("plaster-item-thistle-multifinish-plaster"));
    assert.equal(findStarterMaterial("saved-row-from-another-business"), null);
  });

  it("adds only the lists a business does not already have, including under the old names", () => {
    const plan = planStarterLibraryUpdate(
      ["Skim a room", "Rendering", "My own coving job"],
      "Plasterer",
    );
    const byId = new Map(plan.map((row) => [row.starter.id, row]));
    assert.equal(byId.get("plaster-skim")?.action, "rename");
    assert.equal(byId.get("plaster-skim")?.existingName, "Skim a room");
    assert.equal(byId.get("plaster-render")?.action, "skip");
    assert.equal(byId.get("plaster-general")?.action, "add");
    assert.equal(byId.get("plaster-cornice")?.action, "add");
    assert.equal(byId.get("plaster-coving")?.action, "add");
    assert.equal(
      plan.some((row) => row.existingName === "My own coving job"),
      false,
    );

    const current = planStarterLibraryUpdate(
      PLASTERING_STARTER_TEMPLATES.map((template) => template.name),
      "Plasterer",
    );
    assert.ok(current.every((row) => row.action === "skip"));
    assert.equal(planStarterLibraryUpdate(["Skim a room"], "Electrician").length, 0);

    const both = planStarterLibraryUpdate(["Skim a room", "Skimming for a smooth finish"], "Plasterer");
    assert.equal(both.find((row) => row.starter.id === "plaster-skim")?.action, "skip");
  });
});
