import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { costTotals, customerLineTotalPence, materialsTotals, normaliseQuantity, quantityFromStored } from "./materials";
import { formatPence, parsePoundsToPence } from "./money";

describe("materials totals", () => {
  it("adds priced lines and ignores blank prices", () => {
    const totals = materialsTotals([
      { quantity: "2", unitPricePence: 1000, costPricePence: 400 },
      { quantity: "2.5", unitPricePence: 840, costPricePence: 500 },
      { quantity: "1", unitPricePence: null, costPricePence: 999 },
    ]);
    assert.equal(totals.totalPence, 2000 + 2100);
    assert.equal(totals.pricedCount, 2);
    assert.equal(totals.unpricedCount, 1);
  });

  it("uses the customer price and never the trade cost", () => {
    const totals = materialsTotals([
      { quantity: "1", unitPricePence: 100, costPricePence: 987654 },
    ]);
    assert.equal(totals.totalPence, 100);
    assert.equal(customerLineTotalPence({ quantity: "3", unitPricePence: 333 }), 999);
  });

  it("treats a zero price as free, not unpriced", () => {
    const totals = materialsTotals([{ quantity: "4", unitPricePence: 0 }]);
    assert.equal(totals.totalPence, 0);
    assert.equal(totals.unpricedCount, 0);
    assert.equal(totals.pricedCount, 1);
  });

  it("rounds half a penny up", () => {
    assert.equal(customerLineTotalPence({ quantity: "2.5", unitPricePence: 333 }), 833);
  });

  it("returns zero for an empty list", () => {
    assert.deepEqual(materialsTotals([]), { totalPence: 0, unpricedCount: 0, pricedCount: 0 });
  });

  it("totals trade costs separately", () => {
    const totals = costTotals([
      { quantity: "2", costPricePence: 150 },
      { quantity: "1", costPricePence: null },
    ]);
    assert.equal(totals.totalPence, 300);
    assert.equal(totals.unpricedCount, 1);
  });

  it("normalises stored quantities", () => {
    assert.equal(normaliseQuantity("2.50"), "2.5");
    assert.equal(normaliseQuantity("2"), "2");
    assert.equal(quantityFromStored("2.500"), "2.5");
    assert.equal(normaliseQuantity("0.50"), "0.5");
  });
});

describe("pounds and pence", () => {
  it("parses British price entry", () => {
    assert.deepEqual(parsePoundsToPence("£1,234.50"), { ok: true, pence: 123450 });
    assert.deepEqual(parsePoundsToPence("8.1"), { ok: true, pence: 810 });
    assert.deepEqual(parsePoundsToPence(""), { ok: true, pence: null });
    assert.equal(parsePoundsToPence("8.123").ok, false);
    assert.equal(parsePoundsToPence("-1").ok, false);
  });

  it("formats pence with a pound sign and grouping", () => {
    assert.equal(formatPence(0), "£0.00");
    assert.equal(formatPence(812), "£8.12");
    assert.equal(formatPence(123456), "£1,234.56");
    assert.equal(formatPence(-50), "-£0.50");
  });
});
