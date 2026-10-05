"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/form-state";
import { BookingKindFields } from "@/components/booking-kind-fields";
import { InlineForm } from "@/components/inline-form";

function PutOnDiaryButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary min-h-16 w-full text-lg" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Put on the diary"}
    </button>
  );
}

export function DiaryBookForm({
  action,
  jobId,
  defaultDate,
  bookingKind,
  spanDays,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  jobId: string;
  defaultDate: string;
  bookingKind: string;
  spanDays: number;
}) {
  return (
    <InlineForm action={action} className="grid gap-4">
      <input type="hidden" name="jobId" value={jobId} />
      <label className="field">
        Date
        <span>The day this job shows on the diary.</span>
        <input name="scheduledDate" type="date" required defaultValue={defaultDate} className="text-xl" />
      </label>
      <BookingKindFields dateChoice="none" bookingKind={bookingKind} spanDays={spanDays} />
      <PutOnDiaryButton />
    </InlineForm>
  );
}
