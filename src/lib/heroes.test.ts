import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import sharp from "sharp";
import { detectLogoMime } from "./logo";
import {
  AK_HERO_CAPTION,
  AK_SAMPLE_HEROES,
  missingSampleHeroKeys,
  pickRotatingHero,
} from "./heroes";

describe("dashboard hero photos", () => {
  it("steps to a different photo on the next visit", () => {
    const photos = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.equal(pickRotatingHero([], null), null);
    assert.equal(pickRotatingHero([{ id: "only" }], "only")?.id, "only");
    assert.equal(pickRotatingHero(photos, null)?.id, "a");
    assert.equal(pickRotatingHero(photos, "missing")?.id, "a");
    assert.equal(pickRotatingHero(photos, "a")?.id, "b");
    assert.equal(pickRotatingHero(photos, "b")?.id, "c");
    assert.equal(pickRotatingHero(photos, "c")?.id, "a");
    assert.notEqual(pickRotatingHero(photos, "a")?.id, "a");
  });

  it("adds only the AK sample photos that are not already stored", () => {
    assert.deepEqual(missingSampleHeroKeys([]), AK_SAMPLE_HEROES.map((hero) => hero.sourceKey));
    assert.deepEqual(missingSampleHeroKeys(["ak-flats", "ak-vans", "upload:abc"]), [
      "ak-house-front",
      "ak-house-side",
      "ak-extension",
      "ak-living-room",
    ]);
    assert.deepEqual(
      missingSampleHeroKeys(AK_SAMPLE_HEROES.map((hero) => hero.sourceKey)),
      [],
    );
    assert.equal(AK_HERO_CAPTION, "Recent AK Plastering work");
    assert.equal(AK_HERO_CAPTION.includes("07512"), false);
  });

  it("ships six web-sized sample photos", async () => {
    const dir = new URL("../fixtures/ak-heroes/", import.meta.url);
    const files = readdirSync(dir).filter((name) => name.endsWith(".webp"));
    assert.deepEqual(
      files.sort(),
      AK_SAMPLE_HEROES.map((hero) => hero.file).sort(),
    );
    for (const hero of AK_SAMPLE_HEROES) {
      const bytes = new Uint8Array(readFileSync(new URL(hero.file, dir)));
      assert.equal(detectLogoMime(bytes), "image/webp", hero.file);
      assert.ok(bytes.byteLength > 0, hero.file);
      assert.ok(bytes.byteLength < 250_000, `${hero.file} is ${bytes.byteLength} bytes`);
      const meta = await sharp(bytes).metadata();
      assert.ok((meta.width ?? 0) > 0 && (meta.width ?? 0) <= 1600, hero.file);
      assert.ok((meta.height ?? 0) > 0 && (meta.height ?? 0) <= 1600, hero.file);
    }
  });
});
