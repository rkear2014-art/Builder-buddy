import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UNITS } from "./constants";
import {
  findStarterMaterial,
  findStarterTemplate,
  PLASTERING_STARTER_MATERIALS,
  PLASTERING_STARTER_TEMPLATES,
  starterMaterialsFor,
  starterTemplatesFor,
} from "./trade-starters";

describe("plastering starters", () => {
  it("offers skim, dry lining, rendering, screeding, and Artex cover to any plasterer", () => {
    const templates = starterTemplatesFor("Plasterer");
    const ids = templates.map((template) => template.id);
    assert.ok(ids.includes("plaster-skim"));
    assert.ok(ids.includes("plaster-dry-lining"));
    assert.ok(ids.includes("plaster-board-on-stud"));
    assert.ok(ids.includes("plaster-render"));
    assert.ok(ids.includes("plaster-screed"));
    assert.ok(ids.includes("plaster-artex"));
    assert.equal(starterTemplatesFor("Electrician").length, 0);
    assert.equal(starterTemplatesFor("Builder").length, 0);
    assert.equal(starterMaterialsFor("Plumber").length, 0);
    assert.ok(starterMaterialsFor("Plasterer").length > 10);
  });

  it("uses UK units and leaves every price blank", () => {
    const allowed = new Set<string>(UNITS);
    for (const template of PLASTERING_STARTER_TEMPLATES) {
      assert.equal(template.trade, "Plasterer");
      assert.ok(template.items.length > 0);
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
    assert.equal(findStarterTemplate("plaster-skim")?.name, "Skim a room");
    assert.equal(findStarterTemplate("other-business-row"), null);
    assert.ok(findStarterMaterial("plaster-item-thistle-multifinish-plaster"));
    assert.equal(findStarterMaterial("saved-row-from-another-business"), null);
  });
});
