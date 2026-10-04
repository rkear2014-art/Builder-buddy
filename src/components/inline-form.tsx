"use client";

import { useActionState } from "react";
import { initialFormState, type ActionState } from "@/lib/form-state";

function keepEnterInField(event: React.KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter") return;
  const target = event.target;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
  event.preventDefault();
}

export function InlineForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className={className} onKeyDown={keepEnterInField}>
      {state.error ? (
        <p role="alert" className="mb-3 rounded-xl bg-blush px-3 py-2 font-bold text-clay">
          {state.error}
        </p>
      ) : null}
      {children}
    </form>
  );
}
