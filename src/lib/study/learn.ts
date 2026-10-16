import type { Card } from "../types";
import { pickDistinct, shuffle, type Rng } from "./random";

/**
 * Learn: every card must be answered correctly twice.
 * First correct answer is multiple choice, the second is written.
 * Cards are studied in rounds of ROUND_SIZE; a wrong answer puts the card
 * back at the end of the current round.
 */
export const ROUND_SIZE = 7;
export const GOAL = 2;

export interface LearnState {
  order: string[];                 // all card ids, study order
  correct: Record<string, number>; // 0..GOAL
  queue: string[];                 // remaining questions in this round
  roundCards: string[];            // cards in this round (for the summary)
  round: number;
  /** Prompt side: "term" shows the English word and asks for the meaning. */
  prompt: "term" | "definition";
}

export type LearnQuestion =
  | { kind: "mc"; cardId: string; prompt: string; options: string[]; answer: string }
  | { kind: "written"; cardId: string; prompt: string; answer: string };

export function startLearn(
  cards: Card[],
  opts: { shuffle?: boolean; prompt?: "term" | "definition"; rng?: Rng; onlyIds?: string[] } = {},
): LearnState {
  let ids = cards.map((c) => c.id);
  if (opts.onlyIds?.length) ids = ids.filter((id) => opts.onlyIds!.includes(id));
  if (opts.shuffle) ids = shuffle(ids, opts.rng);
  const correct = Object.fromEntries(ids.map((id) => [id, 0]));
  const s: LearnState = { order: ids, correct, queue: [], roundCards: [], round: 0, prompt: opts.prompt ?? "term" };
  return nextRound(s);
}

export function remaining(s: LearnState): string[] {
  return s.order.filter((id) => (s.correct[id] ?? 0) < GOAL);
}

export function isDone(s: LearnState): boolean {
  return remaining(s).length === 0;
}

export function isRoundOver(s: LearnState): boolean {
  return s.queue.length === 0;
}

export function nextRound(s: LearnState): LearnState {
  // Cards with fewer correct answers first, keeping study order otherwise.
  const left = remaining(s).sort((a, b) => (s.correct[a] ?? 0) - (s.correct[b] ?? 0));
  const roundCards = left.slice(0, ROUND_SIZE);
  return { ...s, queue: roundCards.slice(), roundCards, round: s.round + 1 };
}

export function progress(s: LearnState): { done: number; total: number } {
  const total = s.order.length * GOAL;
  const done = s.order.reduce((n, id) => n + Math.min(GOAL, s.correct[id] ?? 0), 0);
  return { done, total };
}

export function currentQuestion(s: LearnState, cards: Card[], rng?: Rng): LearnQuestion | null {
  const id = s.queue[0];
  if (!id) return null;
  const card = cards.find((c) => c.id === id);
  if (!card) return null;
  const fromTerm = s.prompt === "term";
  const prompt = fromTerm ? card.term : card.definition;
  const answer = fromTerm ? card.definition : card.term;
  const pool = cards.map((c) => (fromTerm ? c.definition : c.term));
  const distractors = pickDistinct(pool, 3, answer, rng);
  if ((s.correct[id] ?? 0) === 0 && distractors.length >= 1) {
    return { kind: "mc", cardId: id, prompt, answer, options: shuffle([answer, ...distractors], rng) };
  }
  return { kind: "written", cardId: id, prompt, answer };
}

export function answer(s: LearnState, cardId: string, wasCorrect: boolean): LearnState {
  if (s.queue[0] !== cardId) return s;
  const rest = s.queue.slice(1);
  const correct = { ...s.correct };
  if (wasCorrect) {
    correct[cardId] = Math.min(GOAL, (correct[cardId] ?? 0) + 1);
    return { ...s, correct, queue: rest };
  }
  return { ...s, correct, queue: [...rest, cardId] };
}
