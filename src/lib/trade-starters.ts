import { isTrade, type Trade } from "./constants";

export type StarterLine = {
  name: string;
  quantity: string;
  unit: string;
  /** Customer price in pence, including VAT. Null when no public price was used. */
  unitPricePence: number | null;
  costPricePence: null;
  /** Units this line used before the pack size was made explicit. */
  previousUnits: readonly string[];
};

export type StarterTemplate = {
  id: string;
  trade: Trade;
  name: string;
  /** What the customer reads on the sign-off page. */
  description: string;
  /** Earlier names for this same list, so saving again does not create a second copy. */
  previousNames: string[];
  items: StarterLine[];
  /** Hidden from Choose a job and from the starter loader. Saved jobs keep their own lines. */
  retired?: boolean;
};

export type StarterMaterial = {
  id: string;
  trade: Trade;
  name: string;
  unit: string;
  unitPricePence: number | null;
  costPricePence: null;
  previousUnits: readonly string[];
};

export type StarterLibraryAction = "add" | "rename" | "skip";

export type StarterLibraryPlan = {
  starter: StarterTemplate;
  action: StarterLibraryAction;
  existingName?: string;
};

function line(
  name: string,
  unit: string,
  unitPricePence: number | null,
  options?: { quantity?: string; previousUnits?: readonly string[] },
): StarterLine {
  return {
    name,
    quantity: options?.quantity ?? "1",
    unit,
    unitPricePence,
    costPricePence: null,
    previousUnits: options?.previousUnits ?? [],
  };
}

const board = "12.5mm plasterboard 2400 x 1200";

