"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardProgress, StudySet } from "../types";
import { createLocalRepo } from "./local";
import type { Repo, Snapshot } from "./repo";

export type SyncStatus = { state: "loading" | "synced" | "saving" | "error"; message?: string };

/**
 * Cloud repo: every change is applied to a local cache first (so screens stay
 * instant and work offline), then written to Supabase in order. If a write
 * fails, status turns to "error" and pushAll() re-sends everything.
 */
export function createCloudRepo(sb: SupabaseClient, userId: string, onStatus: (s: SyncStatus) => void) {
  const cache = createLocalRepo(undefined, { key: `toeic-cards:cloud:${userId}`, seed: false });
  let queue: Promise<void> = Promise.resolve();
  let pending = 0;

  function run(label: string, job: () => Promise<void>) {
    pending++;
    onStatus({ state: "saving" });
    queue = queue
      .then(job)
      .then(() => {
        if (--pending === 0) onStatus({ state: "synced" });
      })
      .catch((e: unknown) => {
        pending--;
        const message = e instanceof Error ? e.message : String(e);
        console.warn(`[sync] ${label} failed:`, message);
        onStatus({ state: "error", message: `${label} 저장 실패` });
      });
  }

  const ok = async <T,>(p: PromiseLike<{ error: { message: string } | null; data?: T }>) => {
    const { error } = await p;
    if (error) throw new Error(error.message);
  };

  const snap = () => cache.getSnapshot()!;
  const setRow = (s: StudySet) => ({
    id: s.id,
    user_id: userId,
    title: s.title,
    description: s.description,
    visibility: s.visibility,
    created_at: s.createdAt,
    last_studied_at: s.lastStudiedAt ?? null,
  });
  const cardRows = (s: StudySet) =>
    s.cards.map((c, i) => ({ id: c.id, set_id: s.id, position: i, term: c.term, definition: c.definition }));
  const progressRow = (p: CardProgress) => ({
    user_id: userId,
    card_id: p.cardId,
    correct_streak: p.correctStreak,
    times_seen: p.timesSeen,
    starred: p.starred,
    mastery: p.mastery,
    last_seen_at: p.lastSeenAt ?? null,
  });

  async function writeSet(s: StudySet) {
    await ok(sb.from("study_sets").upsert(setRow(s)));
    const keep = s.cards.map((c) => c.id);
    let del = sb.from("cards").delete().eq("set_id", s.id);
    if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
    await ok(del);
    if (keep.length) await ok(sb.from("cards").upsert(cardRows(s)));
  }

  async function writeState() {
    const s = snap();
    await ok(sb.from("user_state").upsert({ user_id: userId, learn: s.learn, match_best: s.matchBest }));
  }

  async function writeProgress(ids: string[]) {
    const s = snap();
    const rows = ids.map((id) => s.progress[id]).filter(Boolean).map(progressRow);
    if (rows.length) await ok(sb.from("card_progress").upsert(rows));
  }

  /** Fetch everything from the server and replace the cache. */
  async function pull(): Promise<Snapshot> {
    onStatus({ state: "loading" });
    const [sets, progress, state] = await Promise.all([
      sb.from("study_sets").select("*, cards(*)").order("created_at", { ascending: false }),
      sb.from("card_progress").select("*"),
      sb.from("user_state").select("*").maybeSingle(),
    ]);
    const err = sets.error ?? progress.error ?? state.error;
    if (err) throw new Error(err.message);
    const next: Snapshot = {
      sets: (sets.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        visibility: r.visibility,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        lastStudiedAt: r.last_studied_at ?? undefined,
        cards: [...(r.cards ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((c) => ({ id: c.id, term: c.term, definition: c.definition })),
      })),
      progress: Object.fromEntries(
        (progress.data ?? []).map((p) => [
          p.card_id,
          {
            cardId: p.card_id,
            correctStreak: p.correct_streak,
            timesSeen: p.times_seen,
            starred: p.starred,
            mastery: p.mastery,
            lastSeenAt: p.last_seen_at ?? undefined,
          } satisfies CardProgress,
        ]),
      ),
      learn: state.data?.learn ?? {},
      matchBest: state.data?.match_best ?? {},
    };
    cache.importAll(JSON.stringify(next));
    onStatus({ state: "synced" });
    return next;
  }

  /** Re-send the whole cache (used after a failed write). */
  function pushAll() {
    run("전체", async () => {
      const s = snap();
      for (const set of s.sets) await writeSet(set);
      await writeProgress(Object.keys(s.progress));
      await writeState();
    });
  }

  const repo: Repo = {
    subscribe: cache.subscribe,
    getSnapshot: cache.getSnapshot,
    createSet(draft) {
      const id = cache.createSet(draft);
      const set = snap().sets.find((x) => x.id === id)!;
      run("세트", () => writeSet(set));
      return id;
    },
    updateSet(id, draft) {
      cache.updateSet(id, draft);
      const set = snap().sets.find((x) => x.id === id)!;
      run("세트", async () => {
        await writeSet(set);
        await writeState();
      });
    },
    deleteSet(id) {
      cache.deleteSet(id);
      run("삭제", async () => {
        await ok(sb.from("study_sets").delete().eq("id", id));
        await writeState();
      });
    },
    touchStudied(id) {
      cache.touchStudied(id);
      const set = snap().sets.find((x) => x.id === id);
      if (set) run("학습 기록", () => ok(sb.from("study_sets").update({ last_studied_at: set.lastStudiedAt }).eq("id", id)));
    },
    toggleStar(cardId) {
      cache.toggleStar(cardId);
      run("별표", () => writeProgress([cardId]));
    },
    recordAnswer(cardId, correct) {
      cache.recordAnswer(cardId, correct);
      run("진행 상황", () => writeProgress([cardId]));
    },
    resetProgress(setId) {
      cache.resetProgress(setId);
      const ids = snap().sets.find((x) => x.id === setId)?.cards.map((c) => c.id) ?? [];
      run("초기화", async () => {
        await writeProgress(ids);
        await writeState();
      });
    },
    saveLearn(setId, state) {
      cache.saveLearn(setId, state);
      run("학습", writeState);
    },
    recordMatch(setId, ms) {
      const best = cache.recordMatch(setId, ms);
      if (best) run("매칭 기록", writeState);
      return best;
    },
    exportAll: cache.exportAll,
    importAll(json) {
      cache.importAll(json);
      run("백업", async () => {
        await ok(sb.from("study_sets").delete().eq("user_id", userId));
        const s = snap();
        for (const set of s.sets) await writeSet(set);
        await writeProgress(Object.keys(s.progress));
        await writeState();
      });
    },
  };

  /** Add sets from elsewhere (this browser's local data, samples) under new ids. */
  function addSets(sets: { title: string; description: string; cards: { term: string; definition: string }[] }[]) {
    for (const s of sets) repo.createSet({ title: s.title, description: s.description, visibility: "private", cards: s.cards });
  }

  return { repo, pull, pushAll, addSets };
}
