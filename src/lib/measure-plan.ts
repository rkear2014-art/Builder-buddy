import { starterCoverage } from "./coverage";
import { findStarterTemplate, PLASTERING_STARTER_MATERIALS } from "./trade-starters";
import type { MeasureMaterial } from "./measure";

export type ChoiceOption = {
  id: string;
  label: string;
  materialName: string | null;
};

export type ChoiceGroup = {
  id: string;
  label: string;
  options: ChoiceOption[];
  defaultOptionId: string;
};

export type MeasurePlan = {
  groups: ChoiceGroup[];
  /** Shown on the list, but left unticked until he turns them on. */
  excludedByDefault: string[];
  extras: Array<{ name: string; unit: string }>;
};

const BACKING: ChoiceGroup = {
  id: "backing",
  label: "Backing coat",
  options: [
    { id: "hardwall", label: "Hardwall", materialName: "Thistle Hardwall plaster" },
    { id: "bonding", label: "Bonding Coat", materialName: "Thistle Bonding Coat" },
    { id: "none", label: "Skim only", materialName: null },
  ],
  defaultOptionId: "hardwall",
};

const PRIMER: ChoiceGroup = {
  id: "primer",
  label: "Primer",
  options: [
    { id: "pva", label: "PVA", materialName: "PVA bonding agent" },
    { id: "grit", label: "Blue Grit", materialName: "Blue Grit" },
    { id: "none", label: "None", materialName: null },
  ],
  defaultOptionId: "pva",
};

const ARTEX_PRIMER: ChoiceGroup = {
  id: "primer",
  label: "Primer",
  options: [
    { id: "bond-it", label: "Bond-It", materialName: "Artex covering primer" },
    { id: "pva", label: "PVA", materialName: "PVA bonding agent" },
    { id: "none", label: "None", materialName: null },
  ],
  defaultOptionId: "bond-it",
};

export const LABOUR_LINE_NAMES = ["Labour", "Labour, day rate"] as const;

export function measurePlanFor(typeKey: string): MeasurePlan {
  if (typeKey === "plaster-general") {
    return { groups: [BACKING, PRIMER], excludedByDefault: [], extras: [] };
  }
  if (typeKey === "plaster-artex") {
    return {
      groups: [ARTEX_PRIMER],
      excludedByDefault: ["Scrim tape", "Wide angle bead"],
      extras: [],
    };
  }
  if (typeKey === "plaster-dry-lining") {
    return {
      groups: [],
      excludedByDefault: ["Thistle MultiFinish plaster"],
      extras: [{ name: "Thistle MultiFinish plaster", unit: "bag" }],
    };
  }
  return { groups: [], excludedByDefault: [], extras: [] };
}

export function defaultChoices(plan: MeasurePlan): Record<string, string> {
  return Object.fromEntries(plan.groups.map((group) => [group.id, group.defaultOptionId]));
}

export function normaliseChoices(plan: MeasurePlan, raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const group of plan.groups) {
    const value = raw?.[group.id];
    result[group.id] = typeof value === "string" && group.options.some((option) => option.id === value) ? value : group.defaultOptionId;
  }
  return result;
}

export function materialsForChoices<T extends { name: string }>(materials: T[], plan: MeasurePlan, choices: Record<string, string>): T[] {
  const dropped = new Set<string>();
  for (const group of plan.groups) {
    const optionId = choices[group.id] ?? group.defaultOptionId;
    const picked = group.options.find((option) => option.id === optionId) ?? group.options.find((option) => option.id === group.defaultOptionId);
    for (const option of group.options) {
      if (option.materialName && option.materialName !== picked?.materialName) dropped.add(option.materialName);
    }
  }
  return materials.filter((material) => !dropped.has(material.name));
}

export function defaultIncludedNames(materials: { name: string }[], plan: MeasurePlan): string[] {
  const excluded = new Set(plan.excludedByDefault);
  return [...materials.map((material) => material.name).filter((name) => !excluded.has(name)), ...LABOUR_LINE_NAMES];
}

export function extraMeasureLines(
  plan: MeasurePlan,
  existingNames: Iterable<string>,
): Array<{ name: string; unit: string; unitPricePence: number | null }> {
  const seen = new Set(Array.from(existingNames, (name) => name.toLowerCase()));
  const extras: Array<{ name: string; unit: string; unitPricePence: number | null }> = [];
  const add = (name: string, unit: string) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const starter = PLASTERING_STARTER_MATERIALS.find((item) => item.name.toLowerCase() === key);
    extras.push({ name, unit: starter?.unit ?? unit, unitPricePence: starter?.unitPricePence ?? null });
  };
  for (const extra of plan.extras) add(extra.name, extra.unit);
  for (const group of plan.groups) {
    for (const option of group.options) {
      if (option.materialName) add(option.materialName, "each");
    }
  }
  return extras;
}

export function starterMeasureMaterials(templateId: string): MeasureMaterial[] {
  const template = findStarterTemplate(templateId);
  if (!template) return [];
  const plan = measurePlanFor(templateId);
  const lines = [
    ...template.items.map((item) => ({ name: item.name, unit: item.unit, unitPricePence: item.unitPricePence })),
    ...extraMeasureLines(plan, template.items.map((item) => item.name)),
  ];
  return lines.map((item) => {
    const guide = starterCoverage(templateId, item.name);
    return {
      name: item.name,
      unit: item.unit,
      unitPricePence: item.unitPricePence,
      coverage: guide ? { basis: guide.basis, perUnit: guide.perUnit } : null,
    };
  });
}

export function parseMeasureSelection(raw: string): { choices: Record<string, string>; included: string[] } | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { choices?: unknown; included?: unknown };
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.included)) return null;
    const included = parsed.included.filter((item): item is string => typeof item === "string").slice(0, 40).map((item) => item.slice(0, 80));
    const choices: Record<string, string> = {};
    if (parsed.choices && typeof parsed.choices === "object") {
      for (const [key, value] of Object.entries(parsed.choices)) {
        if (typeof value === "string") choices[key.slice(0, 40)] = value.slice(0, 40);
      }
    }
    return { choices, included };
  } catch {
    return null;
  }
}

export function serialiseMeasureSelection(choices: Record<string, string>, included: string[]): string {
  return JSON.stringify({ choices, included });
}
