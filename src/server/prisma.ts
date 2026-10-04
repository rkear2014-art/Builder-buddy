import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DatabaseConfigError, postgresRuntimeUrl } from "../lib/database";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  const parsed = postgresRuntimeUrl(process.env.DATABASE_URL);
  if (!parsed.ok) {
    throw new DatabaseConfigError(parsed.message);
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({
      connectionString: parsed.connectionString,
      connectionTimeoutMillis: 8_000,
    });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}

export function isUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
