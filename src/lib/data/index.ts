"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { cloudEnabled, supabase } from "../supabase";
import { createCloudRepo, type SyncStatus } from "./cloud";
import { createLocalRepo } from "./local";
import type { Repo, Snapshot } from "./repo";

/**
 * Signed out: data lives in this browser (local repo).
 * Signed in:  data lives in Supabase, with a per-user cache in this browser.
 * `repo` always points at the active one, so screens never need to know.
 */
const local = createLocalRepo();
let active: Repo = local;
let cloud: ReturnType<typeof createCloudRepo> | null = null;

type Account = { session: Session | null; ready: boolean; status: SyncStatus };
let account: Account = { session: null, ready: !cloudEnabled, status: { state: "synced" } };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let unsubActive = active.subscribe(notify);

function setAccount(patch: Partial<Account>) {
  account = { ...account, ...patch };
  notify();
}

function switchTo(next: Repo) {
  unsubActive();
  active = next;
  unsubActive = active.subscribe(notify);
  notify();
}

async function onSession(session: Session | null) {
  const uid = session?.user.id;
  if (uid && cloud && account.session?.user.id === uid) {
    setAccount({ session });
    return;
  }
  if (!uid) {
    cloud = null;
    switchTo(local);
    setAccount({ session: null, ready: true, status: { state: "synced" } });
    return;
  }
  cloud = createCloudRepo(supabase(), uid, (status) => setAccount({ status }));
  switchTo(cloud.repo);
  setAccount({ session, ready: true });
  try {
    await cloud.pull();
  } catch (e) {
    setAccount({ status: { state: "error", message: e instanceof Error ? e.message : "불러오기 실패" } });
  }
}

if (typeof window !== "undefined" && cloudEnabled) {
  const sb = supabase();
  sb.auth.getSession().then(({ data }) => onSession(data.session));
  sb.auth.onAuthStateChange((_event, session) => {
    // Defer: Supabase warns against awaiting other calls inside this callback.
    setTimeout(() => onSession(session), 0);
  });
}

export const repo: Repo = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => active.getSnapshot(),
  createSet: (d) => active.createSet(d),
  updateSet: (id, d) => active.updateSet(id, d),
  deleteSet: (id) => active.deleteSet(id),
  touchStudied: (id) => active.touchStudied(id),
  toggleStar: (id) => active.toggleStar(id),
  recordAnswer: (id, c) => active.recordAnswer(id, c),
  resetProgress: (id) => active.resetProgress(id),
  saveLearn: (id, s) => active.saveLearn(id, s),
  recordMatch: (id, ms) => active.recordMatch(id, ms),
  exportAll: () => active.exportAll(),
  importAll: (j) => active.importAll(j),
};

/** Retry every write after a sync error. */
export function resync() {
  cloud?.pushAll();
}

/** Copy this browser's own (signed-out) sets into the signed-in account. */
export function localSetsForImport() {
  return local.getSnapshot()?.sets ?? [];
}
export function importLocalSets(ids: string[]) {
  const pick = localSetsForImport().filter((s) => ids.includes(s.id));
  cloud?.addSets(pick);
  return pick.length;
}
export function addSampleSets(sets: Parameters<NonNullable<typeof cloud>["addSets"]>[0]) {
  cloud?.addSets(sets);
}

const serverSnapshot = () => null;

/** Current data, or null while it loads (first render, server render, account check). */
export function useData(): Snapshot | null {
  return useSyncExternalStore(
    repo.subscribe,
    () => {
      if (!account.ready) return null;
      const snap = repo.getSnapshot();
      // First load of an account on this device: wait for the server instead of showing "no sets".
      if (account.status.state === "loading" && !snap?.sets.length) return null;
      return snap;
    },
    serverSnapshot,
  );
}

const serverAccount: Account = { session: null, ready: false, status: { state: "synced" } };
export function useAccount(): Account {
  return useSyncExternalStore(repo.subscribe, () => account, () => serverAccount);
}

export function useSet(id: string) {
  const data = useData();
  if (!data) return { loading: true as const };
  return { loading: false as const, set: data.sets.find((s) => s.id === id) ?? null, data };
}
