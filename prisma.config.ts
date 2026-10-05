import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 * A localhost fallback lets `prisma generate` run before a database exists.
 * The running app does not use this fallback: it stays closed until DATABASE_URL is set.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the direct address when DIRECT_URL is set. The app itself uses DATABASE_URL.
    // The localhost fallback is only for `prisma generate` before a database exists.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://127.0.0.1:5432/builder_buddy",
  },
});
