import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLASTERING_STARTER_TEMPLATES } from "./trade-starters";
import { starterCoverage } from "./coverage";
import {
  defaultChoices,
  defaultIncludedNames,
  materialsForChoices,
  measurePlanFor,
  normaliseChoices,
  starterMeasureMaterials,
} from "./measure-plan";
import {
  externalCornerCount,
  formatM2,
  measureDefaults,
  parseWastagePercent,
  quantityForQuote,
  quoteFromMeasure,
  roomAreas,
  roundsUp,
  type RoomInput,
} from "./measure";

function room(overrides: Partial<RoomInput> = {}): RoomInput {
  return {
    name: "Living room",
    mode: "room",
    lengthM: 6,
    widthM: 4,
    heightM: 2.4,
    includeWalls: true,
    includeCeiling: true,
    directAreaM2: 0,
    doorCount: 0,
    doorAreaM2: 1.9,
    windowCount: 0,
    windowAreaM2: 1.5,
    externalCorners: 0,
    stopBeadM: 0,
    ...overrides,
  };
}

describe("room areas", () => {
  it("works out walls and ceiling for a 6m by 4m room", () => {
    const areas = roomAreas(room());
    assert.equal(areas.wallM2, 48);
    assert.equal(areas.ceilingM2, 24);
    assert.equal(areas.netM2, 72);
    assert.equal(areas.perimeterM, 20);
    assert.equal(areas.corners, 0);
    assert.equal(formatM2(areas.netM2), "72 m²");
  });

  it("deducts doors and windows from the walls and does not go below zero", () => {
    const areas = roomAreas(room({ doorCount: 1, windowCount: 1 }));
    assert.equal(areas.deductionsM2, 3.4);
    assert.equal(areas.wallM2, 44.6);
    assert.equal(areas.ceilingM2, 24);
    assert.equal(areas.netM2, 68.6);
    const wiped = roomAreas(room({ lengthM: 1, widthM: 1, heightM: 0.2, doorCount: 4 }));
    assert.equal(wiped.wallM2, 0);
    assert.equal(wiped.netM2, 1);
  });

  it("leaves the ceiling undeducted when only the ceiling is ticked", () => {
    const areas = roomAreas(room({ includeWalls: false, includeCeiling: true, doorCount: 1 }));
    assert.equal(areas.netM2, 24);
    assert.equal(areas.deductionsM2, 0);
  });

  it("measures an elevation as length times height", () => {
    const areas = roomAreas(room({ mode: "elevation", lengthM: 8, heightM: 3, windowCount: 1 }));
    assert.equal(areas.netM2, 22.5);
    assert.equal(areas.perimeterM, 8);
    assert.equal(areas.corners, 2);
  });

  it("measures a screed from the floor area", () => {
    const areas = roomAreas(room({ mode: "floor" }));
    assert.equal(areas.floorM2, 24);
    assert.equal(areas.netM2, 24);
    assert.equal(areas.wallM2, 0);
  });

  it("accepts a typed area on its own", () => {
    const areas = roomAreas(room({ mode: "direct", directAreaM2: 32.5 }));
    assert.equal(areas.netM2, 32.5);
    assert.equal(areas.perimeterM, 0);
    assert.equal(areas.corners, 0);
  });

  it("adds several rooms together", () => {
    const quote = quoteFromMeasure({
      rooms: [room({ name: "Living room" }), room({ name: "Bedroom 1", lengthM: 3, widthM: 3, includeCeiling: false, includeWalls: true })],
      materials: [],
      wastagePercent: 10,
      labourPerM2Pence: null,
      dayRatePence: null,
      dayCount: null,
    });
    assert.equal(quote.rooms[0]?.netM2, 72);
    assert.equal(quote.rooms[1]?.netM2, 28.8);
    assert.equal(quote.totalM2, 100.8);
    assert.equal(quote.corners, 0);
  });
});

