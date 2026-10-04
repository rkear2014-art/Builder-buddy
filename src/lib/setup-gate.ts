import { timingSafeEqual } from "node:crypto";

export type SetupSnapshot = {
  userCount: number;
  /** False only for the unclaimed singleton row. Null means the row is missing. */
  claimed: boolean | null;
};

export function requiredSetupToken(value: string | undefined): string | null {
  const token = value?.trim() ?? "";
  return token.length > 0 ? token : null;
}

export function setupTokenMatches(supplied: string, required: string): boolean {
  const left = Buffer.from(supplied);
  const right = Buffer.from(required);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

/** The form is offered only before any account exists and before the lock is claimed. */
export function setupIsOpen(snapshot: SetupSnapshot): boolean {
  return snapshot.userCount === 0 && snapshot.claimed === false;
}

export function evaluateSetupClaim(
  snapshot: SetupSnapshot,
  input: { suppliedToken: string; requiredToken: string | null },
): { ok: true } | { ok: false; reason: "closed" | "token" } {
  if (!setupIsOpen(snapshot)) return { ok: false, reason: "closed" };
  if (input.requiredToken !== null && !setupTokenMatches(input.suppliedToken, input.requiredToken)) {
    return { ok: false, reason: "token" };
  }
  return { ok: true };
}
