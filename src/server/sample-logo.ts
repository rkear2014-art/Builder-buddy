import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readBundledLogo(): Promise<Uint8Array> {
  const file = path.join(process.cwd(), "src", "fixtures", "ak-plastering-logo.webp");
  return new Uint8Array(await readFile(file));
}

export async function readBundledMark(): Promise<Uint8Array> {
  const file = path.join(process.cwd(), "src", "fixtures", "ak-plastering-mark.webp");
  return new Uint8Array(await readFile(file));
}
