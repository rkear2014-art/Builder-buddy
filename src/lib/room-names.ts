/** Common rooms on the calculator. A name that is not here is kept as typed. */
export const ROOM_NAME_OPTIONS = [
  "Lounge",
  "Living room",
  "Kitchen",
  "Dining room",
  "Kitchen diner",
  "Hall",
  "Landing",
  "Stairs",
  "Bedroom 1",
  "Bedroom 2",
  "Bedroom 3",
  "Bedroom 4",
  "Bathroom",
  "En-suite",
  "Toilet / WC",
  "Utility",
  "Conservatory",
  "Study / Office",
  "Garage",
  "Porch",
  "Extension",
  "Loft",
  "Ceiling only",
] as const;

/** Exterior walls on a rendering measure. A name that is not here is kept as typed. */
export const WALL_NAME_OPTIONS = [
  "Front elevation",
  "Rear elevation",
  "Left side elevation",
  "Right side elevation",
  "Gable end",
  "Garden wall",
  "Garage wall",
  "Extension wall",
  "Chimney",
] as const;

/** Select value for the free-text choice. It is not stored as a room or wall name. */
export const ROOM_NAME_OTHER = "__other__";

export const ROOM_NAME_OTHER_LABEL = "Other (type your own)";

const ROOM_PRESETS = new Set<string>(ROOM_NAME_OPTIONS);

export function isPresetRoomName(name: string, presets: readonly string[] = ROOM_NAME_OPTIONS): boolean {
  const known = presets === ROOM_NAME_OPTIONS ? ROOM_PRESETS : new Set(presets);
  return known.has(name.trim());
}

/** Options for one room or wall. A saved name that is not on the list is included so it still shows. */
export function roomPickerOptions(name: string, presets: readonly string[] = ROOM_NAME_OPTIONS): string[] {
  const trimmed = name.trim();
  const custom = trimmed && !isPresetRoomName(trimmed, presets) ? [trimmed] : [];
  return [...custom, ...presets, ROOM_NAME_OTHER];
}

/** The option that should be selected. An unknown saved name stays selected. */
export function roomPickerValue(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return ROOM_NAME_OTHER;
  return trimmed;
}

/**
 * Apply a choice from the picker.
 * Other opens the text box. A name already typed is left as it is.
 */
export function applyRoomNamePick(
  current: string,
  picked: string,
  presets: readonly string[] = ROOM_NAME_OPTIONS,
): { name: string; typing: boolean } {
  if (picked === ROOM_NAME_OTHER) {
    const trimmed = current.trim();
    return { name: trimmed && !isPresetRoomName(trimmed, presets) ? trimmed : "", typing: true };
  }
  return { name: picked, typing: false };
}

/** Rendering, and a saved list with the same name, is measured as outside walls. */
export function isExteriorMeasure(typeKey: string, typeName = ""): boolean {
  if (typeKey === "plaster-render") return true;
  const name = typeName.trim().toLowerCase();
  return name === "rendering" || name.startsWith("rendering ");
}
