import { customerLineTotalPence } from "./materials";
import { parsePoundsToPence } from "./money";

export const CREW_ROLES = [
  { id: "plasterer", label: "Plasterer", defaultBasis: "day", onQuote: true },
  { id: "labourer", label: "Labourer", defaultBasis: "day", onQuote: false },
  { id: "subcontractor", label: "Subcontractor", defaultBasis: "m2", onQuote: false },
] as const;

export type CrewRoleId = (typeof CREW_ROLES)[number]["id"];
export type CrewBasis = "day" | "m2";

export type CrewRoleInput = {
  role: CrewRoleId;
  count: number;
  basis: CrewBasis;
  ratePence: number | null;
};

export type CrewInput = {
  days: number | null;
  roles: CrewRoleInput[];
};

export type CrewDraftRole = {
  role: CrewRoleId;
  count: number;
  basis: CrewBasis;
  rate: string;
};

export type CrewRolePrice = {
  role: CrewRoleId;
  label: string;
  count: number;
  basis: CrewBasis;
  ratePence: number | null;
  onQuote: boolean;
  amountPence: number | null;
  quantity: string | null;
  unit: string;
  unitPricePence: number | null;
  note: string | null;
};

export type CrewCustomerLine = {
  name: "Labour";
  unit: string;
  quantity: string;
  unitPricePence: number;
  lineTotalPence: number;
  note: null;
};

export type CrewPrice = {
  roles: CrewRolePrice[];
  customerPence: number;
  costPence: number;
  marginPence: number;
  customerLine: CrewCustomerLine | null;
};

const ROLE_IDS = new Set<string>(CREW_ROLES.map((role) => role.id));

export function isCrewRole(value: string): value is CrewRoleId {
  return ROLE_IDS.has(value);
}

export function isCrewBasis(value: string): value is CrewBasis {
  return value === "day" || value === "m2";
}

/** Labourer and subcontractor pay stays off the customer quote and invoice. */
export function isInternalCrewName(name: string): boolean {
  const value = name.trim().toLowerCase();
  return value === "labourer" || value === "subcontractor" || value.startsWith("labourer ") || value.startsWith("subcontractor ");
}

