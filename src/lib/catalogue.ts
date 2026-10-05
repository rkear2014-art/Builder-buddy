import { findStarterTemplate, PLASTERING_STARTER_TEMPLATES } from "./trade-starters";

export type CatalogueGroup = {
  id: string;
  title: string;
  starterIds: string[];
};

/** Plastering services, in the order they appear on the chooser. */
export const PLASTER_CATALOGUE: CatalogueGroup[] = [
  {
    id: "plastering",
    title: "Plastering",
    starterIds: ["plaster-general", "plaster-lime", "plaster-repairs"],
  },
  {
    id: "lining",
    title: "Dry lining and partitions",
    starterIds: ["plaster-dry-lining", "plaster-wire-mesh", "plaster-tape-joint", "plaster-stud-wall"],
  },
  {
    id: "ceilings",
    title: "Ceilings and decorative",
    starterIds: ["plaster-artex", "plaster-coving", "plaster-cornice"],
  },
  {
    id: "external",
    title: "External",
    starterIds: ["plaster-render"],
  },
  {
    id: "floors",
    title: "Floors",
    starterIds: ["plaster-screed"],
  },
];

/** Sample dashboard photos that actually show this kind of work. */
const FITTING_HERO_KEYS: Record<string, readonly string[]> = {
  "plaster-general": ["ak-living-room"],
  "plaster-skim": ["ak-living-room"],
  "plaster-two-coat": ["ak-house-front"],
  "plaster-lime": ["ak-house-side"],
  "plaster-repairs": ["ak-living-room"],
  "plaster-dry-lining": ["ak-extension"],
  "plaster-stud-wall": ["ak-extension"],
  "plaster-wire-mesh": ["ak-extension"],
  "plaster-tape-joint": ["ak-living-room"],
  "plaster-artex": ["ak-living-room"],
  "plaster-coving": ["ak-living-room"],
  "plaster-cornice": ["ak-living-room"],
  "plaster-render": ["ak-flats", "ak-house-front"],
  "plaster-screed": ["ak-extension"],
};

/** Bundled work photo for a chooser tile, used until the business sets its own. */
export function defaultTileSource(starterId: string): string | null {
  return FITTING_HERO_KEYS[starterId]?.[0] ?? null;
}

export function catalogueGroupsFor(trade: string): CatalogueGroup[] {
  if (trade !== "Plasterer") return [];
  return PLASTER_CATALOGUE.map((group) => ({
    ...group,
    starterIds: group.starterIds.filter((id) => {
      const starter = findStarterTemplate(id);
      return starter?.trade === trade && starter.retired !== true;
    }),
  })).filter((group) => group.starterIds.length > 0);
}

export function isCatalogueKey(value: string): boolean {
  return /^[a-z0-9-]{8,80}$/i.test(value);
}

export function fittingHeroId(
  starterId: string,
  photos: ReadonlyArray<{ id: string; sourceKey: string }>,
): string | null {
  for (const sourceKey of FITTING_HERO_KEYS[starterId] ?? []) {
    const photo = photos.find((item) => item.sourceKey === sourceKey);
    if (photo) return photo.id;
  }
  return null;
}

export function catalogueCoversEveryStarter(): boolean {
  const listed = new Set(PLASTER_CATALOGUE.flatMap((group) => group.starterIds));
  return PLASTERING_STARTER_TEMPLATES.filter((starter) => starter.retired !== true).every((starter) => listed.has(starter.id));
}
