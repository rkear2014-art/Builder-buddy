"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { createFirstAccount } from "@/server/actions/setup";
import { SubmitButton } from "@/components/submit-button";

export function SetupForm({ tokenRequired }: { tokenRequired: boolean }) {
  const [state, formAction] = useActionState(createFirstAccount, initialFormState);
  return (
    <form action={formAction} className="grid gap-4">
      {state.error ? (
        <p role="alert" className="rounded-xl bg-blush px-3 py-2 font-bold text-clay">
          {state.error}
        </p>
      ) : null}
      <label className="field">
        Business name
        <input name="businessName" required autoComplete="organization" placeholder="Hart & Co" />
      </label>
      <label className="field">
        Your name
        <input name="name" required autoComplete="name" placeholder="Sam Hart" />
      </label>
      <label className="field">
        Email
        <input name="email" type="email" required autoComplete="username" />
      </label>
      <label className="field">
        Password
        <span>At least 10 characters, with a letter and a number.</span>
        <input name="password" type="password" required autoComplete="new-password" minLength={10} />
      </label>
      <label className="field">
        Confirm password
        <input name="confirmPassword" type="password" required autoComplete="new-password" minLength={10} />
      </label>
      {tokenRequired ? (
        <label className="field">
          Setup code
          <input name="setupToken" required autoComplete="off" />
        </label>
      ) : null}
      <SubmitButton pendingLabel="Creating your account…">Create your account</SubmitButton>
    </form>
  );
}
