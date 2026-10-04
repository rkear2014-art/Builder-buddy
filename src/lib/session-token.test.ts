import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptSession, encryptSession } from "./session-token";

const secret = "local-test-secret-must-be-32-characters";

describe("session tokens", () => {
  it("round-trips a user id", async () => {
    const token = await encryptSession("user_123", secret);
    const session = await decryptSession(token, secret);
    assert.deepEqual(session, { userId: "user_123" });
  });

  it("fails closed when the secret is missing, short, or different", async () => {
    const token = await encryptSession("user_123", secret);
    assert.equal(await decryptSession(token, undefined), null);
    assert.equal(await decryptSession(token, "short"), null);
    assert.equal(await decryptSession(token, `${"b".repeat(32)}`), null);
    assert.equal(await decryptSession(undefined, secret), null);
    assert.equal(await decryptSession(`${token}x`, secret), null);
    await assert.rejects(() => encryptSession("user_123", undefined));
    await assert.rejects(() => encryptSession("", secret));
  });
});
