import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CACHES_CLEARED_MESSAGE,
  CLEAR_CACHES_MESSAGE,
  PRECACHE_PATHS,
  decideCache,
  renderServiceWorker,
  type CacheInput,
} from "./pwa-cache";

function request(overrides: Partial<CacheInput> & Pick<CacheInput, "pathname">): CacheInput {
  return {
    method: "GET",
    destination: "",
    mode: "cors",
    accept: "*/*",
    rsc: "",
    prefetch: "",
    ...overrides,
  };
}

describe("service worker cache policy", () => {
  it("never stores a customer sign-off, even as a document or a React Server Component", () => {
    const token = "a".repeat(43);
    for (const pathname of [
      `/sign/${token}`,
      `/sign/${token}/`,
      `/sign/${token}/print`,
      `/sign/${token}/logo`,
      `/sign/${token}/hero/photo-id`,
      "/sign",
    ]) {
      assert.equal(
        decideCache(request({ pathname, destination: "document", mode: "navigate", accept: "text/html" })),
        "network-only",
        pathname,
      );
      assert.equal(decideCache(request({ pathname, rsc: "1" })), "network-only", pathname);
    }
  });

  it("ignores writes so server actions and other posts are not cached", () => {
    assert.equal(decideCache(request({ pathname: "/", method: "POST" })), "ignore");
    assert.equal(decideCache(request({ pathname: "/jobs/abc", method: "PUT" })), "ignore");
  });

  it("keeps authenticated API and app-router data on the network", () => {
    assert.equal(decideCache(request({ pathname: "/api/jobs" })), "network-only");
    assert.equal(decideCache(request({ pathname: "/", rsc: "1" })), "network-only");
    assert.equal(decideCache(request({ pathname: "/diary", prefetch: "1" })), "network-only");
    assert.equal(decideCache(request({ pathname: "/jobs", accept: "application/json" })), "network-only");
    assert.equal(decideCache(request({ pathname: "/branding/logo", destination: "image" })), "network-only");
    assert.equal(decideCache(request({ pathname: "/branding/hero", destination: "image" })), "network-only");
    assert.equal(decideCache(request({ pathname: "/branding/hero/photo", destination: "image" })), "network-only");
    assert.equal(decideCache(request({ pathname: "/branding/mark", destination: "image" })), "network-only");
    assert.equal(
      PRECACHE_PATHS.some((path) => path.includes("branding") || path.includes("/sign/")),
      false,
    );
  });

  it("cache-first only for the public shell and static files", () => {
    for (const pathname of [
      "/_next/static/chunks/app.js",
      "/icons/icon-192.png",
      "/icons/icon-maskable-512.png",
      "/manifest.webmanifest",
      "/offline.html",
      "/favicon.ico",
      "/icon.svg",
      "/apple-icon.svg",
    ]) {
      assert.equal(decideCache(request({ pathname })), "cache-first", pathname);
    }
  });

  it("loads navigations from the network and does not treat them as cacheable shell", () => {
    assert.equal(
      decideCache(request({ pathname: "/", destination: "document", mode: "navigate", accept: "text/html" })),
      "network-first-navigation",
    );
    assert.equal(
      decideCache(request({ pathname: "/jobs/abc", destination: "document", mode: "navigate", accept: "text/html" })),
      "network-first-navigation",
    );
    assert.equal(decideCache(request({ pathname: "/login", accept: "text/html,application/xhtml+xml" })), "network-first-navigation");
  });

  it("ships the same policy in the service worker, and logout clears every cache", () => {
    const source = renderServiceWorker();
    assert.equal(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), source);
    assert.match(source, /function decideCache/);
    assert.match(source, /\/sign\//);
    assert.match(source, /\/offline\.html/);
    assert.match(source, /cache:\s*"no-store"/);
    assert.match(source, new RegExp(CLEAR_CACHES_MESSAGE));
    assert.match(source, new RegExp(CACHES_CLEARED_MESSAGE));
    assert.match(source, /caches\.delete/);
    assert.match(source, /if \(canStore\(response\)\) await cache\.put\(request, response\.clone\(\)\)/);
    assert.doesNotMatch(source, /networkFirstNavigation[\s\S]*cache\.put/);
    assert.doesNotMatch(source, /networkOnly[\s\S]*cache\.put/);
  });
});
