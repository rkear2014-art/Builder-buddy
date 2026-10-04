import { randomBytes } from "node:crypto";

export type AccessDecision =
  | { type: "next" }
  | { type: "redirect"; to: "/" | "/login" }
  | { type: "unavailable" };

export function createShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 32 bytes of base64url, with no padding. Anything else is rejected. */
export function isWellFormedShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function normalisePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isCustomerSharePath(pathname: string): boolean {
  const match = normalisePath(pathname).match(/^\/sign\/([^/]+)(?:\/print)?$/);
  if (!match) return false;
  return isWellFormedShareToken(match[1]);
}

/**
 * Default-deny gate for the tradesperson app.
 * Missing configuration never falls through to "allow".
 */
export function decideAccess(input: {
  pathname: string;
  configured: boolean;
  hasValidSession: boolean;
}): AccessDecision {
  const pathname = normalisePath(input.pathname);

  if (
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname.startsWith("/icons/")
  ) {
    return { type: "next" };
  }

  // Framework assets and the dev reload socket are not app routes.
  // They must not be sent to the login page, or the customer signature pad never starts.
  if (pathname.startsWith("/_next/")) {
    return input.configured ? { type: "next" } : { type: "unavailable" };
  }

  if (!input.configured) {
    return { type: "unavailable" };
  }

  if (
    pathname === "/icon" ||
    pathname.startsWith("/icon.") ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/apple-icon.")
  ) {
    return { type: "next" };
  }

  // Any /sign address stays on the customer side, including a broken link.
  // The page itself only loads a job when the token is well formed and matches one row.
  if (pathname === "/sign" || pathname.startsWith("/sign/")) {
    return { type: "next" };
  }

  if (pathname === "/login" || pathname === "/setup") {
    return input.hasValidSession ? { type: "redirect", to: "/" } : { type: "next" };
  }

  if (!input.hasValidSession) {
    return { type: "redirect", to: "/login" };
  }

  return { type: "next" };
}
