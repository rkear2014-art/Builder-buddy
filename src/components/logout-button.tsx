"use client";

import { useState } from "react";
import { CACHES_CLEARED_MESSAGE, CLEAR_CACHES_MESSAGE } from "@/lib/pwa-cache";
import { logout } from "@/server/actions/auth";

async function clearAppCaches(): Promise<void> {
  const worker = navigator.serviceWorker?.controller ?? null;
  if (worker) {
    const acked = await new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => finish(false), 1500);
      function finish(ok: boolean) {
        window.clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener("message", onMessage);
        resolve(ok);
      }
      function onMessage(event: MessageEvent) {
        if (event.data?.type === CACHES_CLEARED_MESSAGE) finish(true);
      }
      navigator.serviceWorker.addEventListener("message", onMessage);
      worker.postMessage({ type: CLEAR_CACHES_MESSAGE });
    });
    if (acked) return;
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={logout}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        setPending(true);
        void clearAppCaches().then(() => logout());
      }}
    >
      <button className="btn btn-secondary !min-h-12" type="submit" disabled={pending}>
        Log out
      </button>
    </form>
  );
}
