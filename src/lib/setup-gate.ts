import { timingSafeEqual } from "node:crypto";
import { databaseFailureMessage } from "./database";

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

export type SetupCheck =
  | { state: "open" }
  | { state: "closed" }
  | { state: "unavailable"; message: string };

export function setupCheckFromSnapshot(snapshot: SetupSnapshot): SetupCheck {
  return setupIsOpen(snapshot) ? { state: "open" } : { state: "closed" };
}

/** A failed read must not be treated as "an account already exists". */
export function loginOffersCreate(check: SetupCheck): boolean {
  return check.state !== "closed";
}

export function isFrameworkControlFlow(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK");
}

/** Turns a snapshot read into a page decision. Redirects and notFound stay thrown. */
export async function settleSetupCheck(read: () => Promise<SetupSnapshot>): Promise<SetupCheck> {
  try {
    return setupCheckFromSnapshot(await read());
  } catch (error) {
    if (isFrameworkControlFlow(error)) throw error;
    return { state: "unavailable", message: databaseFailureMessage(error) };
  }
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
