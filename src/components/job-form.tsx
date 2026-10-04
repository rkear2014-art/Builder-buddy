"use client";

import { JOB_STATUSES, STATUS_LABELS, TIME_SLOTS, TRADES } from "@/lib/constants";
import type { ActionState } from "@/lib/form-state";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";

export function JobForm({
  action,
  submitLabel,
  defaultDate,
  job,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  defaultDate: string;
  job?: {
    id: string;
    customerName: string;
    address: string;
    phone: string;
    email: string;
    trade: string;
    description: string;
    internalNotes: string;
    scheduledDate: string;
    timeSlot: string;
    status: string;
  };
}) {
  return (
    <InlineForm action={action} className="grid gap-4">
      {job ? <input type="hidden" name="jobId" value={job.id} /> : null}
      <label className="field">
        Customer name
        <input name="customerName" required autoComplete="name" defaultValue={job?.customerName} />
      </label>
      <label className="field">
        Address
        <textarea
          name="address"
          required
          autoComplete="street-address"
          defaultValue={job?.address}
          placeholder="14 Larkspur Road, Bristol, BS7 8NS"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Phone
          <input name="phone" type="tel" required autoComplete="tel" defaultValue={job?.phone} />
        </label>
        <label className="field">
          Email
          <span>Optional</span>
          <input name="email" type="email" autoComplete="email" defaultValue={job?.email} />
        </label>
      </div>
      <label className="field">
        Trade
        <select name="trade" required defaultValue={job?.trade ?? ""}>
          <option value="" disabled>
            Choose a trade
          </option>
          {TRADES.map((trade) => (
            <option key={trade} value={trade}>
              {trade}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Work
        <span>This is what the customer will read and sign.</span>
        <textarea name="description" required defaultValue={job?.description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Date
          <input name="scheduledDate" type="date" required defaultValue={job?.scheduledDate ?? defaultDate} />
        </label>
        <label className="field">
          Time slot
          <select name="timeSlot" required defaultValue={job?.timeSlot ?? ""}>
            <option value="" disabled>
              Choose a slot
            </option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        Status
        <select name="status" defaultValue={job?.status ?? "ENQUIRY"}>
          {JOB_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Internal notes
        <span>The customer never sees these. Gate codes, parking, and your own reminders.</span>
        <textarea name="internalNotes" defaultValue={job?.internalNotes} className="bg-sand" />
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </InlineForm>
  );
}
