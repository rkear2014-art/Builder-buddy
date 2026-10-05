"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { login } from "@/server/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ showDemo }: { showDemo: boolean }) {
  const [state, formAction] = useActionState(login, initialFormState);
  return (
    <form action={formAction} className="grid gap-4">
      {state.error ? (
        <p role="alert" className="rounded-xl bg-blush px-3 py-2 font-bold text-clay">
          {state.error}
        </p>
      ) : null}
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      {showDemo ? (
        <p className="signin-demo text-sm text-stone">
          Demo: demo@builderbuddy.co.uk / Plaster-tea-1. Change this before real jobs go in.
        </p>
      ) : null}
    </form>
  );
}
