"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { installPromptMode, isIosSafari, type InstallPromptMode } from "@/lib/install-prompt";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;

function emit() {
  for (const listener of listeners) listener();
}

function runningStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    nav.standalone === true
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  };
  const onInstalled = () => {
    installed = true;
    deferredPrompt = null;
    emit();
  };
  const media = [
    window.matchMedia("(display-mode: standalone)"),
    window.matchMedia("(display-mode: fullscreen)"),
    window.matchMedia("(display-mode: minimal-ui)"),
  ];
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  for (const query of media) query.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
    for (const query of media) query.removeEventListener("change", listener);
  };
}

function promptMode(pathname: string): InstallPromptMode {
  return installPromptMode({
    pathname,
    standalone: installed || runningStandalone(),
    hasDeferredPrompt: deferredPrompt !== null,
    iosSafari: isIosSafari(window.navigator.userAgent, {
      platform: window.navigator.platform,
      maxTouchPoints: window.navigator.maxTouchPoints,
    }),
  });
}

export function InstallPrompt() {
  const pathname = usePathname();
  const mode = useSyncExternalStore(
    subscribe,
    () => promptMode(pathname),
    () => "hidden" as const,
  );

  async function install() {
    const prompt = deferredPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    deferredPrompt = null;
    if (choice.outcome === "accepted") installed = true;
    emit();
  }

  if (mode === "hidden") return null;

  return (
    <div className="border-b border-line bg-card px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        {mode === "android" ? (
          <>
            <p className="m-0 text-base font-semibold">Add Builder Buddy to your home screen.</p>
            <button className="btn btn-primary !min-h-12" type="button" onClick={() => void install()}>
              Install app
            </button>
          </>
        ) : (
          <p className="m-0 text-base font-semibold">Tap Share, then Add to Home Screen.</p>
        )}
      </div>
    </div>
  );
}
