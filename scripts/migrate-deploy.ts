import "dotenv/config";
import { spawnSync } from "node:child_process";
import { migrationDatabaseUrl } from "../src/lib/database";

/**
 * Applies migrations before `next build`.
 * A pooled DATABASE_URL is a poor place to migrate. DIRECT_URL is the direct
 * postgres:// string. This does not print either address.
 */
const decision = migrationDatabaseUrl({
  directUrl: process.env.DIRECT_URL,
  databaseUrl: process.env.DATABASE_URL,
  onVercel: process.env.VERCEL === "1",
});

if (!decision.ok) {
  console.error(decision.message);
  process.exit(1);
}

if (decision.warning) {
  console.warn(decision.warning);
}

const result = spawnSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("Could not start prisma migrate deploy.");
  process.exit(1);
}

process.exit(result.status ?? 1);
