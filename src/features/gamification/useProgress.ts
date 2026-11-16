"use client";
/**
 * localStorage-backed progress store, no extra dependency.
 * Replace the persistence later with API calls (Prisma) without touching the reducers.
 */
import { useCallback, useSyncExternalStore } from "react";
import { initialProgress, type ProgressState } from "./progress";

const KEY = "elmaher.progress.v1";
const SERVER_STATE = initialProgress();

let state: ProgressState = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...initialProgress(), ...JSON.parse(raw) };
  } catch {
    /* corrupted or blocked storage: start fresh */
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useProgress() {
  const snap = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => SERVER_STATE,
  );
  const update = useCallback((fn: (s: ProgressState) => ProgressState) => {
    load();
    state = fn(state);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode: keep in memory */
    }
    listeners.forEach((l) => l());
  }, []);
  return [snap, update] as const;
}
