import { isInternalCrewName } from "./crew";
import { customerSubtotalPence, hidesMaterialLines, scopeLine } from "./customer-price";
import { customerLineTotalPence, materialsTotals } from "./materials";
import { isExteriorMeasure } from "./room-names";

export type AreasLabel = "Rooms" | "Walls";

export type SectionMaterial = {
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
};

export type PricedSection = {
  title: string;
  typeKey: string;
  typeName?: string;
  fixedPricePence?: number | null;
  materials: SectionMaterial[];
};

export function areasLabelFor(typeKey: string, typeName = ""): AreasLabel {
  return isExteriorMeasure(typeKey, typeName) ? "Walls" : "Rooms";
}

export function sectionTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed || "New job";
}

export function sectionMaterialsTotal(materials: SectionMaterial[]): number {
  return materialsTotals(materials.filter((line) => !isInternalCrewName(line.name))).totalPence;
}

/** A typed price for this job replaces its materials. Otherwise the materials and labour stand. */
export function sectionSubtotalPence(section: Pick<PricedSection, "fixedPricePence" | "materials">): number {
  return customerSubtotalPence({
    materialsTotalPence: sectionMaterialsTotal(section.materials),
    fixedPricePence: section.fixedPricePence,
  });
}

/** The quote total before VAT. An overall price replaces the sum of the jobs. */
export function quoteSectionsSubtotal(input: {
  sections: PricedSection[];
  fixedPricePence?: number | null;
}): number {
  const summed = input.sections.reduce((sum, section) => sum + sectionSubtotalPence(section), 0);
  return customerSubtotalPence({ materialsTotalPence: summed, fixedPricePence: input.fixedPricePence });
}

export type PublicSectionLine = {
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  lineTotalPence: number | null;
};

/**
 * What the customer is charged.
 * One job with no price of its own keeps the material lines.
 * Several jobs become one priced line each, unless the whole quote is a single price.
 */
export function publicSectionLines(input: {
  sections: PricedSection[];
  fixedPricePence?: number | null;
  totalOnly?: boolean;
}): { lines: PublicSectionLine[]; totalPence: number; itemised: boolean } {
  const totalPence = quoteSectionsSubtotal(input);
  const overall = hidesMaterialLines({ totalOnly: input.totalOnly, fixedPricePence: input.fixedPricePence });
  if (overall || input.sections.length === 0) {
    return { lines: [], totalPence, itemised: input.sections.length <= 1 && !overall };
  }
  const priced = input.sections.filter((section) => section.fixedPricePence != null && section.fixedPricePence > 0);
  if (input.sections.length === 1 && priced.length === 0) {
    return { lines: [], totalPence, itemised: true };
  }
  return {
    lines: input.sections.map((section) => {
      const lineTotalPence = sectionSubtotalPence(section);
      return {
        name: sectionTitle(section.title),
        quantity: "1",
        unit: "job",
        unitPricePence: lineTotalPence,
        lineTotalPence,
      };
    }),
    totalPence,
    itemised: false,
  };
}

export type InvoiceDraftLine = {
  name: string;
  quantity: string;
  unit: string;
  unitPricePence: number | null;
  sortOrder: number;
};

/** Invoice lines for every job on the quote. A single unpriced job keeps its material lines. */
export function invoiceLinesForSections(input: {
  trade: string;
  sections: PricedSection[];
  fixedPricePence?: number | null;
  totalOnly?: boolean;
}): InvoiceDraftLine[] {
  const overall = hidesMaterialLines({ totalOnly: input.totalOnly, fixedPricePence: input.fixedPricePence });
  if (overall) {
    const names = input.sections.map((section) => sectionTitle(section.title)).filter((title) => title !== "New job");
    return [
      {
        name: names.length > 1 ? names.join(" · ") : scopeLine(input.trade),
        quantity: "1",
        unit: "job",
        unitPricePence: quoteSectionsSubtotal(input),
        sortOrder: 0,
      },
    ];
  }
  if (input.sections.length <= 1 && !(input.sections[0]?.fixedPricePence != null && input.sections[0].fixedPricePence > 0)) {
    const materials = (input.sections[0]?.materials ?? []).filter((line) => !isInternalCrewName(line.name));
    return materials.map((line, index) => ({
      name: line.name,
      quantity: line.quantity,
      unit: line.unit,
      unitPricePence: line.unitPricePence,
      sortOrder: index,
    }));
  }
  return input.sections.map((section, index) => ({
    name: sectionTitle(section.title),
    quantity: "1",
    unit: "job",
    unitPricePence: sectionSubtotalPence(section),
    sortOrder: index,
  }));
}

export function unpricedSectionCount(sections: PricedSection[]): number {
  return sections.reduce((count, section) => {
    if (section.fixedPricePence != null && section.fixedPricePence > 0) return count;
    return (
      count +
      materialsTotals(section.materials.filter((line) => !isInternalCrewName(line.name))).unpricedCount
    );
  }, 0);
}

export function lineTotal(line: SectionMaterial): number | null {
  return customerLineTotalPence(line);
}
