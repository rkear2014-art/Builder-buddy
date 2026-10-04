import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DatabaseConfigError, databaseFailureMessage, postgresRuntimeUrl } from "./database";
import { loginOffersCreate, settleSetupCheck, type SetupSnapshot } from "./setup-gate";

const open: SetupSnapshot = { userCount: 0, claimed: false };

describe("postgres runtime URL", () => {
  it("accepts a normal Postgres address, including sslmode=require", () => {
    const parsed = postgresRuntimeUrl(
      "postgres://user:secret@pooled.db.prisma.io:5432/postgres?sslmode=require",
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.match(parsed.connectionString, /^postgres:\/\/user:secret@pooled\.db\.prisma\.io/);
    }
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

  it("explains a prisma+postgres address without repeating the secret", () => {
    const message = databaseFailureMessage(
      new DatabaseConfigError(
        "Set DATABASE_URL to the postgres:// connection string from Prisma Postgres. A prisma+postgres:// string is only for the Prisma CLI.",
      ),
    );
    assert.match(message, /postgres:\/\//);
    assert.equal(message.includes("api_key"), false);
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
