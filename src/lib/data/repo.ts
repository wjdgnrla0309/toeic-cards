import type { CardProgress, SetDraft, StudySet } from "../types";
import type { LearnState } from "../study/learn";

/**
 * The data layer every screen uses. The local implementation keeps data in
 * the browser; replica-backend swaps in a Supabase one with the same shape.
 */
export interface Snapshot {
  sets: StudySet[];
  progress: Record<string, CardProgress>; // by card id
  learn: Record<string, LearnState>;      // unfinished Learn session by set id
  matchBest: Record<string, number>;      // best Match time (ms) by set id
}

export interface Repo {
  subscribe(listener: () => void): () => void;
  getSnapshot(): Snapshot | null; // null until loaded
  createSet(draft: SetDraft): string;
  updateSet(id: string, draft: SetDraft): void;
  deleteSet(id: string): void;
  touchStudied(id: string): void;
  toggleStar(cardId: string): void;
  recordAnswer(cardId: string, correct: boolean): void;
  resetProgress(setId: string): void;
  saveLearn(setId: string, state: LearnState | null): void;
  recordMatch(setId: string, ms: number): boolean; // true when a new best
  exportAll(): string;
  importAll(json: string): void;
}
