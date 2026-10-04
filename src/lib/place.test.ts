import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initials, postcodeFromAddress, townFromAddress } from "./place";

describe("address chips", () => {
  it("reads the town and postcode from a UK address", () => {
    assert.equal(townFromAddress("38 Birchfield Rd, Redditch, Worcestershire B97 4LD"), "Redditch");
    assert.equal(townFromAddress("14 Larkspur Road, Bishopston, Bristol, BS7 8NS"), "Bristol");
    assert.equal(townFromAddress("38 Birchfield Rd, Redditch B97 4LD"), "Redditch");
    assert.equal(townFromAddress("No postcode here"), null);
    assert.equal(postcodeFromAddress("38 Birchfield Rd, Redditch, Worcestershire B97 4LD"), "B97 4LD");
    assert.equal(initials("Mr And Mrs Flanagan"), "MF");
    assert.equal(initials("Jane"), "JA");
  });
});
