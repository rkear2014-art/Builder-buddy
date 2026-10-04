import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleSignatureDataUrl } from "./sample-signature";
import { acceptedSignature } from "./signature";

describe("signatures", () => {
  it("accepts a real PNG data URL and rejects anything else", () => {
    const sample = sampleSignatureDataUrl();
    assert.equal(acceptedSignature(sample), sample);
    const bytes = Buffer.from(sample.split(",")[1], "base64");
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(acceptedSignature("data:image/png;base64,aaaa"), null);
    assert.equal(acceptedSignature(`data:image/svg+xml;base64,${"a".repeat(1200)}`), null);
    assert.equal(acceptedSignature(""), null);
  });
});