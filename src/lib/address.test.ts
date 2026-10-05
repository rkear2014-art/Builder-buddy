import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { combineSiteAddress, countyFromPostcodesIo, normaliseUkPostcode, readPostcodesIo, readProviderLookup, townFromPostcodesIo } from "./address";

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
      result: {
        postcode: "BS7 8NS",
        parish: "Bristol, City of, unparished area",
        admin_ward: "Bishopston and Ashley Down",
        admin_district: "Bristol, City of",
        admin_county: null,
        region: "South West",
        country: "England",
      },
    });
    assert.equal(found?.town, "Bristol");
    assert.equal(found?.county, "Bristol");
    assert.equal(found?.premises.length, 0);
    const premises = readProviderLookup({
      postcode: "BS7 8NS",
      town: "Bristol",
      county: "Bristol",
      premises: [{ line1: "14 Larkspur Road", line2: "" }],
    });
    assert.equal(premises?.addressLine1, "14 Larkspur Road");
    assert.equal(premises?.premises.length, 1);
  });

  it("fills Redditch, Bristol, Birmingham and Worcester without using the region", () => {
    const redditch = readPostcodesIo({
      result: {
        postcode: "B97 4LD",
        parish: "Redditch, unparished area",
        admin_ward: "Headless Cross & Oakenshaw",
        admin_district: "Redditch",
        admin_county: "Worcestershire",
        region: "West Midlands",
      },
    });
    assert.equal(redditch?.town, "Redditch");
    assert.equal(redditch?.county, "Worcestershire");

    const bristol = readPostcodesIo({
      result: {
        postcode: "BS1 4DJ",
        parish: "Bristol, City of, unparished area",
        admin_ward: "Central",
        admin_district: "Bristol, City of",
        admin_county: null,
        region: "South West",
      },
    });
    assert.equal(bristol?.town, "Bristol");
    assert.equal(bristol?.county, "Bristol");

    // B1 1AA is not a live postcode. Birmingham postcodes such as B1 1BB look like this.
    const birmingham = readPostcodesIo({
      result: {
        postcode: "B1 1BB",
        parish: "Birmingham, unparished area",
        admin_ward: "Ladywood",
        admin_district: "Birmingham",
        admin_county: null,
        region: "West Midlands",
      },
    });
    assert.equal(birmingham?.town, "Birmingham");
    assert.equal(birmingham?.county, "West Midlands");

    const worcester = readPostcodesIo({
      result: {
        postcode: "WR1 2EY",
        parish: "Worcester, unparished area",
        admin_ward: "Cathedral",
        admin_district: "Worcester",
        admin_county: "Worcestershire",
        region: "West Midlands",
      },
    });
    assert.equal(worcester?.town, "Worcester");
    assert.equal(worcester?.county, "Worcestershire");

    assert.equal(townFromPostcodesIo({ parish: "unparished area", admin_ward: "Central", admin_district: "Test District" }), "Test");
    assert.equal(countyFromPostcodesIo({ admin_county: null, admin_district: "Birmingham" }), "West Midlands");
    assert.equal(countyFromPostcodesIo({ admin_county: null, admin_district: "Cornwall" }), "Cornwall");
  });
});
