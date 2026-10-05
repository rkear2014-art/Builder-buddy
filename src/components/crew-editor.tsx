"use client";

import { priceCrew, type CrewBasis, type CrewDraftRole, type CrewRoleId } from "@/lib/crew";
import { formatPence, parsePoundsToPence } from "@/lib/money";
import { formatM2 } from "@/lib/measure";

function ratePence(value: string): number | null {
  const parsed = parsePoundsToPence(value);
  return parsed.ok ? parsed.pence : null;
}

export function CrewHiddenFields({ days, roles }: { days: string; roles: CrewDraftRole[] }) {
  return (
    <>
      <input type="hidden" name="crewDays" value={days} />
      {roles.map((role) => (
        <span key={role.role}>
          <input type="hidden" name={`crewCount:${role.role}`} value={String(role.count)} />
          <input type="hidden" name={`crewBasis:${role.role}`} value={role.basis} />
          <input type="hidden" name={`crewRate:${role.role}`} value={role.rate} />
        </span>
      ))}
    </>
  );
}

export function CrewEditor({
  days,
  roles,
  totalM2,
  accent,
  accentInk,
  onDays,
  onRole,
}: {
  days: string;
  roles: CrewDraftRole[];
  totalM2: number;
  accent: string;
  accentInk: string;
  onDays: (value: string) => void;
  onRole: (role: CrewRoleId, patch: Partial<CrewDraftRole>) => void;
}) {
  const daysNumber = days.trim() ? Number(days) : null;
  const priced = priceCrew({
    days: daysNumber != null && Number.isFinite(daysNumber) ? daysNumber : null,
    totalM2,
    roles: roles.map((role) => ({
      role: role.role,
      count: role.count,
      basis: role.basis,
      ratePence: ratePence(role.rate),
    })),
  });

  return (
    <section id="crew" className="grid gap-4">
      <div>
        <h2 className="font-display text-3xl">Crew</h2>
        <p className="text-stone">
          How many people are on the job. A day rate is people × rate × days. Price work is the rate × the measured m², and the headcount does not multiply it. Rates stay blank until you set them.
        </p>
      </div>
      <label className="field">
        Days on site
        <input className="text-2xl" inputMode="decimal" placeholder="Blank" value={days} onChange={(event) => onDays(event.target.value)} />
      </label>
      {priced.roles.map((role) => {
        const draft = roles.find((item) => item.role === role.role);
        if (!draft) return null;
        return (
          <article key={role.role} className="grid gap-3 rounded-2xl border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-extrabold">{role.label}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary h-16 w-16 text-3xl"
                  aria-label={`Fewer ${role.label.toLowerCase()}s`}
                  onClick={() => onRole(role.role, { count: Math.max(0, draft.count - 1) })}
                >
                  −
                </button>
                <input
                  className="plain-input w-20 text-center text-2xl"
                  inputMode="numeric"
                  aria-label={`How many ${role.label.toLowerCase()}s`}
                  value={String(draft.count)}
                  onChange={(event) => {
                    const next = event.target.value.replace(/\D/g, "").slice(0, 2);
                    onRole(role.role, { count: Math.min(20, next ? Number(next) : 0) });
                  }}
                />
                <button
                  type="button"
                  className="btn h-16 w-16 text-3xl"
                  style={{ background: accent, color: accentInk }}
                  aria-label={`More ${role.label.toLowerCase()}s`}
                  onClick={() => onRole(role.role, { count: Math.min(20, draft.count + 1) })}
                >
                  +
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["day", "Per day"],
                  ["m2", "Per m²"],
                ] as const
              ).map(([basis, label]) => {
                const pressed = draft.basis === basis;
                return (
                  <button
                    key={basis}
                    type="button"
                    className="btn"
                    aria-pressed={pressed}
                    style={pressed ? { background: accent, color: accentInk } : undefined}
                    onClick={() => onRole(role.role, { basis: basis as CrewBasis })}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <label className="field">
              Rate (£)
              <span>{draft.basis === "day" ? "Each person, each day." : "For each m². Not multiplied by the number of people."}</span>
              <input
                className="text-2xl"
                inputMode="decimal"
                placeholder="Blank"
                value={draft.rate}
                onChange={(event) => onRole(role.role, { rate: event.target.value })}
              />
            </label>
            <p className="text-lg font-bold">
              {role.note
                ? role.note
                : role.amountPence == null
                  ? "Not on this job"
                  : role.basis === "day"
                    ? `${role.count} × ${formatPence(role.ratePence ?? 0)} × ${role.quantity} ${role.quantity === "1" ? "day" : "days"} = ${formatPence(role.amountPence)}`
                    : `${role.count} on the job · ${formatPence(role.ratePence ?? 0)} × ${role.quantity} m² = ${formatPence(role.amountPence)}`}
            </p>
          </article>
        );
      })}
      <div>
        <p className="font-extrabold">Labour on the quote</p>
        <p className="font-display text-4xl">{priced.customerLine ? formatPence(priced.customerPence) : "—"}</p>
        <p className="text-sm text-stone">
          The customer sees one Labour line{totalM2 > 0 ? `, from ${formatM2(totalM2)}` : ""}. Labourer and subcontractor pay stays off the quote.
        </p>
      </div>
      <div className="private-panel rounded-2xl p-4">
        <h3 className="font-bold">What you pay — the customer never sees this</h3>
        <p className="mt-2">Labourers {formatPence(priced.roles.find((role) => role.role === "labourer")?.amountPence ?? 0)}</p>
        <p>Subcontractors {formatPence(priced.roles.find((role) => role.role === "subcontractor")?.amountPence ?? 0)}</p>
        <p className="mt-2 font-display text-3xl">{formatPence(priced.costPence)}</p>
        <p className="mt-2 font-bold">Margin {formatPence(priced.marginPence)}</p>
        <p className="text-sm text-stone">The labour on the quote, after labourers and subcontractors.</p>
      </div>
    </section>
  );
}
