import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_QUOTE_LETTER,
  coverChips,
  parseQuoteChips,
  parseQuoteSettings,
  quoteFooter,
  quoteLetterText,
  chargeVat,
  normaliseVatNumber,
  pricesIncludeVatLine,
  quoteKeepsIssuedVat,
  quoteMoney,
  quoteReference,
  stripTitle,
} from "./quote";

describe("quotation money and wording", () => {
  it("derives a stable reference from the job id", () => {
    assert.equal(quoteReference("cmuucro330000jwjseb8rn97c"), "EB8RN97C");
    assert.equal(quoteReference("job-abc-1234wxyz"), "1234WXYZ");
  });

  it("adds VAT only when the business is registered", () => {
    const plain = quoteMoney({
      subtotalPence: 10000,
      vatRegistered: false,
      vatRatePercent: 20,
      depositPence: null,
    });
    assert.equal(plain.vatPence, null);
    assert.equal(plain.totalPence, 10000);

    const rated = quoteMoney({
      subtotalPence: 10000,
      vatRegistered: true,
      vatRatePercent: 20,
      depositPence: 0,
    });
    assert.equal(rated.vatPence, 2000);
    assert.equal(rated.totalPence, 12000);
    assert.equal(rated.depositPence, null);

    const rounded = quoteMoney({
      subtotalPence: 333,
      vatRegistered: true,
      vatRatePercent: 20,
      depositPence: 15000,
    });
    assert.equal(rounded.vatPence, 67);
    assert.equal(rounded.totalPence, 400);
    assert.equal(rounded.depositPence, 15000);
    assert.equal(pricesIncludeVatLine(20), "Prices include VAT at 20%");
    assert.equal(chargeVat({ vatRegistered: true, omitVat: true }), false);
    assert.equal(chargeVat({ vatRegistered: true }), true);
    assert.equal(quoteKeepsIssuedVat({ viewed: true, signed: false }), true);
    assert.equal(quoteKeepsIssuedVat({ viewed: false, signed: false }), false);
    assert.deepEqual(normaliseVatNumber("gb 123 4567 89"), { ok: true, vatNumber: "GB123456789" });
    assert.equal(normaliseVatNumber("").ok, true);
    assert.equal(normaliseVatNumber("hello").ok, false);
  });

  it("uses the standard letter when the business has not written one", () => {
    assert.equal(quoteLetterText(""), DEFAULT_QUOTE_LETTER);
    assert.equal(quoteLetterText("   "), DEFAULT_QUOTE_LETTER);
    assert.equal(quoteLetterText("Please see the price."), "Please see the price.");
    assert.equal(DEFAULT_QUOTE_LETTER.includes("07512"), false);
    assert.equal(DEFAULT_QUOTE_LETTER.toLowerCase().includes("ak plastering"), false);
  });

  it("builds cover badges from the business, and does not invent Fully insured", () => {
    assert.deepEqual(parseQuoteChips("Fully insured\nfully insured\n\nFamily run"), ["Fully insured", "Family run"]);
    assert.deepEqual(parseQuoteChips("x".repeat(41)), []);
    const chips = coverChips({
      tagline: "Qualitative Wall Finishing",
      town: "Redditch",
      extra: ["Fully insured"],
    });
    assert.deepEqual(chips, ["Qualitative Wall Finishing", "Redditch", "Fully insured"]);
    assert.equal(coverChips({ tagline: "Neat finishes", town: "Redditch", extra: [] }).includes("Fully insured"), false);
  });

  it("names the photo strip from a shared caption", () => {
    assert.equal(stripTitle(["Recent work", "Recent work"]), "Recent work");
    assert.equal(stripTitle(["Hall", "Stairs"]), "Recent work");
    assert.equal(stripTitle(["", " "]), "Recent work");
  });

  it("joins the footer from the business details", () => {
    assert.equal(
      quoteFooter({
        name: "AK Plastering",
        website: "https://www.plastererinredditch.co.uk",
        email: "office@example.com",
      }),
      "AK Plastering · www.plastererinredditch.co.uk · office@example.com",
    );
  });

  it("accepts a VAT rate from 0 to 30 and keeps badges short", () => {
    const form = new FormData();
    form.set("vatRegistered", "no");
    form.set("vatRatePercent", "20");
    form.set("quoteLetter", "Hello");
    form.set("quoteChips", "Fully insured");
    const parsed = parseQuoteSettings(form);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.vatRegistered, false);
    assert.equal(parsed.data.vatRatePercent, 20);

    form.append("vatRegistered", "yes");
    const registered = parseQuoteSettings(form);
    assert.equal(registered.ok, true);
    if (registered.ok) assert.equal(registered.data.vatRegistered, true);

    const high = new FormData();
    high.set("vatRatePercent", "31");
    assert.equal(parseQuoteSettings(high).ok, false);

    const longChip = new FormData();
    longChip.set("vatRatePercent", "20");
    longChip.set("quoteChips", "x".repeat(41));
    assert.equal(parseQuoteSettings(longChip).ok, false);
  });
});
