import sharp from "sharp";

/** Steel blue sampled from the K in the plastering logo. Used until a business chooses its own. */
export const DEFAULT_ACCENT = "#395571";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isAccentHex(value: string): boolean {
  return HEX.test(value);
}

export function normaliseAccent(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!HEX.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function resolveAccent(stored: string): string {
  return isAccentHex(stored) ? stored.toLowerCase() : DEFAULT_ACCENT;
}

/** White on dark accents, ink on pale ones, so the New job pill stays readable. */
export function accentInk(hex: string): "#ffffff" | "#1c1915" {
  const colour = resolveAccent(hex);
  const red = Number.parseInt(colour.slice(1, 3), 16);
  const green = Number.parseInt(colour.slice(3, 5), 16);
  const blue = Number.parseInt(colour.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? "#1c1915" : "#ffffff";
}

function hueDegrees(red: number, green: number, blue: number): number {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const span = max - min;
  let hue = 0;
  if (span === 0) hue = 0;
  else if (max === red) hue = ((green - blue) / span) % 6;
  else if (max === green) hue = (blue - red) / span + 2;
  else hue = (red - green) / span + 4;
  return (hue * 60 + 360) % 360;
}

type ColourBucket = { count: number; red: number; green: number; blue: number; saturation: number };

function bucketMean(bucket: ColourBucket): { red: number; green: number; blue: number; saturation: number } {
  return {
    red: Math.round(bucket.red / bucket.count),
    green: Math.round(bucket.green / bucket.count),
    blue: Math.round(bucket.blue / bucket.count),
    saturation: bucket.saturation / bucket.count,
  };
}

/** Dark warm browns are usually shadows or plaster, not the printed brand colour. */
function isShadowBrown(red: number, green: number, blue: number, saturation: number): boolean {
  const hue = hueDegrees(red, green, blue);
  const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2 / 255;
  const warm = hue <= 50 || hue >= 345;
  return warm && lightness < 0.45 && saturation < 0.62;
}

function toHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Picks a saturated colour and ignores pale plaster backgrounds.
 * A dark muddy brown loses to a clearer second colour, so a blue mark
 * is not beaten by the shadow on the lettering.
 */
export function accentFromPixels(pixels: Uint8Array, channels = 3): string | null {
  const buckets = new Map<number, ColourBucket>();
  for (let index = 0; index + 2 < pixels.length; index += channels) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const lightness = (max + min) / 2 / 255;
    if (saturation < 0.25 || lightness > 0.82 || lightness < 0.1) continue;
    const bucket = Math.round(hueDegrees(red, green, blue) / 30) % 12;
    const current = buckets.get(bucket) ?? { count: 0, red: 0, green: 0, blue: 0, saturation: 0 };
    current.count += 1;
    current.red += red;
    current.green += green;
    current.blue += blue;
    current.saturation += saturation;
    buckets.set(bucket, current);
  }
  const ranked = [...buckets.values()].sort((left, right) => right.count - left.count);
  const most = ranked[0];
  if (!most || most.count < 4) return null;
  let chosen = most;
  const top = bucketMean(most);
  if (isShadowBrown(top.red, top.green, top.blue, top.saturation)) {
    const alternative = ranked
      .slice(1)
      .filter((bucket) => bucket.count >= Math.max(8, most.count * 0.18))
      .map((bucket) => ({ bucket, colour: bucketMean(bucket) }))
      .filter(({ colour }) => !isShadowBrown(colour.red, colour.green, colour.blue, colour.saturation))
      .sort((left, right) => right.bucket.count * right.colour.saturation - left.bucket.count * left.colour.saturation)[0];
    if (alternative) chosen = alternative.bucket;
  }
  const colour = bucketMean(chosen);
  return toHex(colour.red, colour.green, colour.blue);
}

export async function accentFromImage(bytes: Uint8Array): Promise<string> {
  try {
    const { data, info } = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(96, 96, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return accentFromPixels(new Uint8Array(data), info.channels) ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}
