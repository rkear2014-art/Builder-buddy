import { isWellFormedShareToken } from "./access";
import {
  type AgreementSource,
  type LockedAgreement,
  type PublicAgreement,
  parseLockedAgreement,
  toPublicAgreement,
} from "./agreement";

export type ShareRecord = AgreementSource & {
  shareToken: string;
};

export type ShareSignOff = {
  snapshot: unknown;
  signatureDataUrl: string;
};

export type SharePresentation =
  | { kind: "not_found" }
  | { kind: "pending"; agreement: PublicAgreement }
  | { kind: "signed"; agreement: LockedAgreement; signatureDataUrl: string }
  | { kind: "damaged" };

/**
 * Resolves one share token to the customer view.
 * A token never selects a different job, and a signed job never falls back to live edits.
 */
export function presentShare(input: {
  token: string;
  record: ShareRecord | null;
  signOff: ShareSignOff | null;
}): SharePresentation {
  if (!isWellFormedShareToken(input.token)) return { kind: "not_found" };
  if (!input.record || input.record.shareToken !== input.token) return { kind: "not_found" };

  if (!input.signOff) {
    return { kind: "pending", agreement: toPublicAgreement(input.record) };
  }

  const locked = parseLockedAgreement(input.signOff.snapshot);
  if (!locked) return { kind: "damaged" };

  return {
    kind: "signed",
    agreement: locked,
    signatureDataUrl: input.signOff.signatureDataUrl,
  };
}
