"use client";

import { useSyncExternalStore } from "react";
import { formatPence } from "@/lib/money";

const HIDE_MONEY_KEY = "builder-buddy-hide-money";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readHidden(): boolean {
  return window.localStorage.getItem(HIDE_MONEY_KEY) === "1";
}

export function MoneyFigure({ pence, className }: { pence: number; className?: string }) {
  const hidden = useSyncExternalStore(subscribe, readHidden, () => false);
  return <span className={className}>{hidden ? "Hidden" : formatPence(pence)}</span>;
}
