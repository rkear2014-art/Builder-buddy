import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateSetupClaim,
  requiredSetupToken,
  setupIsOpen,
  type SetupSnapshot,
} from "./setup-gate";

const open: SetupSnapshot = { userCount: 0, claimed: false };

describe("first-account setup gate", () => {
  it("opens only when there are no users and the lock is unclaimed", () => {
    assert.equal(setupIsOpen(open), true);
    assert.equal(setupIsOpen({ userCount: 1, claimed: false }), false);
    assert.equal(setupIsOpen({ userCount: 0, claimed: true }), false);
    assert.equal(setupIsOpen({ userCount: 0, claimed: null }), false);
  });

  it("does not require a setup code unless SETUP_TOKEN is set", () => {
    assert.equal(requiredSetupToken(undefined), null);
    assert.equal(requiredSetupToken("   "), null);
    assert.equal(requiredSetupToken(" tablet-code "), "tablet-code");
    assert.deepEqual(evaluateSetupClaim(open, { suppliedToken: "", requiredToken: null }), { ok: true });
    assert.deepEqual(
      evaluateSetupClaim(open, { suppliedToken: "nope", requiredToken: "tablet-code" }),
      { ok: false, reason: "token" },
    );
    assert.deepEqual(
      evaluateSetupClaim(open, { suppliedToken: "tablet-code", requiredToken: "tablet-code" }),
      { ok: true },
    );
  });

  it("cannot be reused after an account exists, even if the users are later removed", () => {
    assert.deepEqual(evaluateSetupClaim({ userCount: 2, claimed: false }, { suppliedToken: "", requiredToken: null }), {
      ok: false,
      reason: "closed",
    });
    assert.deepEqual(evaluateSetupClaim({ userCount: 0, claimed: true }, { suppliedToken: "", requiredToken: null }), {
      ok: false,
      reason: "closed",
    });
  });

  it("is race-safe: two overlapping claims create one account", async () => {
    const state: SetupSnapshot = { userCount: 0, claimed: false };
    const lock = createMutex();

    async function claim() {
      const unlock = await lock();
      try {
        const decision = evaluateSetupClaim(state, { suppliedToken: "", requiredToken: null });
        if (!decision.ok) return decision;
        await new Promise((resolve) => setTimeout(resolve, 15));
        state.userCount += 1;
        state.claimed = true;
        return { ok: true as const };
      } finally {
        unlock();
      }
    }

    const results = await Promise.all([claim(), claim()]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(results.filter((result) => !result.ok && result.reason === "closed").length, 1);
    assert.deepEqual(state, { userCount: 1, claimed: true });
    assert.deepEqual(evaluateSetupClaim(state, { suppliedToken: "", requiredToken: null }), {
      ok: false,
      reason: "closed",
    });
  });
});

function createMutex(): () => Promise<() => void> {
  let chain: Promise<void> = Promise.resolve();
  return async () => {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = chain;
    chain = next;
    await previous;
    return release;
  };
}
