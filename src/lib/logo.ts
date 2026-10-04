import sharp from "sharp";

export const MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_LOGO_EDGE = 960;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

export type LogoMime = "image/png" | "image/jpeg" | "image/webp";

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

export function detectLogoMime(bytes: Uint8Array): LogoMime | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function logoUploadError(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "Choose a PNG, JPG, or WebP logo.";
  if (bytes.length > MAX_LOGO_UPLOAD_BYTES) {
    return "That logo is larger than 2 MB. Choose a smaller picture.";
  }
  if (!detectLogoMime(bytes)) return "Use a PNG, JPG, or WebP picture.";
  return null;
}

export async function prepareLogo(
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; mime: "image/webp" } | { error: string }> {
  const error = logoUploadError(bytes);
  if (error) return { error };
  try {
    const output = await sharp(bytes, { limitInputPixels: 40_000_000, sequentialRead: true })
      .rotate()
      .resize({
        width: MAX_LOGO_EDGE,
        height: MAX_LOGO_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    if (output.length === 0 || output.length > MAX_LOGO_UPLOAD_BYTES) {
      return { error: "That picture could not be read. Use a PNG, JPG, or WebP logo." };
    }
    return { bytes: new Uint8Array(output), mime: "image/webp" };
  } catch {
    return { error: "That picture could not be read. Use a PNG, JPG, or WebP logo." };
  }
}
