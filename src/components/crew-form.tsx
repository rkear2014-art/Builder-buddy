"use client";

import { useState } from "react";
import type { CrewDraftRole, CrewRoleId } from "@/lib/crew";
import { saveJobCrew } from "@/server/actions/crew";
import { CrewEditor, CrewHiddenFields } from "@/components/crew-editor";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";

export function CrewForm({
  jobId,
  sectionId = "",
  initialDays,
  initialRoles,
  totalM2,
  accent,
  accentInk,
  nested = false,
}: {
  jobId: string;
  sectionId?: string;
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
      <input type="hidden" name="sectionId" value={sectionId} />
      <CrewEditor days={days} roles={roles} totalM2={totalM2} accent={accent} accentInk={accentInk} onDays={setDays} onRole={onRole} />
      <CrewHiddenFields days={days} roles={roles} />
      <SubmitButton variant={nested ? "secondary" : "primary"}>Save crew</SubmitButton>
      <p className="text-sm text-stone">Saving adds every priced person to the Labour line, including a labourer on their own. The customer sees that one line on the quote and the invoice.</p>
    </InlineForm>
  );
}