export const PLASTERING_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "plaster-general",
    trade: "Plasterer",
    name: "General plastering work",
    description: "Plaster the walls and ceilings, including preparation, and leave a finish ready for decoration.",
    previousNames: [],
    items: [
      line("Thistle MultiFinish plaster", "bag", 1310),
      line("Thistle Hardwall plaster", "bag", 1841),
      line("Thistle Bonding Coat", "bag", 1841),
      line("PVA bonding agent", "5L tub", 1796, { previousUnits: ["litre"] }),
      line("Blue Grit", "10L tub", 3960, { previousUnits: ["litre"] }),
      line("Galvanised angle bead", "length", 384),
      line("Stop bead", "length", 456),
      line("Scrim tape", "roll", 490),
    ],
  },
  {
    id: "plaster-skim",
    trade: "Plasterer",
    name: "Skimming for a smooth finish",
    description: "Skim the walls and ceilings to a smooth finish, ready for decoration.",
    previousNames: ["Skim a room"],
    retired: true,
    items: [
      line("Thistle MultiFinish plaster", "bag", 1310),
      line("PVA bonding agent", "5L tub", 1796, { previousUnits: ["litre"] }),
      line("Blue Grit", "10L tub", 3960, { previousUnits: ["litre"] }),
      line("Galvanised angle bead", "length", 384),
      line("Scrim tape", "roll", 490),
    ],
  },
  {
    id: "plaster-two-coat",
    trade: "Plasterer",
    name: "Hardwall/Skim finishes",
    description: "Apply a Hardwall backing coat and a finishing skim, ready for decoration.",
    previousNames: ["Two-coat plaster"],
    retired: true,
    items: [
      line("Thistle Hardwall plaster", "bag", 1841),
      line("Thistle MultiFinish plaster", "bag", 1310),
      line("PVA bonding agent", "5L tub", 1796, { previousUnits: ["litre"] }),
      line("Galvanised angle bead", "length", 384),
      line("Stop bead", "length", 456),
      line("Scrim tape", "roll", 490),
    ],
  },
  {
    id: "plaster-dry-lining",
    trade: "Plasterer",
    name: "Dot and dab plastering",
    description: "Dot and dab plasterboard to the walls, then tape the joints ready for decoration.",
    previousNames: ["Dry lining, dot and dab"],
    items: [
      line(board, "sheet", 1450),
      line("Dabbing adhesive", "bag", 1538),
      line("Plasterboard screws", "box", 1244),
      line("Scrim tape", "roll", 490),
      line("Jointing compound", "bag", 3788),
    ],
  },
  {
    id: "plaster-stud-wall",
    trade: "Plasterer",
    name: "Stud wall partitioning",
    description: "Build a stud partition, board both sides, and leave it ready for taping or skimming.",
    previousNames: ["Stud wall"],
    items: [
      line("Metal stud", "length", 1390),
      line("Metal track", "length", 880),
      line("C16 timber", "length", 928),
      line(board, "sheet", 1450),
      line("Plasterboard screws", "box", 1244),
      line("Jointing tape", "roll", 2146),
      line("Jointing compound", "bag", 3788),
    ],
  },
  {
    id: "plaster-artex",
    trade: "Plasterer",
    name: "Covering Artex on ceilings and walls",
    description: "Prepare the Artex and skim over it to a smooth finish on the ceilings and walls.",
    previousNames: ["Cover Artex"],
    items: [
      line("Artex covering primer", "10L tub", 8562, { previousUnits: ["litre"] }),
      line("PVA bonding agent", "5L tub", 1796, { previousUnits: ["litre"] }),
      line("Thistle MultiFinish plaster", "bag", 1310),
      line("Scrim tape", "roll", 490),
      line("Wide angle bead", "length", 414),
    ],
  },
  {
    id: "plaster-wire-mesh",
    trade: "Plasterer",
    name: "Dry-lining and wire mesh",
    description: "Fix wire mesh or dry lining and plaster over it to a sound, even finish.",
    previousNames: ["Wire mesh"],
    items: [
      line("Expanded metal lath", "sheet", 1570),
      line("Galvanised tying wire", "roll", 575),
      line(board, "sheet", 1450),
      line("Plasterboard screws", "box", 1244),
      line("Thistle Hardwall plaster", "bag", 1841),
      line("Thistle MultiFinish plaster", "bag", 1310),
      line("PVA bonding agent", "5L tub", 1796, { previousUnits: ["litre"] }),
    ],
  },
  {
    id: "plaster-repairs",
    trade: "Plasterer",
    name: "Plaster repairs and remodelling",
    description: "Cut out damaged plaster, make the repair good, and skim it flush with the surrounding finish.",
    previousNames: ["Plaster repairs"],
    items: [
      line("Thistle Bonding Coat", "bag", 1841),
      line("Thistle MultiFinish plaster", "bag", 1310),
      line("Scrim tape", "roll", 490),
      line("PVA bonding agent", "5L tub", 1796, { previousUnits: ["litre"] }),
      line("Galvanised angle bead", "length", 384),
    ],
  },
  {
    id: "plaster-lime",
    trade: "Plasterer",
    name: "Lime plastering",
    description: "Lime plaster the walls, suited to an older building, and leave a breathable finish ready for decoration.",
    previousNames: [],
    items: [
      line("Lime putty", "20kg bucket", 2508, { previousUnits: ["kg"] }),
      line("NHL lime", "bag", 5000),
      line("Lime finish plaster", "bag", 1176),
      line("Hessian", "roll", 6967),
      line("Stainless angle bead", "length", 1166),
    ],
  },
  {
    id: "plaster-tape-joint",
    trade: "Plasterer",
    name: "Dry walling, tape and jointing",
    description: "Board the walls or ceilings and finish the joints with tape and jointing compound.",
    previousNames: ["Tape and jointing"],
    items: [
      line(board, "sheet", 1450),
      line("15mm plasterboard 2400 x 1200", "sheet", 2198),
      line("Plasterboard screws", "box", 1244),
      line("Jointing tape", "roll", 2146),
      line("Jointing compound", "bag", 3788),
      line("Corner bead", "length", 270),
    ],
  },
  {
    id: "plaster-cornice",
    trade: "Plasterer",
    name: "Cornices and dado rails",
    description: "Fit the cornices and dado rails, stick the joints, and make good ready for decoration.",
    previousNames: [],
    items: [
      line("Cornice", "length", 1823),
      line("Dado rail", "m", 432, { previousUnits: ["length"] }),
      line("Coving adhesive", "5kg bag", 1979, { previousUnits: ["tube"] }),
      line("Filler", "310ml cartridge", 506, { previousUnits: ["tube"] }),
    ],
  },
  {
    id: "plaster-coving",
    trade: "Plasterer",
    name: "Coving and decorative plasterwork",
    description: "Fit the plaster coving and decorative plasterwork, and make the joints good ready for decoration.",
    previousNames: ["Coving and decorative plaster"],
    items: [
      line("Plaster coving", "length", 1283),
      line("Coving adhesive", "5kg bag", 1979, { previousUnits: ["tube"] }),
      line("Decorative plaster moulding", "length", 3594),
    ],
  },
  {
    id: "plaster-render",
    trade: "Plasterer",
    name: "Rendering",
    description: "Render the outside walls, including beads and mesh where they are needed.",
    previousNames: [],
    items: [
      line("Building sand", "bag", 396),
      line("Cement", "bag", 814),
      line("Hydrated lime", "bag", 2749),
      line("Alkali-resistant render mesh", "roll", 4000),
      line("Render stop bead", "length", 1385),
      line("Bellcast bead", "length", 890),
    ],
  },
  {
    id: "plaster-screed",
    trade: "Plasterer",
    name: "Screeding",
    description: "Lay a floor screed to level, ready for the finished floor.",
    previousNames: [],
    items: [
      line("Sharp sand", "bag", 396),
      line("Cement", "bag", 814),
      line("Self-levelling compound", "bag", 2437),
      line("Screed fibre", "bag", 1772),
      line("Perimeter foam strip", "roll", 2998),
    ],
  },
];

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const PLASTERING_STARTER_MATERIALS: StarterMaterial[] = (() => {
  const seen = new Set<string>();
  const items: StarterMaterial[] = [];
  for (const template of PLASTERING_STARTER_TEMPLATES) {
    for (const item of template.items) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: `plaster-item-${slug(item.name)}`,
        trade: "Plasterer",
        name: item.name,
        unit: item.unit,
        unitPricePence: item.unitPricePence,
        costPricePence: null,
        previousUnits: item.previousUnits,
      });
    }
  }
  return items;
})();

