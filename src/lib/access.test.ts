import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShareToken, decideAccess, isCustomerSharePath } from "./access";
import { isConfigured, missingConfiguration } from "./config";

const token = createShareToken();

describe("fail closed access", () => {
  it("treats a missing or short secret as unconfigured", () => {
    assert.deepEqual(missingConfiguration({}), ["AUTH_SECRET", "DATABASE_URL"]);
    assert.deepEqual(missingConfiguration({ AUTH_SECRET: "too-short", DATABASE_URL: "postgres://db" }), [
      "AUTH_SECRET",
    ]);
    assert.equal(
      isConfigured({ AUTH_SECRET: "x".repeat(32), DATABASE_URL: "postgres://db" }),
      true,
    );
  });

  it("never opens the tradesperson app when configuration is missing", () => {
    for (const pathname of ["/", "/jobs", "/jobs/new", "/diary", "/library", "/login", "/setup", `/sign/${token}`]) {
      const decision = decideAccess({ pathname, configured: false, hasValidSession: true });
      assert.deepEqual(decision, { type: "unavailable" }, pathname);
    }
  });

  it("sends anonymous visitors to login and lets a session through", () => {
    assert.deepEqual(decideAccess({ pathname: "/jobs/abc", configured: true, hasValidSession: false }), {
      type: "redirect",
      to: "/login",
    });
    assert.deepEqual(decideAccess({ pathname: "/", configured: true, hasValidSession: true }), {
      type: "next",
    });
    assert.deepEqual(decideAccess({ pathname: "/login", configured: true, hasValidSession: false }), {
      type: "next",
    });
    assert.deepEqual(decideAccess({ pathname: "/login", configured: true, hasValidSession: true }), {
      type: "redirect",
      to: "/",
    });
    assert.deepEqual(decideAccess({ pathname: "/setup", configured: true, hasValidSession: false }), {
      type: "next",
    });
    assert.deepEqual(decideAccess({ pathname: "/setup", configured: true, hasValidSession: true }), {
      type: "redirect",
      to: "/",
    });
    assert.deepEqual(decideAccess({ pathname: "/setup", configured: false, hasValidSession: false }), {
      type: "unavailable",
    });
  });

  it("allows only the one customer agreement path without a session", () => {
    assert.equal(isCustomerSharePath(`/sign/${token}`), true);
    assert.equal(isCustomerSharePath(`/sign/${token}/print`), true);
    assert.equal(isCustomerSharePath(`/sign/${token}/print/extra`), false);
    assert.equal(isCustomerSharePath("/sign/short"), false);

    assert.deepEqual(
      decideAccess({ pathname: `/sign/${token}`, configured: true, hasValidSession: false }),
      { type: "next" },
    );
    assert.deepEqual(
      decideAccess({ pathname: `/sign/${token}/print/`, configured: true, hasValidSession: false }),
      { type: "next" },
    );
    assert.deepEqual(
      decideAccess({ pathname: "/sign/short", configured: true, hasValidSession: false }),
      { type: "next" },
    );
    assert.deepEqual(
      decideAccess({ pathname: "/jobs", configured: true, hasValidSession: false }),
      { type: "redirect", to: "/login" },
    );
    assert.deepEqual(
      decideAccess({ pathname: "/settings", configured: true, hasValidSession: false }),
      { type: "redirect", to: "/login" },
    );
    assert.deepEqual(
      decideAccess({ pathname: "/_next/hmr", configured: true, hasValidSession: false }),
      { type: "next" },
    );
    assert.deepEqual(
      decideAccess({ pathname: "/_next/static/chunks/app.js", configured: false, hasValidSession: false }),
      { type: "unavailable" },
    );
  });

  it("serves the install files with no session, even when the app is not configured", () => {
    for (const pathname of [
      "/sw.js",
      "/offline.html",
      "/manifest.webmanifest",
      "/icons/icon-192.png",
      "/icons/icon-maskable-512.png",
      "/robots.txt",
      "/work/site-photo.webp",
    ]) {
      assert.deepEqual(decideAccess({ pathname, configured: false, hasValidSession: false }), { type: "next" }, pathname);
      assert.deepEqual(decideAccess({ pathname, configured: true, hasValidSession: false }), { type: "next" }, pathname);
    }
  });
});
