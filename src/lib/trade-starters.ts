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

function line(name: string, unit: string, quantity = "1"): StarterLine {
  return { name, quantity, unit, unitPricePence: null, costPricePence: null };
}

export const PLASTERING_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "plaster-skim",
    trade: "Plasterer",
    name: "Skim a room",
    items: [
      line("Thistle MultiFinish plaster", "bag"),
      line("PVA bonding agent", "litre"),
      line("Galvanised angle bead", "length"),
      line("Scrim tape", "roll"),
    ],
  },
  {
    id: "plaster-two-coat",
    trade: "Plasterer",
    name: "Two-coat plaster",
    items: [
      line("Thistle Hardwall plaster", "bag"),
      line("Thistle MultiFinish plaster", "bag"),
      line("PVA bonding agent", "litre"),
      line("Galvanised angle bead", "length"),
      line("Scrim tape", "roll"),
    ],
  },
  {
    id: "plaster-artex",
    trade: "Plasterer",
    name: "Cover Artex",
    items: [
      line("PVA bonding agent", "litre"),
      line("Thistle MultiFinish plaster", "bag"),
      line("Scrim tape", "roll"),
      line("Wide angle bead", "length"),
    ],
  },
  {
    id: "plaster-dry-lining",
    trade: "Plasterer",
    name: "Dry lining, dot and dab",
    items: [
      line("12.5mm plasterboard", "sheet"),
      line("Dot and dab adhesive", "bag"),
      line("Plasterboard screws", "box"),
      line("Jointing tape", "roll"),
      line("Jointing compound", "bag"),
    ],
  },
  {
    id: "plaster-board-on-stud",
    trade: "Plasterer",
    name: "Dry lining, screwed to stud",
    items: [
      line("12.5mm plasterboard", "sheet"),
      line("Plasterboard screws", "box"),
      line("Jointing tape", "roll"),
      line("Jointing compound", "bag"),
    ],
  },
  {
    id: "plaster-stud-wall",
    trade: "Plasterer",
    name: "Stud wall",
    items: [
      line("C16 timber stud", "length"),
      line("12.5mm plasterboard", "sheet"),
      line("Plasterboard screws", "box"),
      line("Jointing tape", "roll"),
      line("Jointing compound", "bag"),
    ],
  },
  {
    id: "plaster-tape-joint",
    trade: "Plasterer",
    name: "Tape and jointing",
    items: [
      line("Jointing tape", "roll"),
      line("Jointing compound", "bag"),
      line("Corner bead", "length"),
    ],
  },
  {
    id: "plaster-wire-mesh",
    trade: "Plasterer",
    name: "Wire mesh",
    items: [
      line("Expanded metal lath", "sheet"),
      line("Galvanised tying wire", "roll"),
      line("Thistle Hardwall plaster", "bag"),
    ],
  },
  {
    id: "plaster-lime",
    trade: "Plasterer",
    name: "Lime plastering",
    items: [
      line("Natural hydraulic lime plaster", "bag"),
      line("Lime finish plaster", "bag"),
      line("Galvanised angle bead", "length"),
    ],
  },
  {
    id: "plaster-render",
    trade: "Plasterer",
    name: "Rendering",
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
    items: [
      line("Sharp sand", "bag"),
      line("Cement", "bag"),
      line("Self-levelling compound", "bag"),
      line("Screed fibre", "bag"),
      line("Perimeter foam strip", "roll"),
    ],
  },
  {
    id: "plaster-coving",
    trade: "Plasterer",
    name: "Coving and decorative plaster",
    items: [
      line("Plaster coving", "length"),
      line("Coving adhesive", "tube"),
      line("Cornice", "length"),
      line("Dado rail", "length"),
    ],
  },
  {
    id: "plaster-repairs",
    trade: "Plasterer",
    name: "Plaster repairs",
    items: [
      line("Thistle Bonding Coat", "bag"),
      line("Thistle MultiFinish plaster", "bag"),
      line("Scrim tape", "roll"),
      line("PVA bonding agent", "litre"),
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
