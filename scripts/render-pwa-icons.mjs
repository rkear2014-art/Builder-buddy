import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AMBER = [240, 180, 41, 255];
const INK = [28, 25, 21, 255];
const CLEAR = [0, 0, 0, 0];

/** House from src/app/icon.svg, in a 32-unit box. The doorway is a notch, so the amber shows through. */
const HOUSE = [
  [7.5, 14.8],
  [16, 8],
  [24.5, 14.8],
  [24.5, 23.2],
  [23.3, 25.2],
  [18.2, 25.2],
  [18.2, 19.8],
  [13.8, 19.8],
  [13.8, 25.2],
  [8.7, 25.2],
  [7.5, 23.2],
];

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function insideRoundRect(px, py, size, radius) {
  if (px < 0 || py < 0 || px > size || py > size) return false;
  const cx = Math.min(Math.max(px, radius), size - radius);
  const cy = Math.min(Math.max(py, radius), size - radius);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function inHouse(px, py, size, inset) {
  const scale = (size - inset * 2) / 32;
  const x = (px - inset) / scale;
  const y = (py - inset) / scale;
  return pointInPolygon(x, y, HOUSE);
}

/**
 * @param {{ size: number, inset: number, rounded: boolean }} options
 * rounded icons keep transparent corners. Maskable and Apple icons are full-bleed amber.
 */
function renderIcon({ size, inset, rounded }) {
  const radius = rounded ? size * 0.22 : 0;
  const samples = 4;
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y += 1) {
    const row = y * (1 + size * 4);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          let colour = CLEAR;
          const onPlate = rounded ? insideRoundRect(px, py, size, radius) : true;
          if (onPlate) colour = inHouse(px, py, size, inset) ? INK : AMBER;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          a += colour[3];
          count += 1;
        }
      }
      const offset = row + 1 + x * 4;
      raw[offset] = Math.round(r / count);
      raw[offset + 1] = Math.round(g / count);
      raw[offset + 2] = Math.round(b / count);
      raw[offset + 3] = Math.round(a / count);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(root, { recursive: true });

const files = [
  ["icon-192.png", { size: 192, inset: 0, rounded: true }],
  ["icon-512.png", { size: 512, inset: 0, rounded: true }],
  ["icon-maskable-192.png", { size: 192, inset: 16, rounded: false }],
  ["icon-maskable-512.png", { size: 512, inset: 42, rounded: false }],
  ["apple-touch-icon.png", { size: 180, inset: 0, rounded: false }],
];

for (const [name, options] of files) {
  const png = renderIcon(options);
  writeFileSync(join(root, name), png);
  process.stdout.write(`${name} ${png.length} bytes\n`);
}
