import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShareToken, isWellFormedShareToken } from "./access";
import { lockAgreement, type AgreementSource } from "./agreement";
import { presentShare, type ShareRecord } from "./share";

function job(overrides: Partial<AgreementSource> = {}): AgreementSource {
  return {
    businessName: "Hart & Co",
    customerName: "Helen Brooks",
    address: "22 Harbour Lane, Clevedon, BS21 7QA",
    phone: "07700 900222",
    email: "helen.brooks@example.com",
    trade: "Plumber",
    description: "Replace the kitchen mixer tap.",
    internalNotes: "GATE-CODE-4821",
    scheduledDate: "2026-10-04",
    timeSlot: "afternoon",
    materials: [
      {
        name: "Kitchen mixer tap",
        quantity: "1",
        unit: "each",
        unitPricePence: 7900,
        costPricePence: 987654,
      },
    ],
    ...overrides,
  };
}

function record(token: string, source: AgreementSource = job()): ShareRecord {
  return { ...source, shareToken: token };
}

describe("share-link access", () => {
  it("issues unguessable tokens", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => createShareToken()));
    assert.equal(tokens.size, 20);
    for (const token of tokens) {
      assert.equal(isWellFormedShareToken(token), true);
      assert.equal(token.length, 43);
    }
    assert.equal(isWellFormedShareToken("short"), false);
    assert.equal(isWellFormedShareToken(`${"a".repeat(42)}.`), false);
  });

  it("returns only the matching job and strips notes and costs", () => {
    const tokenA = createShareToken();
    const tokenB = createShareToken();
    const helen = record(tokenA, job());
    const dave = record(
      tokenB,
      job({
        customerName: "Dave Singh",
        description: "Repoint the garden wall.",
        internalNotes: "OTHER-SECRET-999",
      }),
    );

    const wrong = presentShare({ token: tokenA, record: dave, signOff: null });
    assert.equal(wrong.kind, "not_found");

    const missing = presentShare({ token: tokenA, record: null, signOff: null });
    assert.equal(missing.kind, "not_found");

    const shown = presentShare({ token: tokenA, record: helen, signOff: null });
    assert.equal(shown.kind, "pending");
    if (shown.kind !== "pending") return;

    assert.equal(shown.agreement.customerName, "Helen Brooks");
    assert.equal(shown.agreement.description, "Replace the kitchen mixer tap.");
    assert.equal(shown.agreement.materials[0].unitPricePence, 7900);
    assert.equal(shown.agreement.totalPence, 7900);
    assert.equal("costPricePence" in shown.agreement.materials[0], false);
    assert.equal("internalNotes" in shown.agreement, false);
    assert.equal("shareToken" in shown.agreement, false);

    const json = JSON.stringify(shown);
    assert.equal(json.includes("GATE-CODE-4821"), false);
    assert.equal(json.includes("OTHER-SECRET-999"), false);
    assert.equal(json.includes("987654"), false);
    assert.equal(json.includes(tokenA), false);
    assert.equal(json.includes(tokenB), false);
    assert.equal(json.includes("Dave Singh"), false);
  });

  it("shows the locked copy after sign-off, not a later edit", () => {
    const token = createShareToken();
    const original = job();
    const locked = lockAgreement(original, {
      signerName: "Helen Brooks",
      signedAt: "2026-10-04T07:15:00.000Z",
    });
    const edited = record(token, {
      ...original,
      description: "Replace the tap and move the stopcock.",
      internalNotes: "GATE-CODE-4821",
    });

    const shown = presentShare({
      token,
      record: edited,
      signOff: { snapshot: locked, signatureDataUrl: "data:image/png;base64,abc" },
    });
    assert.equal(shown.kind, "signed");
    if (shown.kind !== "signed") return;
    assert.equal(shown.agreement.description, "Replace the kitchen mixer tap.");
    assert.equal(shown.agreement.signerName, "Helen Brooks");
    assert.equal(JSON.stringify(shown).includes("stopcock"), false);
    assert.equal(JSON.stringify(shown).includes("GATE-CODE-4821"), false);
  });

  it("does not fall back to the live job when the locked copy is unreadable", () => {
    const token = createShareToken();
    const shown = presentShare({
      token,
      record: record(token),
      signOff: { snapshot: { description: "live text must not leak" }, signatureDataUrl: "x" },
    });
    assert.deepEqual(shown, { kind: "damaged" });
  });

  it("rejects a badly shaped token even if a record is supplied", () => {
    const shown = presentShare({
      token: "not-a-real-token",
      record: record("not-a-real-token"),
      signOff: null,
    });
    assert.equal(shown.kind, "not_found");
  });
});
