export type CoverageBasis = "area" | "perimeter" | "corners";

export type CoverageGuide = {
  basis: CoverageBasis;
  /** How much of that basis one sellable unit covers. */
  perUnit: number;
  guidance: string;
};

const BY_NAME: Record<string, CoverageGuide> = {
  "Thistle MultiFinish plaster": {
    basis: "area",
    perUnit: 10,
    guidance: "About 10 m² per 25kg bag at a 2mm skim.",
  },
  "Thistle Hardwall plaster": {
    basis: "area",
    perUnit: 3,
    guidance: "About 3 m² per 25kg bag at 11mm.",
  },
  "Thistle Bonding Coat": {
    basis: "area",
    perUnit: 3,
    guidance: "About 3 m² per 25kg bag at 11mm.",
  },
  "PVA bonding agent": {
    basis: "area",
    perUnit: 50,
    guidance: "About 0.1 litres per m², so one 5L tub covers about 50 m².",
  },
  "Blue Grit": {
    basis: "area",
    perUnit: 40,
    guidance: "About 40 m² per 10L tub.",
  },
  "Galvanised angle bead": {
    basis: "corners",
    perUnit: 1,
    guidance: "One length per external corner.",
  },
  "Stop bead": {
    basis: "perimeter",
    perUnit: 2.4,
    guidance: "One 2.4m length per 2.4m of edge.",
  },
  "Scrim tape": {
    basis: "area",
    perUnit: 70,
    guidance: "About 70 m² of boarding per 90m roll.",
  },
  "12.5mm plasterboard 2400 x 1200": {
    basis: "area",
    perUnit: 2.88,
    guidance: "One 2400 x 1200 sheet is 2.88 m².",
  },
  "15mm plasterboard 2400 x 1200": {
    basis: "area",
    perUnit: 2.88,
    guidance: "One 2400 x 1200 sheet is 2.88 m².",
  },
  "Dabbing adhesive": {
    basis: "area",
    perUnit: 5,
    guidance: "About 5 m² per bag for dot and dab.",
  },
  "Plasterboard screws": {
    basis: "area",
    perUnit: 100,
    guidance: "About 100 m² per box.",
  },
  "Jointing compound": {
    basis: "area",
    perUnit: 25,
    guidance: "About 25 m² per bag for taped joints.",
  },
  "Jointing tape": {
    basis: "area",
    perUnit: 80,
    guidance: "About 80 m² per roll.",
  },
  "Metal stud": {
    basis: "perimeter",
    perUnit: 0.6,
    guidance: "One length every 0.6m of wall. Check the centres.",
  },
  "Metal track": {
    basis: "perimeter",
    perUnit: 3,
    guidance: "One length per 3m of wall run.",
  },
  "C16 timber": {
    basis: "perimeter",
    perUnit: 0.6,
    guidance: "One length every 0.6m. Check the centres.",
  },
  "Wide angle bead": {
    basis: "corners",
    perUnit: 1,
    guidance: "One length per external corner.",
  },
  "Corner bead": {
    basis: "corners",
    perUnit: 1,
    guidance: "One length per external corner.",
  },
  "Stainless angle bead": {
    basis: "corners",
    perUnit: 1,
    guidance: "One length per external corner.",
  },
  "Expanded metal lath": {
    basis: "area",
    perUnit: 1.75,
    guidance: "About 1.75 m² per sheet.",
  },
  "Galvanised tying wire": {
    basis: "area",
    perUnit: 20,
    guidance: "About 20 m² per roll.",
  },
  "Artex covering primer": {
    basis: "area",
    perUnit: 60,
    guidance: "About 60 m² per 10L tub.",
  },
  Cornice: {
    basis: "perimeter",
    perUnit: 3,
    guidance: "One length covers about 3m.",
  },
  "Dado rail": {
    basis: "perimeter",
    perUnit: 1,
    guidance: "Sold by the metre, so one metre covers one metre of run.",
  },
  "Coving adhesive": {
    basis: "perimeter",
    perUnit: 8,
    guidance: "About 8m of coving per 5kg bag.",
  },
  Filler: {
    basis: "area",
    perUnit: 10,
    guidance: "About 10 m² per cartridge.",
  },
  "Plaster coving": {
    basis: "perimeter",
    perUnit: 3,
    guidance: "One length covers about 3m.",
  },
  "Decorative plaster moulding": {
    basis: "perimeter",
    perUnit: 2.4,
    guidance: "One length covers about 2.4m.",
  },
  "Building sand": {
    basis: "area",
    perUnit: 1,
    guidance: "About 1 m² per 25kg bag for a 15mm render coat.",
  },
  Cement: {
    basis: "area",
    perUnit: 5,
    guidance: "About 5 m² per 25kg bag in a 15mm render coat.",
  },
  "Hydrated lime": {
    basis: "area",
    perUnit: 10,
    guidance: "About 10 m² per bag in a render mix.",
  },
  "Alkali-resistant render mesh": {
    basis: "area",
    perUnit: 50,
    guidance: "About 50 m² per roll.",
  },
  "Render stop bead": {
    basis: "perimeter",
    perUnit: 2.5,
    guidance: "One 2.5m length per 2.5m of edge.",
  },
  "Bellcast bead": {
    basis: "perimeter",
    perUnit: 2.5,
    guidance: "One 2.5m length along the bottom of the wall.",
  },
  "Sharp sand": {
    basis: "area",
    perUnit: 0.2,
    guidance: "About 0.2 m² per 25kg bag for a 65mm screed.",
  },
  "Self-levelling compound": {
    basis: "area",
    perUnit: 5,
    guidance: "About 5 m² per bag at 3mm.",
  },
  "Screed fibre": {
    basis: "area",
    perUnit: 10,
    guidance: "About 10 m² per bag. Check the bag.",
  },
  "Perimeter foam strip": {
    basis: "perimeter",
    perUnit: 50,
    guidance: "About 50m per roll.",
  },
  "Lime putty": {
    basis: "area",
    perUnit: 1.25,
    guidance: "About 1.25 m² per 20kg bucket at 10mm.",
  },
  "NHL lime": {
    basis: "area",
    perUnit: 2,
    guidance: "About 2 m² per bag.",
  },
  "Lime finish plaster": {
    basis: "area",
    perUnit: 8,
    guidance: "About 8 m² per bag.",
  },
  Hessian: {
    basis: "area",
    perUnit: 10,
    guidance: "About 10 m² per roll.",
  },
};

const BY_JOB: Record<string, CoverageGuide> = {
  "plaster-screed\0Cement": {
    basis: "area",
    perUnit: 1,
    guidance: "About 1 m² per 25kg bag in a 65mm screed. Check the depth.",
  },
};

export function starterCoverage(templateId: string, materialName: string): CoverageGuide | null {
  return BY_JOB[`${templateId}\0${materialName}`] ?? BY_NAME[materialName] ?? null;
}

export function coverageBasisLabel(basis: CoverageBasis): string {
  if (basis === "perimeter") return "metres";
  if (basis === "corners") return "corners";
  return "m²";
}

export function isCoverageBasis(value: string): value is CoverageBasis {
  return value === "area" || value === "perimeter" || value === "corners";
}
