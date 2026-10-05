import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { DatabaseConfigError, databaseFailureMessage, migrationDatabaseUrl, postgresRuntimeUrl } from "./database";
import { loginOffersCreate, settleSetupCheck, type SetupSnapshot } from "./setup-gate";

const require = createRequire(import.meta.url);
const parseConnection = require("pg-connection-string").parse as (value: string) => {
  ssl?: { rejectUnauthorized?: boolean } | boolean;
  pgbouncer?: string;
};

const open: SetupSnapshot = { userCount: 0, claimed: false };

describe("postgres runtime URL", () => {
  it("accepts a normal Postgres address and treats sslmode=require as encrypt-only", () => {
    const parsed = postgresRuntimeUrl(
      "postgres://user:secret@pooled.db.prisma.io:5432/postgres?sslmode=require&pgbouncer=true",
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const url = new URL(parsed.connectionString);
    assert.equal(url.hostname, "pooled.db.prisma.io");
    assert.equal(url.password, "secret");
    assert.equal(url.searchParams.get("sslmode"), "require");
    assert.equal(url.searchParams.get("uselibpqcompat"), "true");
    assert.equal(url.searchParams.get("pgbouncer"), null);
    const driver = parseConnection(parsed.connectionString);
    assert.equal(typeof driver.ssl, "object");
    if (typeof driver.ssl === "object") {
      assert.equal(driver.ssl.rejectUnauthorized, false);
    }
  });

  it("leaves a local database without SSL alone", () => {
    const parsed = postgresRuntimeUrl("postgresql://builder:builder@127.0.0.1:5432/builder_buddy");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const url = new URL(parsed.connectionString);
    assert.equal(url.searchParams.get("sslmode"), null);
    assert.equal(url.searchParams.get("uselibpqcompat"), null);
  });

  it("encrypts a remote address that forgot sslmode", () => {
    const parsed = postgresRuntimeUrl("postgres://user:secret@db.prisma.io:5432/postgres");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const url = new URL(parsed.connectionString);
    assert.equal(url.searchParams.get("sslmode"), "require");
    assert.equal(url.searchParams.get("uselibpqcompat"), "true");
  });

  it("keeps an explicit verify-full address verifying the certificate", () => {
    const parsed = postgresRuntimeUrl("postgres://user:secret@db.example.com:5432/postgres?sslmode=verify-full");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const url = new URL(parsed.connectionString);
    assert.equal(url.searchParams.get("sslmode"), "verify-full");
    assert.equal(url.searchParams.get("uselibpqcompat"), null);
  });

  it("refuses the Prisma CLI address that node-pg cannot query", () => {
    const parsed = postgresRuntimeUrl("prisma+postgres://accelerate.prisma-data.net/?api_key=example");
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.message, /postgres:\/\//);
      assert.equal(parsed.message.includes("example"), false);
    }
  });

  it("refuses an empty address", () => {
    assert.equal(postgresRuntimeUrl("  ").ok, false);
    assert.equal(postgresRuntimeUrl(undefined).ok, false);
  });
});

describe("setup check when the database read throws", () => {
  it("stays open for an empty unclaimed database", async () => {
    const check = await settleSetupCheck(async () => open);
    assert.deepEqual(check, { state: "open" });
    assert.equal(loginOffersCreate(check), true);
  });

  it("stays closed once an account exists", async () => {
    const check = await settleSetupCheck(async () => ({ userCount: 1, claimed: true }));
    assert.deepEqual(check, { state: "closed" });
    assert.equal(loginOffersCreate(check), false);
  });

  it("does not throw when SetupLock is missing", async () => {
    const check = await settleSetupCheck(async () => {
      throw Object.assign(new Error("The table `public.SetupLock` does not exist in the current database."), {
        code: "P2021",
      });
    });
    assert.equal(check.state, "unavailable");
    if (check.state === "unavailable") {
      assert.match(check.message, /tables/i);
    }
    assert.equal(loginOffersCreate(check), true);
  });

  it("does not throw when the database cannot be reached", async () => {
    const check = await settleSetupCheck(async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    });
    assert.equal(check.state, "unavailable");
    if (check.state === "unavailable") {
      assert.match(check.message, /could not reach the database/i);
    }
  });

  it("explains a missing column as a pending migration", () => {
    const message = databaseFailureMessage({
      code: "P2022",
      message: "The column `Business.invoiceDueDays` does not exist in the current database.",
      meta: {
        driverAdapterError: {
          cause: {
            originalCode: "42703",
            originalMessage: 'column "invoiceDueDays" of relation "Business" does not exist',
            kind: "ColumnNotFound",
          },
        },
      },
    });
    assert.match(message, /tables/i);
    assert.equal(message.includes("invoiceDueDays"), false);
  });

  it("explains a certificate failure without the generic reach message", () => {
    const message = databaseFailureMessage({
      message: "TlsConnectionError",
      cause: {
        kind: "TlsConnectionError",
        reason: "self-signed certificate in certificate chain",
      },
    });
    assert.match(message, /secure connection/i);
  });

  it("explains a full connection pool", () => {
    const message = databaseFailureMessage(Object.assign(new Error("sorry, too many clients already"), { code: "53300" }));
    assert.match(message, /free database connection/i);
  });

  it("explains a prisma+postgres address without repeating the secret", () => {
    const message = databaseFailureMessage(
      new DatabaseConfigError(
        "Set DATABASE_URL to the postgres:// connection string from Prisma Postgres. A prisma+postgres:// string is only for the Prisma CLI.",
      ),
    );
    assert.match(message, /postgres:\/\//);
    assert.equal(message.includes("api_key"), false);
  });

  it("tells a Vercel build to set both database addresses when neither is present", () => {
    const decision = migrationDatabaseUrl({ directUrl: "", databaseUrl: undefined, onVercel: true });
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.match(decision.message, /DIRECT_URL/);
      assert.match(decision.message, /postgres:\/\//);
    }
  });

  it("warns when migrations would go through the pool", () => {
    const decision = migrationDatabaseUrl({
      directUrl: undefined,
      databaseUrl: "postgres://user:secret@pooled.db.prisma.io:5432/postgres?sslmode=require&pgbouncer=true",
      onVercel: true,
    });
    assert.equal(decision.ok, true);
    if (decision.ok) {
      assert.match(decision.warning ?? "", /DIRECT_URL/);
      assert.equal((decision.warning ?? "").includes("secret"), false);
    }
  });

  it("stays quiet when DIRECT_URL is a direct postgres address", () => {
    const decision = migrationDatabaseUrl({
      directUrl: "postgres://user:secret@db.prisma.io:5432/postgres?sslmode=require",
      databaseUrl: "postgres://user:secret@pooled.db.prisma.io:5432/postgres?pgbouncer=true",
      onVercel: true,
    });
    assert.deepEqual(decision, { ok: true, warning: null });
  });

  it("lets a redirect keep its control-flow error", async () => {
    await assert.rejects(
      () =>
        settleSetupCheck(async () => {
          throw { digest: "NEXT_REDIRECT;replace;/;307;" };
        }),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT"),
    );
  });
});
