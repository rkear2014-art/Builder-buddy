import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customerSubtotalPence, hidesMaterialLines, poundsFieldValue, scopeLine } from "./customer-price";
import { quoteMoney } from "./vat";

describe("customer total", () => {
  it("uses a whole-job price, then adds VAT on top", () => {
    const subtotal = customerSubtotalPence({ materialsTotalPence: 40000, fixedPricePence: 100000 });
    assert.equal(subtotal, 100000);
    const money = quoteMoney({
      subtotalPence: subtotal,
      vatRegistered: true,
      vatRatePercent: 20,
      depositPence: null,
    });
    assert.equal(money.subtotalPence, 100000);
    assert.equal(money.vatPence, 20000);
    assert.equal(money.totalPence, 120000);
  });

  it("keeps the materials total when no whole-job price is set", () => {
    assert.equal(customerSubtotalPence({ materialsTotalPence: 4500, fixedPricePence: null }), 4500);
    assert.equal(customerSubtotalPence({ materialsTotalPence: 4500, fixedPricePence: 0 }), 4500);
  });

  it("hides material lines for a total-only quote or a fixed price", () => {
    assert.equal(hidesMaterialLines({ totalOnly: true, fixedPricePence: null }), true);
    assert.equal(hidesMaterialLines({ totalOnly: false, fixedPricePence: 150000 }), true);
    assert.equal(hidesMaterialLines({ totalOnly: false, fixedPricePence: null }), false);
    assert.equal(scopeLine("Plasterer"), "Plastering works as described");
    assert.equal(scopeLine("Other"), "Works as described");
    assert.equal(poundsFieldValue(107900), "1079.00");
    assert.equal(poundsFieldValue(null), "");
  });
});
