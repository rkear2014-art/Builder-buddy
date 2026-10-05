import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import { DatabaseConfigError, postgresRuntimeUrl } from "../lib/database";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

/**
 * One pool per serverless instance. Prisma Postgres allows few connections,
 * and a fresh Pool on every request exhausts them. max 1 is enough because
 * each instance handles one request at a time.
 */
export function getPrisma(): PrismaClient {
  const parsed = postgresRuntimeUrl(process.env.DATABASE_URL);
  if (!parsed.ok) {
    throw new DatabaseConfigError(parsed.message);
  }
  if (!globalForPrisma.prisma) {
    const pool = new Pool({
      connectionString: parsed.connectionString,
      max: 1,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 20_000,
      allowExitOnIdle: true,
    });
    globalForPrisma.pgPool = pool;
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return globalForPrisma.prisma;
}

export async function disconnectPrisma(): Promise<void> {
  const client = globalForPrisma.prisma;
  const pool = globalForPrisma.pgPool;
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPool = undefined;
  await client?.$disconnect();
  await pool?.end();
}

export function isUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
