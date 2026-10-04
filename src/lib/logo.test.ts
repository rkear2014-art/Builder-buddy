import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import sharp from "sharp";
import { detectLogoMime, logoUploadError, MAX_LOGO_UPLOAD_BYTES, prepareLogo } from "./logo";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("logo upload", () => {
  it("accepts a PNG, JPG, or WebP and refuses anything else", () => {
    assert.equal(detectLogoMime(TINY_PNG), "image/png");
    assert.equal(detectLogoMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    assert.equal(detectLogoMime(webp), "image/webp");
    assert.equal(logoUploadError(new Uint8Array()), "Choose a PNG, JPG, or WebP logo.");
    assert.equal(
      logoUploadError(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])),
      "Use a PNG, JPG, or WebP picture.",
    );
    assert.equal(
      logoUploadError(Uint8Array.from([0x3c, 0x73, 0x76, 0x67])),
      "Use a PNG, JPG, or WebP picture.",
    );
    assert.equal(
      logoUploadError(new Uint8Array(MAX_LOGO_UPLOAD_BYTES + 1)),
      "That logo is larger than 2 MB. Choose a smaller picture.",
    );
  });

  it("resizes an upload to a WebP logo", async () => {
    const prepared = await prepareLogo(TINY_PNG);
    assert.ok(!("error" in prepared));
    if ("error" in prepared) return;
    assert.equal(prepared.mime, "image/webp");
    assert.equal(detectLogoMime(prepared.bytes), "image/webp");
    assert.ok(prepared.bytes.byteLength > 0);
    assert.ok(prepared.bytes.byteLength <= MAX_LOGO_UPLOAD_BYTES);
  });

  it("keeps the bundled plastering logo as a small WebP and a smaller mark", async () => {
    const logo = new Uint8Array(readFileSync(new URL("../fixtures/ak-plastering-logo.webp", import.meta.url)));
    const mark = new Uint8Array(readFileSync(new URL("../fixtures/ak-plastering-mark.webp", import.meta.url)));
    assert.equal(detectLogoMime(logo), "image/webp");
    assert.equal(detectLogoMime(mark), "image/webp");
    assert.ok(logo.byteLength < 200_000);
    assert.ok(mark.byteLength < 80_000);
    assert.ok(mark.byteLength < logo.byteLength);
    const logoMeta = await sharp(logo).metadata();
    const markMeta = await sharp(mark).metadata();
    assert.ok((logoMeta.width ?? 0) >= 1000);
    assert.equal(markMeta.width, markMeta.height);
    assert.ok((markMeta.width ?? 0) > 0 && (markMeta.width ?? 0) <= 640);
  });
});
