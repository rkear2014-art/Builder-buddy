import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultTermsText,
  parseTermsField,
  resolveTermsText,
  termsDocument,
  termsFooter,
  termsRuns,
  termsToStore,
} from "./terms";

const ak = {
  name: "AK Plastering",
  address: "38 Birchfield Rd, Redditch B97 4LD",
  phone: "07512 873562",
};

describe("terms and conditions", () => {
  it("fills an empty field with the standard wording and this business's footer", () => {
    const text = defaultTermsText(ak);
    assert.match(text, /^AK Plastering – Terms and Conditions\n/);
    assert.match(text, /\n1\. Quotes\./);
    assert.match(text, /\n15\. Complaints\./);
    assert.equal(termsFooter(ak), "AK Plastering, 38 Birchfield Rd, Redditch B97 4LD, 07512 873562");
    assert.ok(text.endsWith(termsFooter(ak)));
    assert.equal(resolveTermsText("  ", ak), text);
    assert.equal(termsDocument(text).clauses.length, 15);
  });

  it("uses the saved name, address and phone instead of a fixed footer", () => {
    const hart = { name: "Hart & Co", address: "1 Harbour Lane\nClevedon", phone: "0117 496 0123" };
    const text = defaultTermsText(hart);
    assert.match(text, /^Hart & Co – Terms and Conditions/);
    assert.equal(termsFooter(hart), "Hart & Co, 1 Harbour Lane Clevedon, 0117 496 0123");
    assert.equal(text.includes("07512 873562"), false);
    assert.equal(text.includes("AK Plastering"), false);
    assert.equal(text.includes("38 Birchfield"), false);
  });

  it("keeps a custom wording, including bold, and stores the standard text as blank", () => {
    const custom = "Hart & Co – Terms and Conditions\n\n1. Quotes. **Valid for 14 days.**\n\nHart & Co, Bristol";
    assert.equal(resolveTermsText(custom, ak), custom);
    assert.equal(termsToStore(custom, ak), custom);
    assert.equal(termsToStore(defaultTermsText(ak), ak), "");
    assert.equal(termsToStore("   ", ak), "");
    assert.deepEqual(termsRuns("Valid for **14 days** only."), [
      { bold: false, text: "Valid for " },
      { bold: true, text: "14 days" },
      { bold: false, text: " only." },
    ]);
    assert.deepEqual(termsRuns("a stray ** mark"), [{ bold: false, text: "a stray ** mark" }]);
  });

  it("refuses terms that are too long", () => {
    assert.equal(parseTermsField("x".repeat(12001)).ok, false);
    assert.equal(parseTermsField("1. Quotes. Fine.").ok, true);
  });
});
