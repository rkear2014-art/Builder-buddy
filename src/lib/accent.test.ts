import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { accentFromImage, accentFromPixels, accentInk, normaliseAccent, resolveAccent } from "./accent";

describe("accent colour", () => {
  it("keeps a chosen colour and falls back to the plastering blue", () => {
    assert.equal(normaliseAccent("#245A94"), "#245a94");
    assert.equal(normaliseAccent(""), "");
    assert.equal(normaliseAccent("pink"), null);
    assert.equal(normaliseAccent("javascript:alert(1)"), null);
    assert.equal(resolveAccent(""), "#245a94");
    assert.equal(resolveAccent("#aabbcc"), "#aabbcc");
    assert.equal(accentInk("#245a94"), "#ffffff");
    assert.equal(accentInk("#f0b429"), "#1c1915");
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

  it("reads a blue from the plastering logo rather than the pale background", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("../fixtures/ak-plastering-logo.webp", import.meta.url)));
    const accent = await accentFromImage(bytes);
    assert.match(accent, /^#[0-9a-f]{6}$/);
    const red = Number.parseInt(accent.slice(1, 3), 16);
    const green = Number.parseInt(accent.slice(3, 5), 16);
    const blue = Number.parseInt(accent.slice(5, 7), 16);
    assert.ok(blue > red + 15, accent);
    assert.ok(blue > green, accent);
  });
});
