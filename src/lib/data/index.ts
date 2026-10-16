"use client";

import { useSyncExternalStore } from "react";
import { createLocalRepo } from "./local";
import type { Repo, Snapshot } from "./repo";

export const repo: Repo = createLocalRepo();

const serverSnapshot = () => null;

/** Current data, or null while it loads (first render, server render). */
export function useData(): Snapshot | null {
  return useSyncExternalStore(repo.subscribe, repo.getSnapshot, serverSnapshot);
}

export function useSet(id: string) {
  const data = useData();
  if (!data) return { loading: true as const };
  return { loading: false as const, set: data.sets.find((s) => s.id === id) ?? null, data };
}
