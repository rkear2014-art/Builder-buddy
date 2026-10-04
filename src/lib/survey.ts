export type SurveyItem = {
  key: string;
  label: string;
};

const PLASTER_SURVEY: SurveyItem[] = [
  { key: "rooms", label: "Room measurements and m²" },
  { key: "ceiling", label: "Ceiling height" },
  { key: "walls", label: "Wall condition" },
  { key: "artex", label: "Artex and asbestos check" },
  { key: "damp", label: "Damp" },
  { key: "plaster-type", label: "Existing plaster type" },
  { key: "sockets", label: "Sockets and switches to remove" },
  { key: "access", label: "Access and parking" },
  { key: "waste", label: "Skip and waste" },
  { key: "protection", label: "Furniture and floor protection" },
  { key: "services", label: "Power and water on site" },
  { key: "photos", label: "Photos of each room" },
];

const GENERAL_SURVEY: SurveyItem[] = [
  { key: "rooms", label: "Measurements" },
  { key: "access", label: "Access and parking" },
  { key: "protection", label: "Furniture and floor protection" },
  { key: "services", label: "Power and water on site" },
  { key: "photos", label: "Photos" },
];

export function surveyForTrade(trade: string): SurveyItem[] {
  return trade === "Plasterer" ? PLASTER_SURVEY : GENERAL_SURVEY;
}

export function surveyIntro(trade: string): string {
  if (trade === "Plasterer") {
    return "Room measurements, ceiling height, wall condition, Artex, damp, access, waste, and a photo of each room.";
  }
  return "Measurements, access, photos, and what is on site before the work starts.";
}

export function surveyKeys(stored: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const line of stored.split(/\n+/)) {
    const key = line.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function surveyProgress(trade: string, stored: string): { done: number; total: number } {
  const items = surveyForTrade(trade);
  const ticked = new Set(surveyKeys(stored));
  return { done: items.filter((item) => ticked.has(item.key)).length, total: items.length };
}

export function toggleSurveyStored(stored: string, key: string, on: boolean, allowed: readonly string[]): string {
  if (!allowed.includes(key)) return stored;
  const ticked = new Set(surveyKeys(stored));
  if (on) ticked.add(key);
  else ticked.delete(key);
  return allowed.filter((item) => ticked.has(item)).join("\n");
}
