import type { Card } from "../types";
import { pickDistinct, shuffle, type Rng } from "./random";
import { gradeWritten } from "./text";

export type QType = "written" | "mc" | "tf" | "matching";

export const DEFAULT_COUNT = 20;

export type TestQuestion =
  | { kind: "written"; id: string; cardId: string; prompt: string; answer: string }
  | { kind: "mc"; id: string; cardId: string; prompt: string; options: string[]; answer: string }
  | { kind: "tf"; id: string; cardId: string; prompt: string; shown: string; isTrue: boolean; answer: string }
  | { kind: "matching"; id: string; cardIds: string[]; prompts: string[]; options: string[]; answers: string[] };

export interface TestConfig {
  count: number;
  types: QType[];
  prompt: "term" | "definition";
}

/** Which types the set can support. MC needs 4 distinct answers, matching 4 cards, T/F 2. */
export function availableTypes(cards: Card[]): Record<QType, boolean> {
  const n = cards.length;
  const distinctDefs = new Set(cards.map((c) => c.definition.trim())).size;
  return { written: n >= 1, mc: distinctDefs >= 4, tf: n >= 2, matching: n >= 4 };
}

export function buildTest(cards: Card[], cfg: TestConfig, rng: Rng = Math.random): TestQuestion[] {
  const avail = availableTypes(cards);
  const types = cfg.types.filter((t) => avail[t]);
  if (!types.length || !cards.length) return [];
  const count = Math.max(1, Math.min(cfg.count, cards.length));
  const picked = shuffle(cards, rng).slice(0, count);
  const fromTerm = cfg.prompt === "term";
  const p = (c: Card) => (fromTerm ? c.term : c.definition);
  const a = (c: Card) => (fromTerm ? c.definition : c.term);
  const pool = cards.map(a);

  // Matching takes groups of 4 cards; the others take one card each.
  const nonMatching = types.filter((t) => t !== "matching");
  const wantMatching = types.includes("matching");
  let matchCount = 0;
  if (wantMatching && picked.length >= 4) {
    const share = nonMatching.length ? Math.floor(picked.length / types.length) : picked.length;
    matchCount = Math.max(4, Math.floor(share / 4) * 4);
  }
  const matchCards = picked.slice(0, matchCount);
  const singles = picked.slice(matchCards.length);

  const out: TestQuestion[] = [];
  singles.forEach((c, i) => {
    const kind = nonMatching.length ? nonMatching[i % nonMatching.length] : "written";
    const id = `q${out.length + 1}`;
    if (kind === "mc") {
      out.push({ kind, id, cardId: c.id, prompt: p(c), answer: a(c), options: shuffle([a(c), ...pickDistinct(pool, 3, a(c), rng)], rng) });
    } else if (kind === "tf") {
      const isTrue = rng() < 0.5;
      const wrong = pickDistinct(pool, 1, a(c), rng)[0];
      const truthy = isTrue || !wrong;
      out.push({ kind, id, cardId: c.id, prompt: p(c), shown: truthy ? a(c) : wrong, isTrue: truthy, answer: a(c) });
    } else {
      out.push({ kind: "written", id, cardId: c.id, prompt: p(c), answer: a(c) });
    }
  });
  for (let i = 0; i + 4 <= matchCards.length; i += 4) {
    const g = matchCards.slice(i, i + 4);
    out.push({
      kind: "matching",
      id: `q${out.length + 1}`,
      cardIds: g.map((c) => c.id),
      prompts: g.map(p),
      answers: g.map(a),
      options: shuffle(g.map(a), rng),
    });
  }
  return out;
}

export type Answers = Record<string, string | boolean | string[] | undefined>;

export interface TestResult {
  score: number;
  total: number;
  perQuestion: Record<string, boolean>;
  wrongCardIds: string[];
}

export function gradeTest(qs: TestQuestion[], answers: Answers): TestResult {
  let score = 0;
  let total = 0;
  const perQuestion: Record<string, boolean> = {};
  const wrong = new Set<string>();
  for (const q of qs) {
    const given = answers[q.id];
    if (q.kind === "matching") {
      const arr = Array.isArray(given) ? given : [];
      q.answers.forEach((ans, i) => {
        total++;
        const ok = arr[i] === ans;
        if (ok) score++;
        else wrong.add(q.cardIds[i]);
      });
      perQuestion[q.id] = q.answers.every((ans, i) => arr[i] === ans);
      continue;
    }
    total++;
    let ok = false;
    if (q.kind === "written") ok = typeof given === "string" && gradeWritten(given, q.answer) !== "wrong";
    if (q.kind === "mc") ok = given === q.answer;
    if (q.kind === "tf") ok = given === q.isTrue;
    perQuestion[q.id] = ok;
    if (ok) score++;
    else wrong.add(q.cardId);
  }
  return { score, total, perQuestion, wrongCardIds: [...wrong] };
}
