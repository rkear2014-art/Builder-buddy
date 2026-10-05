"use client";

import { useState } from "react";
import { TIME_SLOTS, singleEnabledTrade } from "@/lib/constants";
import type { ActionState } from "@/lib/form-state";
import { findSiteAddress } from "@/server/actions/address";
import { BookingKindFields } from "@/components/booking-kind-fields";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";

export function BookingForm({
  action,
  defaultDate,
  accent,
  accentInk,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultDate: string;
  accent: string;
  accentInk: string;
}) {
  const trade = singleEnabledTrade() ?? "";
  const [postcode, setPostcode] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [note, setNote] = useState("");
  const [looking, setLooking] = useState(false);
  const [premises, setPremises] = useState<Array<{ line1: string; line2: string }>>([]);

  async function findAddress() {
    setLooking(true);
    setNote("");
    const found = await findSiteAddress(postcode);
    setLooking(false);
    if (!found.ok) {
      setPremises([]);
      setNote(found.error);
      return;
    }
    setPostcode(found.result.postcode);
    setTown(found.result.town);
    setCounty(found.result.county);
    setPremises(found.result.premises);
    if (found.result.premises.length === 1) {
      setLine1(found.result.premises[0]?.line1 ?? "");
      setLine2(found.result.premises[0]?.line2 ?? "");
      setNote("Address filled in. Check the house number and street.");
    } else if (found.result.premises.length > 1) {
      setNote("Choose the address, then check it.");
    } else {
      setNote("Postcode found. Type the house number and street.");
    }
  }

  return (
    <InlineForm action={action} className="grid gap-4">
      <input type="hidden" name="trade" value={trade} />
      <label className="field">
        Customer name
        <input name="customerName" required autoComplete="name" placeholder="e.g. Mrs Patel" />
      </label>
      <fieldset className="grid gap-3">
        <legend className="font-extrabold">Site address</legend>
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <label className="field">
            Postcode
            <input name="postcode" required autoComplete="postal-code" value={postcode} onChange={(event) => setPostcode(event.target.value)} placeholder="e.g. BS7 8NS" />
          </label>
          <button type="button" className="btn" style={{ background: accent, color: accentInk }} disabled={looking} onClick={() => void findAddress()}>
            {looking ? "Finding…" : "Find address"}
          </button>
        </div>
        {note ? <p className="text-sm font-semibold text-stone">{note}</p> : null}
        {premises.length > 1 ? (
          <label className="field">
            Choose an address
            <select
              defaultValue=""
              onChange={(event) => {
                const picked = premises[Number(event.target.value)];
                if (!picked) return;
                setLine1(picked.line1);
                setLine2(picked.line2);
              }}
            >
              <option value="" disabled>
                Select
              </option>
              {premises.map((item, index) => (
                <option key={`${item.line1}-${index}`} value={index}>
                  {[item.line1, item.line2].filter(Boolean).join(", ")}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          House number & street
          <input name="addressLine1" required autoComplete="address-line1" value={line1} onChange={(event) => setLine1(event.target.value)} placeholder="e.g. 12 High Street" />
        </label>
        <label className="field">
          Address line 2
          <span>Optional</span>
          <input name="addressLine2" autoComplete="address-line2" value={line2} onChange={(event) => setLine2(event.target.value)} placeholder="Flat, building, area" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">
            Town
            <input name="town" autoComplete="address-level2" value={town} onChange={(event) => setTown(event.target.value)} />
          </label>
          <label className="field">
            County
            <input name="county" autoComplete="address-level1" value={county} onChange={(event) => setCounty(event.target.value)} />
          </label>
        </div>
      </fieldset>
      <label className="field">
        Customer tel
        <span>Mobile or landline</span>
        <input name="phone" type="tel" inputMode="tel" required autoComplete="tel" />
      </label>
      <label className="field">
        Customer email
        <span>For emailing the quote</span>
        <input name="email" type="email" autoComplete="email" />
      </label>
      <label className="field">
        Notes
        <span>Access, survey notes…</span>
        <textarea name="internalNotes" placeholder="Access, survey notes…" />
      </label>
      <BookingKindFields dateChoice="create" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Date
          <input name="scheduledDate" type="date" required defaultValue={defaultDate} />
        </label>
        <label className="field">
          Time slot
          <select name="timeSlot" required defaultValue="morning">
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <SubmitButton>Save and choose a job</SubmitButton>
    </InlineForm>
  );
}
