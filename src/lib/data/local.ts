import type { CardProgress, SetDraft, StudySet } from "../types";
import type { Repo, Snapshot } from "./repo";
import { seedSets } from "./seed";

export const LOCAL_KEY = "toeic-cards:v1";

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowIso(): string {
  return new Date().toISOString();
}

function fromDraft(draft: SetDraft, base?: StudySet): StudySet {
  const t = nowIso();
  return {
    id: base?.id ?? uid(),
    title: draft.title.trim() || "제목 없는 세트",
    description: draft.description.trim(),
    visibility: draft.visibility,
    cards: draft.cards
      .filter((c) => c.term.trim() || c.definition.trim())
      .map((c) => ({ id: c.id ?? uid(), term: c.term.trim(), definition: c.definition.trim(), imageUrl: c.imageUrl })),
    createdAt: base?.createdAt ?? t,
    updatedAt: t,
    lastStudiedAt: base?.lastStudiedAt,
  };
}

function empty(): Snapshot {
  return { sets: [], progress: {}, learn: {}, matchBest: {} };
}

function isSnapshot(v: unknown): v is Snapshot {
  const s = v as Snapshot;
  return !!s && Array.isArray(s.sets) && typeof s.progress === "object" && typeof s.learn === "object";
}

export interface LocalOptions {
  key?: string;
  /** Fill an empty store with the sample sets (off for the cloud cache). */
  seed?: boolean;
}

export function createLocalRepo(storage?: Pick<Storage, "getItem" | "setItem">, opts: LocalOptions = {}): Repo {
  const KEY = opts.key ?? LOCAL_KEY;
  const withSeed = opts.seed ?? true;
  let snap: Snapshot | null = null;
  const listeners = new Set<() => void>();
  const store = () => storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);

  function load(): Snapshot | null {
    if (snap) return snap;
    const st = store();
    if (!st) return null;
    try {
      const parsed = JSON.parse(st.getItem(KEY) ?? "null");
      if (isSnapshot(parsed)) {
        snap = { ...empty(), ...parsed };
        return snap;
      }
    } catch {
      // corrupt data: fall through to a fresh start
    }
    snap = empty();
    if (withSeed) snap.sets = seedSets.map((d) => fromDraft(d));
    persist();
    return snap;
  }

  function persist() {
    try {
      store()?.setItem(KEY, JSON.stringify(snap));
    } catch {
      // storage full or blocked: keep working in memory
    }
  }

  function commit(next: Snapshot) {
    snap = next;
    persist();
    listeners.forEach((l) => l());
  }

  function must(): Snapshot {
    const s = load();
    if (!s) throw new Error("storage not available");
    return s;
  }

  function setProgress(s: Snapshot, cardId: string, fn: (p: CardProgress) => CardProgress): Snapshot {
    const cur = s.progress[cardId] ?? { cardId, correctStreak: 0, timesSeen: 0, starred: false, mastery: "new" as const };
    return { ...s, progress: { ...s.progress, [cardId]: fn(cur) } };
  }

  // Keep tabs in sync.
  if (typeof window !== "undefined" && !storage) {
    window.addEventListener("storage", (e) => {
      if (e.key !== KEY) return;
      snap = null;
      load();
      listeners.forEach((l) => l());
    });
  }

  return {
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot: load,
    createSet(draft) {
      const s = must();
      const set = fromDraft(draft);
      commit({ ...s, sets: [set, ...s.sets] });
      return set.id;
    },
    updateSet(id, draft) {
      const s = must();
      const base = s.sets.find((x) => x.id === id);
      if (!base) throw new Error("set not found");
      const next = fromDraft(draft, base);
      const kept = new Set(next.cards.map((c) => c.id));
      const progress = Object.fromEntries(
        Object.entries(s.progress).filter(([cid]) => kept.has(cid) || !base.cards.some((c) => c.id === cid)),
      );
      const learn = { ...s.learn };
      delete learn[id]; // cards changed: an unfinished Learn session would point at stale cards
      commit({ ...s, progress, learn, sets: s.sets.map((x) => (x.id === id ? next : x)) });
    },
    deleteSet(id) {
      const s = must();
      const set = s.sets.find((x) => x.id === id);
      const ids = new Set(set?.cards.map((c) => c.id));
      const learn = { ...s.learn };
      delete learn[id];
      const matchBest = { ...s.matchBest };
      delete matchBest[id];
      commit({
        ...s,
        sets: s.sets.filter((x) => x.id !== id),
        progress: Object.fromEntries(Object.entries(s.progress).filter(([cid]) => !ids.has(cid))),
        learn,
        matchBest,
      });
    },
    touchStudied(id) {
      const s = must();
      const t = nowIso();
      commit({ ...s, sets: s.sets.map((x) => (x.id === id ? { ...x, lastStudiedAt: t } : x)) });
    },
    toggleStar(cardId) {
      commit(setProgress(must(), cardId, (p) => ({ ...p, starred: !p.starred })));
    },
    recordAnswer(cardId, correct) {
      commit(
        setProgress(must(), cardId, (p) => {
          const correctStreak = correct ? p.correctStreak + 1 : 0;
          return {
            ...p,
            correctStreak,
            timesSeen: p.timesSeen + 1,
            mastery: correctStreak >= 2 ? "mastered" : "learning",
            lastSeenAt: nowIso(),
          };
        }),
      );
    },
    resetProgress(setId) {
      const s = must();
      const set = s.sets.find((x) => x.id === setId);
      if (!set) return;
      const progress = { ...s.progress };
      for (const c of set.cards) {
        const p = progress[c.id];
        if (p) progress[c.id] = { cardId: c.id, correctStreak: 0, timesSeen: 0, starred: p.starred, mastery: "new" };
      }
      const learn = { ...s.learn };
      delete learn[setId];
      commit({ ...s, progress, learn });
    },
    saveLearn(setId, state) {
      const s = must();
      const learn = { ...s.learn };
      if (state) learn[setId] = state;
      else delete learn[setId];
      commit({ ...s, learn });
    },
    recordMatch(setId, ms) {
      const s = must();
      const best = s.matchBest[setId];
      if (best !== undefined && best <= ms) return false;
      commit({ ...s, matchBest: { ...s.matchBest, [setId]: ms } });
      return true;
    },
    exportAll() {
      return JSON.stringify(must(), null, 2);
    },
    importAll(json) {
      const parsed = JSON.parse(json);
      if (!isSnapshot(parsed)) throw new Error("올바른 백업 파일이 아닙니다.");
      commit({ ...empty(), ...parsed });
    },
  };
}
