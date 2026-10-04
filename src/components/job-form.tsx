"use client";

import { useState } from "react";
import { JOB_STATUSES, STATUS_LABELS, TIME_SLOTS, TRADES } from "@/lib/constants";
import type { ActionState } from "@/lib/form-state";
import { starterTemplatesFor } from "@/lib/trade-starters";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";

const PLASTERING_TEMPLATES = starterTemplatesFor("Plasterer");

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
  const [trade, setTrade] = useState(job?.trade ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [starterId, setStarterId] = useState("");

  function chooseStarter(id: string) {
    setStarterId(id);
    const starter = PLASTERING_TEMPLATES.find((template) => template.id === id);
    if (starter) setDescription(starter.description);
  }

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
        <select
          name="trade"
          required
          value={trade}
          onChange={(event) => {
            const next = event.target.value;
            setTrade(next);
            if (next !== "Plasterer") setStarterId("");
          }}
        >
          <option value="" disabled>
            Choose a trade
          </option>
          {TRADES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {!job && trade === "Plasterer" ? (
        <fieldset className="grid gap-2">
          <legend className="font-extrabold">Job template</legend>
          <p className="text-sm text-stone">
            Optional. Choosing one fills the work the customer will read, and adds the materials with blank prices. You
            can change the wording afterwards.
          </p>
          <div className="grid gap-2">
            <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2">
              <input
                type="radio"
                name="starterId"
                value=""
                checked={starterId === ""}
                onChange={() => setStarterId("")}
              />
              <span>No template</span>
            </label>
            {PLASTERING_TEMPLATES.map((template) => (
              <label
                key={template.id}
                className="flex items-start gap-3 rounded-2xl border border-line bg-white px-3 py-2"
              >
                <input
                  type="radio"
                  name="starterId"
                  value={template.id}
                  checked={starterId === template.id}
                  onChange={() => chooseStarter(template.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-bold">{template.name}</span>
                  <span className="text-sm text-stone">{template.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="field">
        Work
        <span>This is what the customer will read and sign.</span>
        <textarea name="description" required value={description} onChange={(event) => setDescription(event.target.value)} />
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
