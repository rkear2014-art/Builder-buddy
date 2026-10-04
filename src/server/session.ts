import "server-only";
import { cookies } from "next/headers";
import { isConfigured } from "@/lib/config";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  decryptSession,
  encryptSession,
} from "@/lib/session-token";

export async function createSession(userId: string): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !isConfigured()) {
    throw new Error("Refusing to start a session without configuration.");
  }
  const token = await encryptSession(userId, secret);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSessionUserId(): Promise<string | null> {
  if (!isConfigured()) return null;
  const cookieStore = await cookies();
  const session = await decryptSession(cookieStore.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  return session?.userId ?? null;
}
