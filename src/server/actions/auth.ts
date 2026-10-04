"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { databaseFailureMessage } from "@/lib/database";
import { isConfigured } from "@/lib/config";
import { isFrameworkControlFlow } from "@/lib/setup-gate";
import type { ActionState } from "@/lib/form-state";
import { getPrisma } from "@/server/prisma";
import { createSession, deleteSession } from "@/server/session";

const DUMMY_HASH = "$2b$10$RI59kpWNU8GMMIYgYpJAp.30JKHZYZl1TrZqyBxUT9NwQS0k3knE.";

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!isConfigured()) {
    return { error: "Builder Buddy is not configured, so sign-in is closed." };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || password.length > 200) {
    return { error: "Email or password is not right." };
  }
  let user: { id: string; passwordHash: string } | null;
  try {
    user = await getPrisma().user.findUnique({ where: { email } });
  } catch (error) {
    if (isFrameworkControlFlow(error)) throw error;
    return { error: databaseFailureMessage(error) };
  }
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const matches = await bcrypt.compare(password, hash);
  if (!user || !matches) {
    return { error: "Email or password is not right." };
  }
  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
