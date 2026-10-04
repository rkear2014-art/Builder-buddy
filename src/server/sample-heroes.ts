import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AK_SAMPLE_HEROES } from "@/lib/heroes";

export async function readSampleHero(sourceKey: string): Promise<Uint8Array> {
  const sample = AK_SAMPLE_HEROES.find((hero) => hero.sourceKey === sourceKey);
  if (!sample) throw new Error("Unknown sample photo.");
  const file = path.join(process.cwd(), "src", "fixtures", "ak-heroes", sample.file);
  return new Uint8Array(await readFile(file));
}
