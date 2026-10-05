"use client";

import { useState } from "react";
import { AK_PLASTERING_PREFILL } from "@/lib/ak-plastering";
import type { BusinessProfile } from "@/lib/branding";
import { saveBusinessProfile } from "@/server/actions/branding";
import { InlineForm } from "@/components/inline-form";
import { SubmitButton } from "@/components/submit-button";

export function BusinessProfileForm({ initial }: { initial: BusinessProfile }) {
  const [profile, setProfile] = useState(initial);

  function setField(name: keyof BusinessProfile, value: string) {
    setProfile((current) => ({ ...current, [name]: value }));
  }

  return (
    <InlineForm action={saveBusinessProfile} className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setProfile({ ...AK_PLASTERING_PREFILL })}
        >
          Fill in AK Plastering&apos;s details
        </button>
      </div>
      <p className="text-sm font-semibold text-stone">
        That only fills these boxes. Nothing is saved until you press Save business details.
      </p>
      <label className="field">
        Business name
        <input
          name="name"
          required
          value={profile.name}
          onChange={(event) => setField("name", event.target.value)}
        />
      </label>
      <label className="field">
        Subtitle
        <span>
          Optional. Shown under the business name at the top of the app. For example, Plastering &amp; rendering
          specialists. It is also printed on the customer agreement.
        </span>
        <input
          name="tagline"
          value={profile.tagline}
          onChange={(event) => setField("tagline", event.target.value)}
        />
      </label>
      <label className="field">
        Phone
        <span>Optional.</span>
        <input
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          value={profile.phone}
          onChange={(event) => setField("phone", event.target.value)}
        />
      </label>
      <label className="field">
        Email
        <span>Optional. This is the business email, not your sign-in email.</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={profile.email}
          onChange={(event) => setField("email", event.target.value)}
        />
      </label>
      <label className="field">
        Address
        <span>Optional.</span>
        <textarea
          name="address"
          value={profile.address}
          onChange={(event) => setField("address", event.target.value)}
        />
      </label>
      <label className="field">
        Website
        <span>Optional.</span>
        <input
          name="website"
          inputMode="url"
          autoComplete="url"
          value={profile.website}
          onChange={(event) => setField("website", event.target.value)}
        />
      </label>
      <SubmitButton>Save business details</SubmitButton>
    </InlineForm>
  );
}
