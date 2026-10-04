"use server";

import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/config";
import type { ActionState } from "@/lib/form-state";
import { parseAccountForm } from "@/lib/validators";
import { claimFirstAccount } from "@/server/setup";
import { createSession } from "@/server/session";

export async function createFirstAccount(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!isConfigured()) {
    return { error: "Builder Buddy is not configured, so setup is closed." };
  }
  const parsed = parseAccountForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const result = await claimFirstAccount(parsed.data);
  if (!result.ok) return { error: result.error };
  await createSession(result.userId);
  redirect("/");
}
