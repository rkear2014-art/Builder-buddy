import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agreementChanges,
  keepExistingSignOff,
  lockAgreement,
  parseLockedAgreement,
  toPublicAgreement,
  type AgreementSource,
} from "./agreement";

const signedAt = "2026-10-04T08:40:00.000Z";

function plasterJob(): AgreementSource {
  return {
    businessName: "Hart & Co",
    customerName: "Anita Patel",
    address: "14 Larkspur Road, Bristol, BS7 8NS",
    phone: "07700 900123",
    email: "anita.patel@example.com",
    trade: "Plasterer",
    description: "Skim the lounge and hall.",
    internalNotes: "GATE-CODE-4821",
    scheduledDate: "2026-10-06",
    timeSlot: "morning",
    materials: [
      {
        name: "Multi-finish plaster",
        quantity: "3",
        unit: "bag",
        unitPricePence: 940,
        costPricePence: 987654,
      },
      {
        name: "Scrim tape",
        quantity: "1",
        unit: "roll",
        unitPricePence: null,
        costPricePence: 280,
      },
    ],
  };
}

describe("sign-off locking", () => {
  it("keeps the agreed wording after the working job is edited", () => {
    const job = plasterJob();
    const locked = lockAgreement(job, { signerName: "Anita Patel", signedAt });

    job.description = "Skim the whole house and the extension.";
    job.materials[0].unitPricePence = 5000;
    job.materials.push({
      name: "Extra skim",
      quantity: "1",
      unit: "bag",
      unitPricePence: 100,
      costPricePence: 50,
    });
    job.internalNotes = "changed note";

    assert.equal(locked.description, "Skim the lounge and hall.");
    assert.equal(locked.materials.length, 2);
    assert.equal(locked.materials[0].unitPricePence, 940);
    assert.equal(locked.materials[0].lineTotalPence, 2820);
    assert.equal(locked.signerName, "Anita Patel");
    assert.equal(locked.signedAt, signedAt);
    assert.equal(parseLockedAgreement(locked)?.description, "Skim the lounge and hall.");
  });

  it("does not treat a bought tick or a cost change as a change to the agreement", () => {
    const job = plasterJob();
    const locked = lockAgreement(job, { signerName: "Anita Patel", signedAt });
    const current = toPublicAgreement({
      ...job,
      materials: job.materials.map((line) => ({ ...line, costPricePence: 1 })),
    });
    assert.deepEqual(agreementChanges(locked, current), []);
  });

  it("names the customer-facing fields that drifted", () => {
    const job = plasterJob();
    const locked = lockAgreement(job, { signerName: "Anita Patel", signedAt });
    const current = toPublicAgreement({
      ...job,
      description: "Skim the lounge, hall, and stairs.",
      scheduledDate: "2026-10-07",
    });
    assert.deepEqual(agreementChanges(locked, current), ["Work description", "Date"]);
  });

  it("leaves labourer and subcontractor pay off the customer quote", () => {
    const agreed = toPublicAgreement({
      ...plasterJob(),
      materials: [
        ...plasterJob().materials,
        { name: "Labour", quantity: "3", unit: "day", unitPricePence: 40000, costPricePence: null },
        { name: "Labourer", quantity: "3", unit: "day", unitPricePence: 12000, costPricePence: 12000 },
        { name: "Subcontractor", quantity: "72", unit: "m²", unitPricePence: 1000, costPricePence: 1000 },
      ],
    });
    assert.deepEqual(
      agreed.materials.map((line) => line.name),
      ["Multi-finish plaster", "Scrim tape", "Labour"],
    );
    assert.equal(agreed.materials.some((line) => line.name === "Subcontractor"), false);
    assert.equal(agreed.totalPence, 122820);
  });

  it("refuses a second signature and keeps the first snapshot", () => {
    const first = lockAgreement(plasterJob(), { signerName: "Anita Patel", signedAt });
    const second = lockAgreement(
      { ...plasterJob(), description: "A different agreement." },
      { signerName: "Someone Else", signedAt: "2026-10-05T10:00:00.000Z" },
    );
    const decision = keepExistingSignOff(first, second);
    assert.equal(decision.created, false);
    assert.equal(decision.accepted, first);
    assert.equal(decision.accepted.description, "Skim the lounge and hall.");
  });

  it("rejects a snapshot that is not the locked shape", () => {
    assert.equal(parseLockedAgreement({ description: "Skim the lounge and hall." }), null);
    assert.equal(parseLockedAgreement(null), null);
  });

  it("reads an older signed copy that has no VAT, deposit, or line-price flag", () => {
    const locked = lockAgreement(plasterJob(), { signerName: "Anita Patel", signedAt });
    const stored: Record<string, unknown> = { ...locked };
    delete stored.showLinePrices;
    delete stored.depositPence;
    delete stored.vatRegistered;
    delete stored.vatRatePercent;
    delete stored.totalOnly;
    delete stored.fixedPricePence;

    const parsed = parseLockedAgreement(stored);
    assert.ok(parsed);
    assert.equal(parsed.showLinePrices, true);
    assert.equal(parsed.depositPence, null);
    assert.equal(parsed.vatRegistered, false);
    assert.equal(parsed.vatRatePercent, 20);
    assert.equal(parsed.totalOnly, false);
    assert.equal(parsed.fixedPricePence, null);
    assert.equal(parsed.description, "Skim the lounge and hall.");
    assert.equal(parsed.totalPence, locked.totalPence);
  });

  it("names VAT, deposit, and item-price changes separately from the materials", () => {
    const job = plasterJob();
    const locked = lockAgreement(job, { signerName: "Anita Patel", signedAt });
    const current = toPublicAgreement({
      ...job,
      vatRegistered: true,
      vatRatePercent: 20,
      depositPence: 5000,
      showLinePrices: false,
    });
    assert.deepEqual(agreementChanges(locked, current), ["VAT", "Deposit", "Item prices"]);
  });

  it("freezes the terms wording with the signature and still reads an older copy", () => {
    const terms = "AK Plastering – Terms and Conditions\n\n1. Quotes. Valid for 30 days.";
    const locked = lockAgreement(plasterJob(), { signerName: "Anita Patel", signedAt, termsText: terms });
    assert.equal(locked.termsText, terms);
    assert.equal(locked.termsAgreedAt, signedAt);
    assert.equal(parseLockedAgreement(locked)?.termsText, terms);

    const older = lockAgreement(plasterJob(), { signerName: "Anita Patel", signedAt });
    const stored: Record<string, unknown> = { ...older };
    delete stored.termsText;
    delete stored.termsAgreedAt;
    const parsed = parseLockedAgreement(stored);
    assert.ok(parsed);
    assert.equal(parsed.termsText, undefined);
    assert.equal(parsed.description, "Skim the lounge and hall.");
  });

  it("uses a whole-job price and hides the materials total", () => {
    const agreed = toPublicAgreement({ ...plasterJob(), totalOnly: true, fixedPricePence: 80000 });
    assert.equal(agreed.totalPence, 80000);
    assert.equal(agreed.totalOnly, true);
    assert.equal(agreed.unpricedCount, 0);
    assert.equal(agreed.materials.length, 2);
  });
});
