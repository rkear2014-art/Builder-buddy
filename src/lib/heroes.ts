export const HERO_VISIT_COOKIE = "bb-hero";
export const AK_HERO_CAPTION = "Recent AK Plastering work";
export const MAX_HERO_PHOTOS = 12;

export const AK_SAMPLE_HEROES = [
  { sourceKey: "ak-flats", file: "ak-flats.webp" },
  { sourceKey: "ak-house-front", file: "ak-house-front.webp" },
  { sourceKey: "ak-house-side", file: "ak-house-side.webp" },
  { sourceKey: "ak-vans", file: "ak-vans.webp" },
  { sourceKey: "ak-extension", file: "ak-extension.webp" },
  { sourceKey: "ak-living-room", file: "ak-living-room.webp" },
] as const;

export type AkSampleHero = (typeof AK_SAMPLE_HEROES)[number];

const SAMPLE_KEYS = new Set<string>(AK_SAMPLE_HEROES.map((hero) => hero.sourceKey));

export function isSampleHeroKey(sourceKey: string): boolean {
  return SAMPLE_KEYS.has(sourceKey);
}

/** Sample photos whose source key is not already stored for this business. */
export function missingSampleHeroKeys(existingKeys: Iterable<string | null | undefined>): string[] {
  const have = new Set<string>();
  for (const key of existingKeys) {
    if (key) have.add(key);
  }
  return AK_SAMPLE_HEROES.map((hero) => hero.sourceKey).filter((key) => !have.has(key));
}

/** Next dashboard photo. With more than one, a repeat visit moves on from the last one shown. */
export function pickRotatingHero<T extends { id: string }>(photos: readonly T[], previousId: string | null): T | null {
  if (photos.length === 0) return null;
  if (photos.length === 1) return photos[0];
  const index = previousId ? photos.findIndex((photo) => photo.id === previousId) : -1;
  const next = index === -1 ? 0 : (index + 1) % photos.length;
  return photos[next];
}
