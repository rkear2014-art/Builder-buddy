import { SignJWT, jwtVerify } from "jose";
import { MIN_AUTH_SECRET_LENGTH } from "./config";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type SessionClaims = {
  userId: string;
};

function signingKey(secret: string | undefined): Uint8Array | null {
  if (!secret || secret.length < MIN_AUTH_SECRET_LENGTH) return null;
  return new TextEncoder().encode(secret);
}

export async function encryptSession(
  userId: string,
  secret: string | undefined,
): Promise<string> {
  const key = signingKey(secret);
  if (!key) {
    throw new Error("Refusing to sign a session without AUTH_SECRET.");
  }
  if (!userId) {
    throw new Error("Refusing to sign a session without a user.");
  }
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key);
}

/** Returns null for a missing secret, a bad token, or a failed signature. Never throws. */
export async function decryptSession(
  token: string | undefined,
  secret: string | undefined,
): Promise<SessionClaims | null> {
  const key = signingKey(secret);
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || payload.userId.length === 0) {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
