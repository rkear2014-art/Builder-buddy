export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PRISMA_ONLY_PARAMS = ["pgbouncer", "connection_limit", "pool_timeout", "socket_timeout"];
const LIBPQ_SSL = new Set(["require", "prefer", "verify-ca"]);

/**
 * The running app talks to Postgres over TCP. Prisma's CLI also accepts
 * prisma+postgres://, which node-pg cannot query.
 *
 * node-pg 8 treats sslmode=require as verify-full. Prisma Postgres uses
 * sslmode=require to mean "encrypt the connection". Rewrite that here so the
 * app can connect, and drop pooler-only parameters the driver would misread.
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
  return { ok: true, connectionString: connectionStringForNodePg(parsed) };
}

function connectionStringForNodePg(parsed: URL): string {
  const url = new URL(parsed.href);
  for (const key of PRISMA_ONLY_PARAMS) url.searchParams.delete(key);
  const sslmode = url.searchParams.get("sslmode");
  const local = LOCAL_HOSTS.has(url.hostname);
  if (sslmode && LIBPQ_SSL.has(sslmode)) {
    url.searchParams.set("uselibpqcompat", "true");
  } else if (!sslmode && !local) {
    url.searchParams.set("uselibpqcompat", "true");
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

function isCliDatabaseUrl(value: string): boolean {
  return (
    value.startsWith("postgres://") ||
    value.startsWith("postgresql://") ||
    value.startsWith("prisma://") ||
    value.startsWith("prisma+postgres://")
  );
}

function isPooledPostgresUrl(value: string): boolean {
  if (!value.startsWith("postgres://") && !value.startsWith("postgresql://")) return false;
  try {
    const url = new URL(value);
    if (url.searchParams.get("pgbouncer") === "true") return true;
    return /pool/i.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Migrations prefer DIRECT_URL. On Vercel, a missing address must not fall
 * through to localhost. A pooled address is allowed, with a warning, so a
 * deploy is not blocked while the direct string is still unset.
 */
export function migrationDatabaseUrl(input: {
  directUrl: string | undefined;
  databaseUrl: string | undefined;
  onVercel: boolean;
}): { ok: true; warning: string | null } | { ok: false; message: string } {
  const direct = input.directUrl?.trim() ?? "";
  const database = input.databaseUrl?.trim() ?? "";
  const chosen = direct || database;
  if (!chosen) {
    if (input.onVercel) {
      return {
        ok: false,
        message:
          "Set DATABASE_URL to the pooled postgres:// string from Prisma Postgres, and DIRECT_URL to the direct postgres:// string. Then redeploy.",
      };
    }
    return { ok: true, warning: null };
  }
  if (!isCliDatabaseUrl(chosen)) {
    return {
      ok: false,
      message: "DIRECT_URL or DATABASE_URL must be a postgres:// or prisma+postgres:// address.",
    };
  }
  const directIsUnpooled = Boolean(direct) && isCliDatabaseUrl(direct) && !isPooledPostgresUrl(direct);
  if (isPooledPostgresUrl(chosen) && !directIsUnpooled) {
    return {
      ok: true,
      warning:
        "Migrations are using a pooled database address. In Vercel, set DIRECT_URL to the direct postgres:// string so migrations do not go through the pool.",
    };
  }
  return { ok: true, warning: null };
}

const MISSING_SCHEMA =
  /does not exist|undefined_table|undefined_column|TableDoesNotExist|ColumnNotFound/i;
const CLIENT_LOAD = /Failed to load external module|Cannot find module/i;
const TLS_FAILURE =
  /TlsConnectionError|self-signed certificate|unable to get local issuer|unable to verify|UNABLE_TO_GET_ISSUER_CERT|CERT_|certificate/i;
const POOL_FULL = /too many clients|remaining connection slots|sorry, too many clients|53300/i;
const PENDING_CODES = new Set(["P2021", "P2022", "42P01", "42703", "3F000"]);

function errorParts(error: unknown): string[] {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];
  while (queue.length > 0 && seen.size < 8) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as {
      code?: unknown;
      message?: unknown;
      kind?: unknown;
      reason?: unknown;
      originalCode?: unknown;
      originalMessage?: unknown;
      cause?: unknown;
      error?: unknown;
      meta?: unknown;
    };
    for (const value of [
      record.code,
      record.originalCode,
      record.kind,
      record.message,
      record.originalMessage,
      record.reason,
    ]) {
      if (typeof value === "string" && value) parts.push(value);
    }
    if (current instanceof Error && current.message) parts.push(current.message);
    const meta = record.meta;
    if (meta && typeof meta === "object" && "driverAdapterError" in meta) {
      queue.push((meta as { driverAdapterError?: unknown }).driverAdapterError);
    }
    if (record.cause) queue.push(record.cause);
    if (record.error) queue.push(record.error);
  }
  return parts;
}

/** A sentence the sign-in and setup pages can show. Never includes the connection string. */
export function databaseFailureMessage(error: unknown): string {
  if (error instanceof DatabaseConfigError) return error.message;
  const parts = errorParts(error);
  const blob = parts.join(" ");
  if (parts.some((part) => PENDING_CODES.has(part)) || MISSING_SCHEMA.test(blob)) {
    return "The database tables for this version are not there yet. Apply the migrations, then reload this page.";
  }
  if (parts.includes("MODULE_NOT_FOUND") || CLIENT_LOAD.test(blob)) {
    return "Builder Buddy could not load its database client.";
  }
  if (TLS_FAILURE.test(blob)) {
    return "Builder Buddy could not open a secure connection to the database. Try again in a moment.";
  }
  if (parts.includes("53300") || POOL_FULL.test(blob)) {
    return "Builder Buddy is waiting for a free database connection. Try again in a moment.";
  }
  return "Builder Buddy could not reach the database. Try again in a moment.";
}
