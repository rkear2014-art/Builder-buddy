import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";

function decodePng(buf: Buffer): { width: number; height: number; pixels: Uint8Array } {
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString();
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      assert.equal(data[9], 6);
    } else if (type === "IDAT") {
      idat.push(data);
    }
    offset += 12 + length;
  }
  const inflated = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height * 4);
  const stride = 1 + width * 4;
  for (let y = 0; y < height; y += 1) {
    assert.equal(inflated[y * stride], 0);
    pixels.set(inflated.subarray(y * stride + 1, (y + 1) * stride), y * width * 4);
  }
  return { width, height, pixels };
}

function pixel(png: { width: number; pixels: Uint8Array }, x: number, y: number) {
  const i = (y * png.width + x) * 4;
  return [png.pixels[i], png.pixels[i + 1], png.pixels[i + 2], png.pixels[i + 3]];
}

describe("home screen icons", () => {
  it("ships square PNG icons, with maskable and Apple artwork that stays opaque", () => {
    const expected = {
      "icon-192.png": 192,
      "icon-512.png": 512,
      "icon-maskable-192.png": 192,
      "icon-maskable-512.png": 512,
      "apple-touch-icon.png": 180,
    };
    for (const [name, size] of Object.entries(expected)) {
      const png = decodePng(readFileSync(new URL(`../../public/icons/${name}`, import.meta.url)));
      assert.equal(png.width, size, name);
      assert.equal(png.height, size, name);
      const corner = pixel(png, 0, 0);
      const centre = pixel(png, Math.floor(size / 2), Math.floor(size / 2));
      if (name.startsWith("icon-maskable") || name.startsWith("apple-touch")) {
        assert.deepEqual(corner, [240, 180, 41, 255], name);
        assert.equal(centre[3], 255, name);
      } else {
        assert.equal(corner[3], 0, name);
        assert.equal(centre[3], 255, name);
      }
    }
  });
});