function quantityLabel(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const hundredths = Math.round(value * 100);
  if (hundredths <= 0) return null;
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

function roleMeta(role: CrewRoleId) {
  return CREW_ROLES.find((item) => item.id === role) ?? CREW_ROLES[0];
}

function priceRole(role: CrewRoleInput, days: number | null, totalM2: number): CrewRolePrice {
  const meta = roleMeta(role.role);
  const count = Math.min(20, Math.max(0, Math.round(role.count)));
  const basis = role.basis;
  const base = {
    role: role.role,
    label: meta.label,
    count,
    basis,
    ratePence: role.ratePence,
    onQuote: meta.onQuote,
    amountPence: null as number | null,
    quantity: null as string | null,
    unit: basis === "day" ? "day" : "m²",
    unitPricePence: null as number | null,
    note: null as string | null,
  };
  if (count <= 0) return base;
  if (role.ratePence == null) {
    return { ...base, note: "No rate yet. Leave it blank until you set one." };
  }
  if (basis === "day") {
    if (days == null || days <= 0) return { ...base, note: "Enter the days on site." };
    const quantity = quantityLabel(days);
    const unitPricePence = count * role.ratePence;
    const amountPence = quantity ? customerLineTotalPence({ quantity, unitPricePence }) : null;
    return { ...base, quantity, unitPricePence, amountPence };
  }
  if (totalM2 <= 0) return { ...base, note: "Uses the measured m². Measure a room first." };
  const quantity = quantityLabel(totalM2);
  const amountPence = quantity ? customerLineTotalPence({ quantity, unitPricePence: role.ratePence }) : null;
  return { ...base, quantity, unitPricePence: role.ratePence, amountPence };
}

/** Day roles are count × rate × days. A per m² rate is for the measured area, not multiplied by the headcount. */
export function priceCrew(input: CrewInput & { totalM2: number }): CrewPrice {
  const byRole = new Map(input.roles.map((role) => [role.role, role]));
  const roles = CREW_ROLES.map((meta) =>
    priceRole(
      byRole.get(meta.id) ?? { role: meta.id, count: 0, basis: meta.defaultBasis, ratePence: null },
      input.days,
      input.totalM2,
    ),
  );
  const customer = roles.find((role) => role.onQuote);
  const customerPence = customer?.amountPence ?? 0;
  const costPence = roles.filter((role) => !role.onQuote).reduce((sum, role) => sum + (role.amountPence ?? 0), 0);
  const customerLine =
    customer?.amountPence != null && customer.quantity && customer.unitPricePence != null
      ? {
          name: "Labour" as const,
          unit: customer.unit,
          quantity: customer.quantity,
          unitPricePence: customer.unitPricePence,
          lineTotalPence: customer.amountPence,
          note: null,
        }
      : null;
  return {
    roles,
    customerPence,
    costPence,
    marginPence: customerPence - costPence,
    customerLine,
  };
}

export function poundsField(pence: number | null | undefined): string {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

export function startingCrew(input: {
  defaults: Array<{ role: string; basis: string; ratePence: number | null }>;
  saved: Array<{ role: string; count: number; basis: string; ratePence: number | null }> | null;
  legacyDayRatePence?: number | null;
  legacyDays?: string | null;
  jobTypeLabourPerM2Pence?: number | null;
}): { days: string; roles: CrewDraftRole[] } {
  const defaults = new Map(input.defaults.filter((row) => isCrewRole(row.role) && isCrewBasis(row.basis)).map((row) => [row.role, row]));
  const savedRows = (input.saved ?? []).filter((row) => isCrewRole(row.role));
  const saved = new Map(savedRows.map((row) => [row.role, row]));
  const legacy = savedRows.length === 0 && input.legacyDayRatePence != null ? input.legacyDayRatePence : null;
  const roles = CREW_ROLES.map((meta) => {
    const stored = saved.get(meta.id);
    if (stored && isCrewBasis(stored.basis)) {
      return {
        role: meta.id,
        count: Math.min(20, Math.max(0, stored.count)),
        basis: stored.basis,
        rate: poundsField(stored.ratePence),
      };
    }
    const usual = defaults.get(meta.id);
    let basis: CrewBasis = usual && isCrewBasis(usual.basis) ? usual.basis : meta.defaultBasis;
    let rate = usual?.ratePence ?? null;
    let count = 0;
    if (meta.id === "plasterer" && legacy != null) {
      basis = "day";
      rate = legacy;
      count = 1;
    } else if (meta.id === "plasterer" && rate == null && input.jobTypeLabourPerM2Pence != null && (basis === "m2" || !usual)) {
      basis = "m2";
      rate = input.jobTypeLabourPerM2Pence;
    }
    return { role: meta.id, count, basis, rate: poundsField(rate) };
  });
  const daysNumber = Number((input.legacyDays ?? "").trim());
  const days = Number.isFinite(daysNumber) && daysNumber > 0 ? quantityLabel(daysNumber) ?? "" : "";
  return { days, roles };
}

type FieldSource = { get(name: string): unknown };

function field(source: FieldSource, name: string): string {
  const value = source.get(name);
  return typeof value === "string" ? value : "";
}

export function parseCrewFields(source: FieldSource): { ok: true; crew: CrewInput } | { ok: false; error: string } {
  const daysRaw = field(source, "crewDays").trim();
  let days: number | null = null;
  if (daysRaw) {
    if (!/^\d+(\.\d{1,2})?$/.test(daysRaw)) return { ok: false, error: "Enter the days as a number, such as 1 or 1.5." };
    days = Number(daysRaw);
    if (days <= 0 || days > 60) return { ok: false, error: "Enter the days from 0.5 to 60, or leave them blank." };
  }
  const roles: CrewRoleInput[] = [];
  for (const meta of CREW_ROLES) {
    const countRaw = field(source, `crewCount:${meta.id}`).trim();
    if (countRaw && !/^\d{1,2}$/.test(countRaw)) return { ok: false, error: `Enter how many ${meta.label.toLowerCase()}s as a whole number.` };
    const count = countRaw ? Number(countRaw) : 0;
    if (count > 20) return { ok: false, error: "Enter up to 20 people for one role." };
    const basisRaw = field(source, `crewBasis:${meta.id}`);
    if (basisRaw && !isCrewBasis(basisRaw)) return { ok: false, error: "Choose per day or per m²." };
    const basis: CrewBasis = isCrewBasis(basisRaw) ? basisRaw : meta.defaultBasis;
    const rate = parsePoundsToPence(field(source, `crewRate:${meta.id}`));
    if (!rate.ok) return { ok: false, error: rate.error };
    if (count > 0 && basis === "day" && days == null && rate.pence != null) {
      return { ok: false, error: "Enter the days on site." };
    }
    roles.push({ role: meta.id, count, basis, ratePence: rate.pence });
  }
  return { ok: true, crew: { days, roles } };
}

export function draftFromCrew(crew: CrewInput): { days: string; roles: CrewDraftRole[] } {
  return {
    days: crew.days == null ? "" : quantityLabel(crew.days) ?? "",
    roles: CREW_ROLES.map((meta) => {
      const role = crew.roles.find((item) => item.role === meta.id);
      return {
        role: meta.id,
        count: role?.count ?? 0,
        basis: role?.basis ?? meta.defaultBasis,
        rate: poundsField(role?.ratePence),
      };
    }),
  };
}
