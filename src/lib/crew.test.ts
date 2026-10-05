import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customerSubtotalPence, hidesMaterialLines } from "./customer-price";
import { isInternalCrewName, parseCrewFields, priceCrew, startingCrew } from "./crew";
import { invoiceTotals } from "./invoice";
import { quoteFromMeasure, type RoomInput } from "./measure";
import { quoteMoney } from "./vat";

function room(): RoomInput {
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
  };
}

describe("crew labour", () => {
  it("prices day rates by people and days, and a per m² rate from the measured area", () => {
    const priced = priceCrew({
      days: 3,
      totalM2: 72,
      roles: [
        { role: "plasterer", count: 2, basis: "day", ratePence: 20000 },
        { role: "labourer", count: 1, basis: "day", ratePence: 12000 },
        { role: "subcontractor", count: 2, basis: "m2", ratePence: 1000 },
      ],
    });
    const byRole = new Map(priced.roles.map((role) => [role.role, role]));
    assert.equal(byRole.get("plasterer")?.amountPence, 120000);
    assert.equal(byRole.get("labourer")?.amountPence, 36000);
    assert.equal(byRole.get("subcontractor")?.amountPence, 72000);
    assert.equal(priced.customerPence, 228000);
    assert.equal(priced.costPence, 108000);
    assert.equal(priced.marginPence, 120000);
    assert.equal(priced.costUnitPricePence, 108000);
    assert.equal(priced.customerLine?.name, "Labour");
    assert.equal(priced.customerLine?.quantity, "1");
    assert.equal(priced.customerLine?.unit, "job");
    assert.equal(priced.customerLine?.unitPricePence, 228000);
    assert.equal(priced.customerLine?.lineTotalPence, 228000);
    assert.equal(byRole.get("plasterer")?.onQuote, true);
    assert.equal(byRole.get("labourer")?.onQuote, true);
    assert.equal(byRole.get("subcontractor")?.onQuote, true);
  });

  it("adds a plasterer and a labourer on the same days into one Labour line", () => {
    const priced = priceCrew({
      days: 3,
      totalM2: 72,
      roles: [
        { role: "plasterer", count: 2, basis: "day", ratePence: 20000 },
        { role: "labourer", count: 1, basis: "day", ratePence: 12000 },
      ],
    });
    assert.equal(priced.customerLine?.quantity, "3");
    assert.equal(priced.customerLine?.unit, "day");
    assert.equal(priced.customerLine?.unitPricePence, 52000);
    assert.equal(priced.customerLine?.lineTotalPence, 156000);
    assert.equal(priced.customerPence, 156000);
    assert.equal(priced.costPence, 36000);
    assert.equal(priced.costUnitPricePence, 12000);
    assert.equal(priced.marginPence, 120000);
    const withVat = quoteMoney({
      subtotalPence: priced.customerPence,
      vatRegistered: true,
      vatRatePercent: 20,
      depositPence: null,
    });
    assert.equal(withVat.vatPence, 31200);
    assert.equal(withVat.totalPence, 187200);
    const invoice = invoiceTotals({
      lines: [
        {
          quantity: priced.customerLine?.quantity ?? "0",
          unitPricePence: priced.customerLine?.unitPricePence ?? 0,
        },
      ],
      vatRegistered: true,
      vatRatePercent: 20,
      depositPence: null,
    });
    assert.equal(invoice.subtotalPence, 156000);
    assert.equal(invoice.vatPence, 31200);
    assert.equal(invoice.totalPence, 187200);
  });

  it("puts a labourer on the Labour line when there is no plasterer", () => {
    const priced = priceCrew({
      days: 2,
      totalM2: 0,
      roles: [{ role: "labourer", count: 1, basis: "day", ratePence: 12000 }],
    });
    assert.equal(priced.customerLine?.quantity, "2");
    assert.equal(priced.customerLine?.unit, "day");
    assert.equal(priced.customerLine?.unitPricePence, 12000);
    assert.equal(priced.customerLine?.lineTotalPence, 24000);
    assert.equal(priced.customerPence, 24000);
    assert.equal(priced.costPence, 24000);
    assert.equal(priced.costUnitPricePence, 12000);
    assert.equal(priced.marginPence, 0);
    assert.equal(priced.roles.find((role) => role.role === "labourer")?.onQuote, true);
  });

  it("leaves a blank rate off the money and ignores a role with nobody on it", () => {
    const priced = priceCrew({
      days: 2,
      totalM2: 72,
      roles: [
        { role: "plasterer", count: 1, basis: "day", ratePence: null },
        { role: "labourer", count: 0, basis: "day", ratePence: 12000 },
        { role: "subcontractor", count: 1, basis: "m2", ratePence: null },
      ],
    });
    assert.equal(priced.customerLine, null);
    assert.equal(priced.customerPence, 0);
    assert.equal(priced.costPence, 0);
    assert.match(priced.roles[0]?.note ?? "", /No rate/);
    assert.equal(priced.roles[1]?.amountPence, null);
    assert.match(priced.roles[2]?.note ?? "", /No rate/);
  });

  it("asks for days or a measured area before a rate can be worked out", () => {
    const missingDays = priceCrew({
      days: null,
      totalM2: 10,
      roles: [{ role: "labourer", count: 1, basis: "day", ratePence: 10000 }],
    });
    assert.match(missingDays.roles.find((role) => role.role === "labourer")?.note ?? "", /days/);
    const missingArea = priceCrew({
      days: 1,
      totalM2: 0,
      roles: [{ role: "subcontractor", count: 1, basis: "m2", ratePence: 1000 }],
    });
    assert.match(missingArea.roles.find((role) => role.role === "subcontractor")?.note ?? "", /m²/);
  });

  it("puts plasterer, labourer and subcontractor into one Labour line on the quote", () => {
    const quote = quoteFromMeasure({
      rooms: [room()],
      materials: [],
      wastagePercent: 10,
      labourPerM2Pence: 1500,
      dayRatePence: 18000,
      dayCount: 1,
      crew: {
        days: 3,
        roles: [
          { role: "plasterer", count: 2, basis: "day", ratePence: 20000 },
          { role: "labourer", count: 1, basis: "day", ratePence: 12000 },
          { role: "subcontractor", count: 1, basis: "m2", ratePence: 1000 },
        ],
      },
    });
    assert.equal(quote.totalM2, 72);
    const names = quote.lines.map((line) => line.name);
    assert.deepEqual(names, ["Labour"]);
    assert.equal(quote.lines[0]?.quantity, "1");
    assert.equal(quote.lines[0]?.unit, "job");
    assert.equal(quote.lines[0]?.lineTotalPence, 228000);
    assert.equal(quote.totalPence, 228000);
    assert.equal(names.includes("Labourer"), false);
    assert.equal(names.includes("Subcontractor"), false);
    const suggested = customerSubtotalPence({ materialsTotalPence: quote.totalPence, fixedPricePence: null });
    assert.equal(suggested, 228000);
    const wholeJob = customerSubtotalPence({ materialsTotalPence: quote.totalPence, fixedPricePence: 250000 });
    assert.equal(wholeJob, 250000);
    assert.equal(hidesMaterialLines({ totalOnly: false, fixedPricePence: 250000 }), true);
    assert.equal(hidesMaterialLines({ totalOnly: true, fixedPricePence: null }), true);
  });

  it("replaces library labour when only a labourer is on the crew", () => {
    const quote = quoteFromMeasure({
      rooms: [room()],
      materials: [],
      wastagePercent: 0,
      labourPerM2Pence: 1000,
      dayRatePence: 18000,
      dayCount: 1,
      crew: {
        days: 2,
        roles: [{ role: "labourer", count: 1, basis: "day", ratePence: 9000 }],
      },
    });
    assert.deepEqual(
      quote.lines.map((line) => line.name),
      ["Labour"],
    );
    assert.equal(quote.lines[0]?.lineTotalPence, 18000);
    assert.equal(quote.totalPence, 18000);
  });

  it("keeps the library labour price while nobody is added to the crew", () => {
    const quote = quoteFromMeasure({
      rooms: [room()],
      materials: [],
      wastagePercent: 0,
      labourPerM2Pence: 1000,
      dayRatePence: null,
      dayCount: null,
      crew: { days: null, roles: [] },
    });
    assert.equal(quote.lines[0]?.name, "Labour");
    assert.equal(quote.lines[0]?.lineTotalPence, 72000);
  });

  it("starts from blank defaults and does not invent a price", () => {
    const fresh = startingCrew({ defaults: [], saved: null });
    assert.equal(fresh.days, "");
    assert.equal(fresh.roles.every((role) => role.rate === "" && role.count === 0), true);
    assert.equal(fresh.roles.find((role) => role.role === "subcontractor")?.basis, "m2");
    const remembered = startingCrew({
      defaults: [{ role: "labourer", basis: "day", ratePence: 11000 }],
      saved: [{ role: "plasterer", count: 2, basis: "day", ratePence: 18000 }],
      legacyDayRatePence: 999,
      legacyDays: "4",
    });
    assert.equal(remembered.roles.find((role) => role.role === "plasterer")?.count, 2);
    assert.equal(remembered.roles.find((role) => role.role === "plasterer")?.rate, "180.00");
    assert.equal(remembered.roles.find((role) => role.role === "labourer")?.rate, "110.00");
    assert.equal(remembered.roles.find((role) => role.role === "labourer")?.count, 0);
  });

  it("reads the crew fields and hides labourer and subcontractor names from a customer", () => {
    const parsed = parseCrewFields({
      get(name: string) {
        const values: Record<string, string> = {
          crewDays: "1.5",
          "crewCount:plasterer": "1",
          "crewBasis:plasterer": "day",
          "crewRate:plasterer": "180",
          "crewCount:labourer": "0",
          "crewBasis:labourer": "day",
          "crewRate:labourer": "",
          "crewCount:subcontractor": "1",
          "crewBasis:subcontractor": "m2",
          "crewRate:subcontractor": "12.50",
        };
        return values[name] ?? "";
      },
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.crew.days, 1.5);
    assert.equal(parsed.crew.roles[2]?.ratePence, 1250);
    assert.equal(isInternalCrewName("Subcontractor"), true);
    assert.equal(isInternalCrewName("Labourer pay"), true);
    assert.equal(isInternalCrewName("Labour"), false);
    const missingDays = parseCrewFields({
      get(name: string) {
        if (name === "crewCount:labourer") return "1";
        if (name === "crewRate:labourer") return "90";
        if (name === "crewBasis:labourer") return "day";
        return "";
      },
    });
    assert.equal(missingDays.ok, false);
  });
});
