import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { accentFromImage, accentFromPixels, accentInk, DEFAULT_ACCENT, isReplacedAccent, normaliseAccent, resolveAccent } from "./accent";

describe("accent colour", () => {
  it("keeps a chosen colour and falls back to the AK website red", () => {
    assert.equal(normaliseAccent("#245A94"), "#245a94");
    assert.equal(normaliseAccent(""), "");
    assert.equal(normaliseAccent("pink"), null);
    assert.equal(normaliseAccent("javascript:alert(1)"), null);
    assert.equal(resolveAccent(""), DEFAULT_ACCENT);
    assert.equal(DEFAULT_ACCENT, "#dd1f29");
    assert.equal(isReplacedAccent("#395571"), true);
    assert.equal(isReplacedAccent("#245A94"), true);
    assert.equal(isReplacedAccent("#dd1f29"), false);
    assert.equal(resolveAccent("#aabbcc"), "#aabbcc");
    assert.equal(accentInk("#245a94"), "#ffffff");
    assert.equal(accentInk(DEFAULT_ACCENT), "#ffffff");
    assert.equal(accentInk("#f0b429"), "#1c1915");
    const red = Number.parseInt(DEFAULT_ACCENT.slice(1, 3), 16) / 255;
    const green = Number.parseInt(DEFAULT_ACCENT.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(DEFAULT_ACCENT.slice(5, 7), 16) / 255;
    const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
    assert.ok((1.05) / (luminance + 0.05) >= 4.5);
  });

  it("prefers a clear brand colour over a dark shadow brown", () => {
    const pixels = new Uint8Array(240 * 3);
    for (let index = 0; index < 200; index += 1) {
      pixels[index * 3] = 0x5a;
      pixels[index * 3 + 1] = 0x3a;
      pixels[index * 3 + 2] = 0x34;
    }
    for (let index = 200; index < 240; index += 1) {
      pixels[index * 3] = 0x24;
      pixels[index * 3 + 1] = 0x5a;
      pixels[index * 3 + 2] = 0x94;
    }
    assert.equal(accentFromPixels(pixels), "#245a94");
    const red = new Uint8Array(80 * 3);
    for (let index = 0; index < 80; index += 1) {
      red[index * 3] = 0xc0;
      red[index * 3 + 1] = 0x39;
      red[index * 3 + 2] = 0x2b;
    }
    assert.equal(accentFromPixels(red), "#c0392b");
  });

  it("still sees the steel blue K in the logo file, which is not the brand accent", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("../fixtures/ak-plastering-logo.webp", import.meta.url)));
    const accent = await accentFromImage(bytes);
    assert.equal(accent, "#395571");
    assert.equal(isReplacedAccent(accent), true);
    assert.notEqual(accent, DEFAULT_ACCENT);
  });
});
