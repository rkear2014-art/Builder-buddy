"use client";

import { useState } from "react";
import type { CrewDraftRole, CrewRoleId } from "@/lib/crew";
import { saveJobCrew } from "@/server/actions/crew";
import { CrewEditor, CrewHiddenFields } from "@/components/crew-editor";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";

export function CrewForm({
  jobId,
  initialDays,
  initialRoles,
  totalM2,
  accent,
  accentInk,
  nested = false,
}: {
  jobId: string;
  initialDays: string;
  initialRoles: CrewDraftRole[];
  totalM2: number;
  accent: string;
  accentInk: string;
  nested?: boolean;
}) {
  const [days, setDays] = useState(initialDays);
  const [roles, setRoles] = useState(initialRoles);

  function onRole(role: CrewRoleId, patch: Partial<CrewDraftRole>) {
    setRoles((current) => current.map((item) => (item.role === role ? { ...item, ...patch } : item)));
  }

  return (
    <InlineForm action={saveJobCrew} className={nested ? "grid gap-4" : "card grid gap-4"}>
      <input type="hidden" name="jobId" value={jobId} />
      <CrewEditor days={days} roles={roles} totalM2={totalM2} accent={accent} accentInk={accentInk} onDays={setDays} onRole={onRole} />
      <CrewHiddenFields days={days} roles={roles} />
      <SubmitButton variant={nested ? "secondary" : "primary"}>Save crew</SubmitButton>
      <p className="text-sm text-stone">Saving with a plasterer on the job replaces the Labour line on the quote. Labourer and subcontractor amounts stay on this page.</p>
    </InlineForm>
  );
}
