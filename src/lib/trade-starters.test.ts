import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UNITS } from "./constants";
import {
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

  it("uses UK units, a customer description, and leaves every price blank", () => {
    const allowed = new Set<string>(UNITS);
    for (const template of PLASTERING_STARTER_TEMPLATES) {
      assert.equal(template.trade, "Plasterer");
      assert.ok(template.items.length > 0);
      assert.ok(template.description.length >= 20);
      for (const item of template.items) {
        assert.equal(item.unitPricePence, null);
        assert.equal(item.costPricePence, null);
        assert.ok(allowed.has(item.unit), item.unit);
      }
    }
    for (const item of PLASTERING_STARTER_MATERIALS) {
      assert.equal(item.unitPricePence, null);
      assert.equal(item.costPricePence, null);
      assert.equal(item.trade, "Plasterer");
    }
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