export function starterTemplatesFor(trade: string): StarterTemplate[] {
  if (!isTrade(trade)) return [];
  return PLASTERING_STARTER_TEMPLATES.filter((template) => template.trade === trade && !template.retired);
}

export function isRetiredTemplateName(name: string): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return PLASTERING_STARTER_TEMPLATES.some(
    (template) =>
      template.retired === true &&
      (template.name.toLowerCase() === key || template.previousNames.some((previous) => previous.toLowerCase() === key)),
  );
}

export function starterMaterialsFor(trade: string): StarterMaterial[] {
  if (!isTrade(trade)) return [];
  return PLASTERING_STARTER_MATERIALS.filter((item) => item.trade === trade);
}

export function findStarterTemplate(id: string): StarterTemplate | null {
  return PLASTERING_STARTER_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function findStarterMaterial(id: string): StarterMaterial | null {
  return PLASTERING_STARTER_MATERIALS.find((item) => item.id === id) ?? null;
}

function normaliseName(name: string): string {
  return name.trim().toLowerCase();
}

export type StoredStarterPrice = {
  name: string;
  unit: string;
  unitPricePence: number | null;
};

/**
 * A blank price can take the starter price, including when the unit was the old pack size.
 * A price the business has already typed is left alone, and a unit they changed is left alone.
 */
export function blankPriceUpdate(
  stored: StoredStarterPrice,
  starter: Pick<StarterLine, "name" | "unit" | "unitPricePence" | "previousUnits">,
): { unit: string; unitPricePence: number } | null {
  if (stored.unitPricePence != null) return null;
  if (starter.unitPricePence == null) return null;
  if (normaliseName(stored.name) !== normaliseName(starter.name)) return null;
  const units = new Set([starter.unit, ...starter.previousUnits]);
  if (!units.has(stored.unit)) return null;
  return { unit: starter.unit, unitPricePence: starter.unitPricePence };
}

/** Decide what a library load should do for each built-in list, given names already saved. */
export function planStarterLibraryUpdate(existingNames: string[], trade: string): StarterLibraryPlan[] {
  if (!isTrade(trade)) return [];
  const byLower = new Map<string, string>();
  for (const name of existingNames) {
    const key = normaliseName(name);
    if (!key || byLower.has(key)) continue;
    byLower.set(key, name);
  }
  return starterTemplatesFor(trade).map((starter) => {
    const current = byLower.get(normaliseName(starter.name));
    if (current) return { starter, action: "skip" as const, existingName: current };
    const previous = starter.previousNames.find((name) => byLower.has(normaliseName(name)));
    if (previous) {
      return { starter, action: "rename" as const, existingName: byLower.get(normaliseName(previous)) };
    }
    return { starter, action: "add" as const };
  });
}
