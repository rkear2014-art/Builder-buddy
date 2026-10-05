import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import manifest from "../app/manifest";

describe("web app manifest", () => {
  it("meets Chrome's installability criteria and opens the tradesperson desk", () => {
    const data = manifest();
    assert.equal(data.name, "Builder Buddy");
    assert.equal(data.short_name, "Buddy");
    assert.equal(data.display, "standalone");
    assert.equal(data.start_url, "/");
    assert.equal(data.scope, "/");
    assert.equal(data.id, "/");
    assert.equal(data.theme_color, "#dd1f29");
    assert.equal(data.background_color, "#f3efe4");
    assert.equal(data.lang, "en-GB");
    const icons = data.icons ?? [];
    for (const size of ["192x192", "512x512"]) {
      const standard = icons.find((icon) => icon.sizes === size && icon.purpose === "any");
      const maskable = icons.find((icon) => icon.sizes === size && icon.purpose === "maskable");
      assert.equal(standard?.type, "image/png", size);
      assert.equal(maskable?.type, "image/png", size);
      assert.match(standard?.src ?? "", /\.png$/);
      assert.match(maskable?.src ?? "", /maskable/);
    }
  });

  it("asks iOS to launch from the home screen without the browser chrome", () => {
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /apple-mobile-web-app-capable/);
    assert.match(layout, /statusBarStyle:\s*"default"/);
    assert.match(layout, /title:\s*"Builder Buddy"/);
    assert.match(layout, /apple-touch-icon\.png/);
  });
});
