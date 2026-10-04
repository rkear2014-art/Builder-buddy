import { isTrade, type Trade } from "./constants";

export type StarterLine = {
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: null;
  costPricePence: null;
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
};

export type StarterMaterial = {
  id: string;
  trade: Trade;
  name: string;
  unit: string;
  unitPricePence: null;
  costPricePence: null;
};

export type StarterLibraryAction = "add" | "rename" | "skip";

export type StarterLibraryPlan = {
  starter: StarterTemplate;
  action: StarterLibraryAction;
  existingName?: string;
};

function line(name: string, unit: string, quantity = "1"): StarterLine {
  return { name, quantity, unit, unitPricePence: null, costPricePence: null };
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
      line("Thistle MultiFinish plaster", "bag"),
      line("Thistle Hardwall plaster", "bag"),
      line("Thistle Bonding Coat", "bag"),
      line("PVA bonding agent", "litre"),
      line("Blue Grit", "litre"),
      line("Galvanised angle bead", "length"),
      line("Stop bead", "length"),
      line("Scrim tape", "roll"),
    ],
  },
  {
    id: "plaster-skim",
    trade: "Plasterer",
    name: "Skimming for a smooth finish",
    description: "Skim the walls and ceilings to a smooth finish, ready for decoration.",
    previousNames: ["Skim a room"],
    items: [
      line("Thistle MultiFinish plaster", "bag"),
      line("PVA bonding agent", "litre"),
      line("Blue Grit", "litre"),
      line("Galvanised angle bead", "length"),
      line("Scrim tape", "roll"),
    ],
  },
  {
    id: "plaster-two-coat",
    trade: "Plasterer",
    name: "Hardwall/Skim finishes",
    description: "Apply a Hardwall backing coat and a finishing skim, ready for decoration.",
    previousNames: ["Two-coat plaster"],
    items: [
      line("Thistle Hardwall plaster", "bag"),
      line("Thistle MultiFinish plaster", "bag"),
      line("PVA bonding agent", "litre"),
      line("Galvanised angle bead", "length"),
      line("Stop bead", "length"),
      line("Scrim tape", "roll"),
    ],
  },
  {
    id: "plaster-dry-lining",
    trade: "Plasterer",
    name: "Dot and dab plastering",
    description: "Dot and dab plasterboard to the walls, then tape the joints ready for decoration.",
    previousNames: ["Dry lining, dot and dab"],
    items: [
      line(board, "sheet"),
      line("Dabbing adhesive", "bag"),
      line("Plasterboard screws", "box"),
      line("Scrim tape", "roll"),
      line("Jointing compound", "bag"),
    ],
  },
  {
    id: "plaster-stud-wall",
    trade: "Plasterer",
    name: "Stud wall partitioning",
    description: "Build a stud partition, board both sides, and leave it ready for taping or skimming.",
    previousNames: ["Stud wall"],
    items: [
      line("Metal stud", "length"),
      line("Metal track", "length"),
      line("C16 timber", "length"),
      line(board, "sheet"),
      line("Plasterboard screws", "box"),
      line("Jointing tape", "roll"),
      line("Jointing compound", "bag"),
    ],
  },
  {
    id: "plaster-artex",
    trade: "Plasterer",
    name: "Covering Artex on ceilings and walls",
    description: "Prepare the Artex and skim over it to a smooth finish on the ceilings and walls.",
    previousNames: ["Cover Artex"],
    items: [
      line("Artex covering primer", "litre"),
      line("PVA bonding agent", "litre"),
      line("Thistle MultiFinish plaster", "bag"),
      line("Scrim tape", "roll"),
      line("Wide angle bead", "length"),
    ],
  },
  {
    id: "plaster-wire-mesh",
    trade: "Plasterer",
    name: "Dry-lining and wire mesh",
    description: "Fix wire mesh or dry lining and plaster over it to a sound, even finish.",
    previousNames: ["Wire mesh"],
    items: [
      line("Expanded metal lath", "sheet"),
      line("Galvanised tying wire", "roll"),
      line(board, "sheet"),
      line("Plasterboard screws", "box"),
      line("Thistle Hardwall plaster", "bag"),
      line("Thistle MultiFinish plaster", "bag"),
      line("PVA bonding agent", "litre"),
    ],
  },
  {
    id: "plaster-repairs",
    trade: "Plasterer",
    name: "Plaster repairs and remodelling",
    description: "Cut out damaged plaster, make the repair good, and skim it flush with the surrounding finish.",
    previousNames: ["Plaster repairs"],
    items: [
      line("Thistle Bonding Coat", "bag"),
      line("Thistle MultiFinish plaster", "bag"),
      line("Scrim tape", "roll"),
      line("PVA bonding agent", "litre"),
      line("Galvanised angle bead", "length"),
    ],
  },
  {
    id: "plaster-lime",
    trade: "Plasterer",
    name: "Lime plastering",
    description: "Lime plaster the walls, suited to an older building, and leave a breathable finish ready for decoration.",
    previousNames: [],
    items: [
      line("Lime putty", "kg"),
      line("NHL lime", "bag"),
      line("Lime finish plaster", "bag"),
      line("Hessian", "roll"),
      line("Stainless angle bead", "length"),
    ],
  },
  {
    id: "plaster-tape-joint",
    trade: "Plasterer",
    name: "Dry walling, tape and jointing",
    description: "Board the walls or ceilings and finish the joints with tape and jointing compound.",
    previousNames: ["Tape and jointing"],
    items: [
      line(board, "sheet"),
      line("15mm plasterboard 2400 x 1200", "sheet"),
      line("Plasterboard screws", "box"),
      line("Jointing tape", "roll"),
      line("Jointing compound", "bag"),
      line("Corner bead", "length"),
    ],
  },
  {
    id: "plaster-cornice",
    trade: "Plasterer",
    name: "Cornices and dado rails",
    description: "Fit the cornices and dado rails, stick the joints, and make good ready for decoration.",
    previousNames: [],
    items: [
      line("Cornice", "length"),
      line("Dado rail", "length"),
      line("Coving adhesive", "tube"),
      line("Filler", "tube"),
    ],
  },
  {
    id: "plaster-coving",
    trade: "Plasterer",
    name: "Coving and decorative plasterwork",
    description: "Fit the plaster coving and decorative plasterwork, and make the joints good ready for decoration.",
    previousNames: ["Coving and decorative plaster"],
    items: [
      line("Plaster coving", "length"),
      line("Coving adhesive", "tube"),
      line("Decorative plaster moulding", "length"),
    ],
  },
  {
    id: "plaster-render",
    trade: "Plasterer",
    name: "Rendering",
    description: "Render the outside walls, including beads and mesh where they are needed.",
    previousNames: [],
    items: [
      line("Building sand", "bag"),
      line("Cement", "bag"),
      line("Hydrated lime", "bag"),
      line("Alkali-resistant render mesh", "roll"),
      line("Render stop bead", "length"),
      line("Bellcast bead", "length"),
    ],
  },
  {
    id: "plaster-screed",
    trade: "Plasterer",
    name: "Screeding",
    description: "Lay a floor screed to level, ready for the finished floor.",
    previousNames: [],
    items: [
      line("Sharp sand", "bag"),
      line("Cement", "bag"),
      line("Self-levelling compound", "bag"),
      line("Screed fibre", "bag"),
      line("Perimeter foam strip", "roll"),
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
        unitPricePence: null,
        costPricePence: null,
      });
    }
  }
  return items;
})();

export function starterTemplatesFor(trade: string): StarterTemplate[] {
  if (!isTrade(trade)) return [];
  return PLASTERING_STARTER_TEMPLATES.filter((template) => template.trade === trade);
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
