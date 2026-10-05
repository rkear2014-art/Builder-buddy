"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "pine" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-${variant} w-full sm:w-auto ${className}`} type="submit" disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}
