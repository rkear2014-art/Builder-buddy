export type CacheInput = {
  method: string;
  pathname: string;
  destination: string;
  mode: string;
  accept: string;
  rsc: string;
  prefetch: string;
};

/** What the service worker should do with one request. Authenticated pages are never stored. */
export type CacheDecision = "ignore" | "network-only" | "cache-first" | "network-first-navigation";

export const SHELL_CACHE = "builder-buddy-shell-v1";

export const PRECACHE_PATHS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
] as const;

export const CLEAR_CACHES_MESSAGE = "CLEAR_CACHES";
export const CACHES_CLEARED_MESSAGE = "CACHES_CLEARED";

/**
 * Plain JavaScript, copied into public/sw.js.
 * Customer sign-off stays network-only so a saved page can never be served after logout.
 */
export const decideCacheSource = `function decideCache(input) {
  if (input.method !== "GET" && input.method !== "HEAD") return "ignore";
  let pathname = input.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  if (pathname === "/sign" || pathname.startsWith("/sign/")) return "network-only";
  if (pathname.startsWith("/api/")) return "network-only";
  if (input.rsc === "1" || input.prefetch === "1") return "network-only";
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline.html" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon" ||
    pathname.startsWith("/icon.") ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/apple-icon.")
  ) {
    return "cache-first";
  }
  const accept = input.accept || "";
  if (input.destination === "document" || input.mode === "navigate" || accept.includes("text/html")) {
    return "network-first-navigation";
  }
  return "network-only";
}`;

let compiled: ((input: CacheInput) => CacheDecision) | undefined;

export function decideCache(input: CacheInput): CacheDecision {
  compiled ??= new Function(`${decideCacheSource}\nreturn decideCache;`)() as (
    input: CacheInput,
  ) => CacheDecision;
  return compiled(input);
}

/** Classic service worker. Registered only from the production build. */
export function renderServiceWorker(): string {
  return `/* Generated from src/lib/pwa-cache.ts. Do not edit by hand. */
const SHELL_CACHE = ${JSON.stringify(SHELL_CACHE)};
const PRECACHE_PATHS = ${JSON.stringify(PRECACHE_PATHS, null, 2)};
const CLEAR_CACHES_MESSAGE = ${JSON.stringify(CLEAR_CACHES_MESSAGE)};
const CACHES_CLEARED_MESSAGE = ${JSON.stringify(CACHES_CLEARED_MESSAGE)};

${decideCacheSource}

function canStore(response) {
  if (!response || response.status !== 200 || response.type !== "basic" || response.redirected) return false;
  const cacheControl = response.headers.get("cache-control") || "";
  if (/no-store|private/i.test(cacheControl)) return false;
  return true;
}

async function offlineResponse() {
  const cached = await caches.match("/offline.html");
  if (cached) return cached;
  return new Response("You're offline", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (canStore(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    if (request.mode === "navigate") return offlineResponse();
    return Response.error();
  }
}

async function fetchFresh(request) {
  return fetch(new Request(request, { cache: "no-store" }));
}

async function networkFirstNavigation(request) {
  try {
    return await fetchFresh(request);
  } catch {
    return offlineResponse();
  }
}

async function networkOnly(request) {
  try {
    return await fetchFresh(request);
  } catch {
    if (request.mode === "navigate") return offlineResponse();
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_PATHS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const decision = decideCache({
    method: request.method,
    pathname: url.pathname,
    destination: request.destination || "",
    mode: request.mode || "",
    accept: request.headers.get("accept") || "",
    rsc: request.headers.get("rsc") || "",
    prefetch: request.headers.get("next-router-prefetch") || request.headers.get("next-router-segment-prefetch") || "",
  });
  if (decision === "ignore") return;
  if (decision === "cache-first") {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (decision === "network-first-navigation") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  event.respondWith(networkOnly(request));
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== CLEAR_CACHES_MESSAGE) return;
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => caches.open(SHELL_CACHE))
      .then((cache) => cache.addAll(PRECACHE_PATHS))
      .then(() => {
        if (event.source) event.source.postMessage({ type: CACHES_CLEARED_MESSAGE });
      }),
  );
});
`;
}
