export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

/**
 * The running app talks to Postgres over TCP. Prisma's CLI also accepts
 * prisma+postgres://, which node-pg cannot query.
 */
export function postgresRuntimeUrl(
  value: string | undefined,
): { ok: true; connectionString: string } | { ok: false; message: string } {
  const url = value?.trim() ?? "";
  if (!url) {
    return { ok: false, message: "DATABASE_URL is not set." };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "DATABASE_URL is not a valid database address." };
  }
  if (parsed.protocol === "prisma:" || parsed.protocol === "prisma+postgres:") {
    return {
      ok: false,
      message:
        "Set DATABASE_URL to the postgres:// connection string from Prisma Postgres. A prisma+postgres:// string is only for the Prisma CLI.",
    };
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return { ok: false, message: "DATABASE_URL must start with postgres:// or postgresql://." };
  }
  return { ok: true, connectionString: url };
}

const MISSING_TABLE = /does not exist|undefined_table|TableDoesNotExist/i;
const CLIENT_LOAD = /Failed to load external module|Cannot find module/i;

function errorParts(error: unknown): string[] {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current !== "object" || seen.has(current)) break;
    seen.add(current);
    const record = current as { code?: unknown; message?: unknown; cause?: unknown; meta?: unknown };
    if (typeof record.code === "string") parts.push(record.code);
    if (typeof record.message === "string") parts.push(record.message);
    if (current instanceof Error && current.message) parts.push(current.message);
    const meta = record.meta;
    if (meta && typeof meta === "object" && "driverAdapterError" in meta) {
      current = (meta as { driverAdapterError?: unknown }).driverAdapterError;
      continue;
    }
    current = record.cause;
  }
  return parts;
}

/** A sentence the sign-in and setup pages can show. Never includes the connection string. */
export function databaseFailureMessage(error: unknown): string {
  if (error instanceof DatabaseConfigError) return error.message;
  const parts = errorParts(error);
  const blob = parts.join(" ");
  if (parts.includes("P2021") || parts.includes("P2022") || parts.includes("42P01") || MISSING_TABLE.test(blob)) {
    return "The database tables for this version are not there yet. Apply the migrations, then reload this page.";
  }
  if (parts.includes("MODULE_NOT_FOUND") || CLIENT_LOAD.test(blob)) {
    return "Builder Buddy could not load its database client.";
  }
  return "Builder Buddy could not reach the database. Try again in a moment.";
}
