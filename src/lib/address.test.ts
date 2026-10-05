import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { combineSiteAddress, normaliseUkPostcode, readPostcodesIo, readProviderLookup } from "./address";

describe("site address", () => {
  it("normalises a UK postcode and builds the line used on quotes", () => {
    assert.equal(normaliseUkPostcode("bs78ns"), "BS7 8NS");
    assert.equal(normaliseUkPostcode("B97 6NE"), "B97 6NE");
    assert.equal(normaliseUkPostcode("hello"), null);
    assert.equal(
      combineSiteAddress({
        addressLine1: "14 Larkspur Road",
        addressLine2: "",
        town: "Bristol",
        county: "",
        postcode: "BS7 8NS",
      }),
      "14 Larkspur Road, Bristol BS7 8NS",
    );
  });

  it("reads town and county from postcodes.io and premises from a later provider", () => {
    const found = readPostcodesIo({
      result: { postcode: "BS7 8NS", admin_district: "Bristol", admin_county: null, region: "South West" },
    });
    assert.equal(found?.town, "Bristol");
    assert.equal(found?.county, "South West");
    assert.equal(found?.premises.length, 0);
    const same = readPostcodesIo({ result: { postcode: "BS1 4DJ", admin_district: "Bristol", admin_county: "Bristol" } });
    assert.equal(same?.county, "");
    const premises = readProviderLookup({
      postcode: "BS7 8NS",
      town: "Bristol",
      county: "Bristol",
      premises: [{ line1: "14 Larkspur Road", line2: "" }],
    });
    assert.equal(premises?.addressLine1, "14 Larkspur Road");
    assert.equal(premises?.premises.length, 1);
  });
});
