import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLASTERING_STARTER_TEMPLATES } from "./trade-starters";
import { starterCoverage } from "./coverage";
import {
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
    assert.equal(areas.corners, 4);
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
    assert.equal(quote.corners, 8);
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
});
