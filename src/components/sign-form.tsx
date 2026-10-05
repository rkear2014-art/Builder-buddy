"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { acceptedSignature } from "@/lib/signature";
import { signAgreement } from "@/server/actions/signoff";
import { TermsBody } from "@/components/quote-terms";
import { SignaturePad } from "@/components/signature-pad";
import { SubmitButton } from "@/components/submit-button";

export function SignForm({ token, terms }: { token: string; terms: string }) {
  const [state, formAction] = useActionState(signAgreement, initialFormState);
  const [signature, setSignature] = useState("");
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [blocked, setBlocked] = useState("");
  const signatureRef = useRef("");
  const fieldRef = useRef<HTMLInputElement>(null);

  function storeSignature(value: string) {
    signatureRef.current = value;
    if (fieldRef.current) fieldRef.current.value = value;
    setSignature(value);
    if (value) setBlocked("");
  }

  return (
    <form
      action={formAction}
      className="grid gap-4"
      onKeyDown={(event) => {
        if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
          event.preventDefault();
        }
      }}
      onSubmit={(event) => {
        const drawn = fieldRef.current?.value || signatureRef.current;
        if (!agreed || name.trim().length < 2 || !acceptedSignature(drawn)) {
          event.preventDefault();
          setBlocked(
            !agreed
              ? "Tick that you have read and agree to the terms and conditions."
              : name.trim().length < 2
                ? "Enter the name of the person signing."
                : "Draw your signature before sending.",
          );
        }
      }}
    >
      <input type="hidden" name="token" value={token} />
      <input ref={fieldRef} type="hidden" name="signature" defaultValue="" />
      {state.error || blocked ? (
        <p role="alert" className="rounded-xl bg-blush px-3 py-2 font-bold text-clay">
          {state.error || blocked}
        </p>
      ) : null}
      <div className="grid gap-3 rounded-2xl border border-line bg-white p-4">
        <label className="flex items-start gap-3 text-lg font-bold">
          <input
            type="checkbox"
            name="termsAgreed"
            value="yes"
            required
            checked={agreed}
            onChange={(event) => {
              setAgreed(event.target.checked);
              if (event.target.checked) setBlocked("");
            }}
            className="mt-1 h-7 w-7 shrink-0"
          />
          <span>I have read and agree to the terms and conditions</span>
        </label>
        <p>
          <a href="#quote-terms" className="font-bold underline">
            Read the terms and conditions
          </a>
        </p>
        <details className="rounded-xl border border-line px-3 py-2">
          <summary className="cursor-pointer font-bold">Show the terms and conditions</summary>
          <div className="mt-4 border-t border-line pt-4">
            <TermsBody text={terms} />
          </div>
        </details>
      </div>
      <label className="field">
        Your name
        <input
          name="signerName"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div>
        <p className="mb-2 font-bold">Sign with a finger or mouse</p>
        <SignaturePad onChange={storeSignature} />
      </div>
      <p className="text-sm text-stone">Signing needs JavaScript so the page can read the mark you draw.</p>
      <SubmitButton disabled={!agreed || name.trim().length < 2 || signature.length === 0} pendingLabel="Sending…">
        I agree
      </SubmitButton>
    </form>
  );
}