describe("coverage, wastage and rounding", () => {
  it("rounds bags, sheets and rolls up after wastage", () => {
    assert.equal(roundsUp("bag"), true);
    assert.equal(roundsUp("sheet"), true);
    assert.equal(roundsUp("roll"), true);
    assert.equal(roundsUp("5L tub"), true);
    assert.equal(roundsUp("m"), false);
    const quote = quoteFromMeasure({
      rooms: [room({ doorCount: 1, windowCount: 1 })],
      materials: [
        { name: "Thistle MultiFinish plaster", unit: "bag", unitPricePence: 1310, coverage: { basis: "area", perUnit: 10 } },
        { name: "12.5mm plasterboard 2400 x 1200", unit: "sheet", unitPricePence: 1450, coverage: { basis: "area", perUnit: 2.88 } },
        { name: "Galvanised angle bead", unit: "length", unitPricePence: 384, coverage: { basis: "corners", perUnit: 1 } },
        { name: "Dado rail", unit: "m", unitPricePence: 432, coverage: { basis: "perimeter", perUnit: 1 } },
      ],
      wastagePercent: 10,
      labourPerM2Pence: 1500,
      dayRatePence: 18000,
      dayCount: 1.5,
    });
    const byName = new Map(quote.lines.map((line) => [line.name, line]));
    assert.equal(byName.get("Thistle MultiFinish plaster")?.quantity, "8");
    assert.equal(byName.get("12.5mm plasterboard 2400 x 1200")?.quantity, "27");
    assert.equal(byName.get("Galvanised angle bead")?.quantity, "5");
    assert.equal(byName.get("Dado rail")?.quantity, "22");
    assert.equal(byName.get("Labour")?.quantity, "68.6");
    assert.equal(byName.get("Labour")?.lineTotalPence, 102900);
    assert.equal(byName.get("Labour, day rate")?.quantity, "1.5");
    assert.equal(byName.get("Labour, day rate")?.lineTotalPence, 27000);
    assert.equal(byName.get("Thistle MultiFinish plaster")?.lineTotalPence, 10480);
    assert.ok((quote.totalPence ?? 0) > 10480);
  });

  it("flags a material with no price and skips a material with no coverage", () => {
    const quote = quoteFromMeasure({
      rooms: [room({ includeCeiling: false })],
      materials: [
        { name: "Thistle MultiFinish plaster", unit: "bag", unitPricePence: null, coverage: { basis: "area", perUnit: 10 } },
        { name: "Something odd", unit: "each", unitPricePence: 100, coverage: null },
      ],
      wastagePercent: 0,
      labourPerM2Pence: null,
      dayRatePence: null,
      dayCount: null,
    });
    assert.equal(quote.lines[0]?.quantity, "5");
    assert.equal(quote.lines[0]?.note, "No price");
    assert.equal(quote.unpricedCount, 1);
    assert.equal(quote.lines[1]?.quantity, null);
    assert.match(quote.lines[1]?.note ?? "", /No coverage/);
    assert.equal(quote.totalPence, 0);
  });

  it("uses 10% wastage unless another whole number is typed", () => {
    assert.deepEqual(parseWastagePercent(""), { ok: true, percent: 10 });
    assert.deepEqual(parseWastagePercent("0"), { ok: true, percent: 0 });
    assert.equal(parseWastagePercent("10.5").ok, false);
    assert.equal(quantityForQuote(1.01, true), "2");
    assert.equal(quantityForQuote(2, true), "2");
  });

  it("gives every active starter material a starting coverage figure", () => {
    for (const template of PLASTERING_STARTER_TEMPLATES) {
      if (template.retired) continue;
      for (const item of template.items) {
        const coverage = starterCoverage(template.id, item.name);
        assert.ok(coverage, `${template.id} ${item.name}`);
        assert.ok(coverage.perUnit > 0);
        assert.match(coverage.guidance, /about|one|sold/i);
      }
    }
    assert.equal(starterCoverage("plaster-render", "Cement")?.perUnit, 5);
    assert.equal(starterCoverage("plaster-screed", "Cement")?.perUnit, 1);
    assert.equal(starterCoverage("plaster-general", "Thistle MultiFinish plaster")?.perUnit, 10);
    assert.equal(starterCoverage("plaster-dry-lining", "12.5mm plasterboard 2400 x 1200")?.perUnit, 2.88);
  });

  it("picks a measuring mode for rendering, screeding and skimming", () => {
    assert.equal(measureDefaults("plaster-render").mode, "elevation");
    assert.equal(measureDefaults("plaster-screed").mode, "floor");
    assert.deepEqual(measureDefaults("plaster-general"), { mode: "room", includeWalls: true, includeCeiling: true });
    assert.equal(measureDefaults("plaster-skim").includeWalls, true);
  });

  it("leaves angle bead and stop bead off a plain room, and counts reveals separately", () => {
    assert.equal(externalCornerCount(room()), 0);
    assert.equal(externalCornerCount(room({ doorCount: 1, windowCount: 1 })), 4);
    assert.equal(externalCornerCount(room({ externalCorners: 1, doorCount: 1 })), 3);
    const plain = quoteFromMeasure({
      rooms: [room()],
      materials: [
        { name: "Galvanised angle bead", unit: "length", unitPricePence: 384, coverage: { basis: "corners", perUnit: 1 } },
        { name: "Stop bead", unit: "length", unitPricePence: 456, coverage: { basis: "perimeter", perUnit: 2.4 } },
      ],
      wastagePercent: 10,
      labourPerM2Pence: null,
      dayRatePence: null,
      dayCount: null,
    });
    assert.equal(plain.lines[0]?.quantity, null);
    assert.equal(plain.lines[1]?.quantity, null);
    const typed = quoteFromMeasure({
      rooms: [room({ externalCorners: 2, stopBeadM: 2.4 })],
      materials: plain.lines.map((line) => ({
        name: line.name,
        unit: line.unit,
        unitPricePence: line.unitPricePence,
        coverage: line.name === "Stop bead" ? { basis: "perimeter" as const, perUnit: 2.4 } : { basis: "corners" as const, perUnit: 1 },
      })),
      wastagePercent: 10,
      labourPerM2Pence: null,
      dayRatePence: null,
      dayCount: null,
    });
    const byName = new Map(typed.lines.map((line) => [line.name, line]));
    assert.equal(byName.get("Galvanised angle bead")?.quantity, "3");
    assert.equal(byName.get("Stop bead")?.quantity, "2");
  });

  it("quotes a 6x4x2.4 skim as multi-finish, primer and scrim, with no backing coat", () => {
    const skim = quoteJob("plaster-general", { backing: "none", primer: "pva" });
    const byName = new Map(skim.lines.map((line) => [line.name, line]));
    assert.equal(byName.get("Thistle MultiFinish plaster")?.quantity, "8");
    assert.equal(byName.get("PVA bonding agent")?.quantity, "2");
    assert.equal(byName.get("Scrim tape")?.quantity, "2");
    assert.equal(byName.has("Thistle Hardwall plaster"), false);
    assert.equal(byName.has("Thistle Bonding Coat"), false);
    assert.equal(byName.has("Blue Grit"), false);
    assert.equal(byName.get("Galvanised angle bead")?.quantity ?? null, null);
    assert.equal(byName.get("Stop bead")?.quantity ?? null, null);
    assert.equal(skim.totalPence, 15052);
  });

  it("quotes general plastering as Hardwall and PVA, not both backing coats or both primers", () => {
    const general = quoteJob("plaster-general", {});
    const names = general.lines.map((line) => line.name);
    assert.equal(names.includes("Thistle Hardwall plaster"), true);
    assert.equal(names.includes("Thistle Bonding Coat"), false);
    assert.equal(names.includes("PVA bonding agent"), true);
    assert.equal(names.includes("Blue Grit"), false);
    assert.equal(general.lines.find((line) => line.name === "Thistle Hardwall plaster")?.quantity, "27");
    assert.equal(general.totalPence, 64759);
    const plan = measurePlanFor("plaster-artex");
    const choices = normaliseChoices(plan, {});
    assert.equal(choices.primer, "bond-it");
    const artex = materialsForChoices(starterMeasureMaterials("plaster-artex"), plan, choices);
    const included = defaultIncludedNames(artex, plan);
    assert.equal(included.includes("Artex covering primer"), true);
    assert.equal(included.includes("Thistle MultiFinish plaster"), true);
    assert.equal(included.includes("PVA bonding agent"), false);
    assert.equal(included.includes("Scrim tape"), false);
    const lining = measurePlanFor("plaster-dry-lining");
    const liningLines = starterMeasureMaterials("plaster-dry-lining");
    assert.equal(defaultIncludedNames(liningLines, lining).includes("Thistle MultiFinish plaster"), false);
    assert.equal(liningLines.some((line) => line.name === "Thistle MultiFinish plaster"), true);
    assert.equal(measurePlanFor("plaster-lime").groups.length, 0);
    assert.equal(defaultChoices(plan).primer, "bond-it");
  });
});

function quoteJob(templateId: string, choices: Record<string, string>) {
  const plan = measurePlanFor(templateId);
  const picked = normaliseChoices(plan, choices);
  const materials = materialsForChoices(starterMeasureMaterials(templateId), plan, picked);
  return quoteFromMeasure({
    rooms: [room()],
    materials,
    wastagePercent: 10,
    labourPerM2Pence: null,
    dayRatePence: null,
    dayCount: null,
    included: defaultIncludedNames(materials, plan),
  });
}
