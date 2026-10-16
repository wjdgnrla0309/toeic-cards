import { describe, expect, it } from "vitest";
import type { Card } from "../../types";
import { gradeWritten, normalize } from "../text";
import { guessTermSep, parseImport } from "../importText";
import { answer, currentQuestion, GOAL, isDone, isRoundOver, nextRound, progress, ROUND_SIZE, startLearn } from "../learn";
import { availableTypes, buildTest, gradeTest } from "../testGen";
import { buildBoard, canPlay, isPair } from "../match";
import { seeded } from "../random";
import { createLocalRepo } from "../../data/local";

const cards = (n: number): Card[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, term: `word${i}`, definition: `뜻${i}` }));

describe("gradeWritten", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(gradeWritten("  Postpone. ", "postpone")).toBe("correct");
    expect(normalize("품질 보증(서)")).toBe("품질 보증");
  });
  it("accepts any one of several meanings", () => {
    expect(gradeWritten("미루다", "연기하다, 미루다")).toBe("correct");
    expect(gradeWritten("연기하다, 미루다", "연기하다, 미루다")).toBe("correct");
  });
  it("allows small typos on longer words only", () => {
    expect(gradeWritten("recieve", "receive")).toBe("close");
    expect(gradeWritten("cat", "car")).toBe("wrong");
    expect(gradeWritten("", "x")).toBe("wrong");
  });
});

describe("parseImport", () => {
  it("splits on the first separator only", () => {
    const { rows } = parseImport("postpone, 연기하다, 미루다\nsubmit, 제출하다", { termSep: "comma", rowSep: "newline" });
    expect(rows).toEqual([
      { term: "postpone", definition: "연기하다, 미루다" },
      { term: "submit", definition: "제출하다" },
    ]);
  });
  it("skips blank rows and counts rows without a separator", () => {
    const r = parseImport("a\t1\n\nno separator\nb\t2", { termSep: "tab", rowSep: "newline" });
    expect(r.rows).toHaveLength(2);
    expect(r.skipped).toBe(1);
  });
  it("supports semicolon rows and custom separators", () => {
    const r = parseImport("a=1;b=2;", { termSep: "custom", customTerm: "=", rowSep: "semicolon" });
    expect(r.rows.map((x) => x.term)).toEqual(["a", "b"]);
  });
  it("guesses the separator", () => {
    expect(guessTermSep("a\t1\nb\t2")).toBe("tab");
    expect(guessTermSep("a - 1\nb - 2")).toBe("dash");
    expect(guessTermSep("a,1\nb,2")).toBe("comma");
  });
});

describe("learn", () => {
  it("finishes only after every card is right twice, MC first then written", () => {
    const deck = cards(10);
    const rng = seeded(1);
    let s = startLearn(deck, { rng });
    expect(s.queue).toHaveLength(ROUND_SIZE);
    const kinds: Record<string, string[]> = {};
    let guard = 0;
    while (!isDone(s) && guard++ < 500) {
      if (isRoundOver(s)) s = nextRound(s);
      const q = currentQuestion(s, deck, rng)!;
      (kinds[q.cardId] ??= []).push(q.kind);
      s = answer(s, q.cardId, true);
    }
    expect(isDone(s)).toBe(true);
    expect(progress(s)).toEqual({ done: 10 * GOAL, total: 10 * GOAL });
    for (const k of Object.values(kinds)) expect(k).toEqual(["mc", "written"]);
  });
  it("puts a wrong card back at the end of the round", () => {
    const deck = cards(3);
    let s = startLearn(deck);
    const first = s.queue[0];
    s = answer(s, first, false);
    expect(s.queue[s.queue.length - 1]).toBe(first);
    expect(s.correct[first]).toBe(0);
  });
  it("ignores an answer for a card that is not current", () => {
    const s = startLearn(cards(3));
    expect(answer(s, s.queue[1], true)).toBe(s);
  });
  it("uses written questions when there are no distractors", () => {
    const deck = cards(1);
    const s = startLearn(deck);
    expect(currentQuestion(s, deck)!.kind).toBe("written");
  });
  it("mc options contain the answer once and no duplicates", () => {
    const deck = cards(8);
    const s = startLearn(deck, { rng: seeded(3) });
    const q = currentQuestion(s, deck, seeded(4))!;
    if (q.kind !== "mc") throw new Error("expected mc");
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
  });
});

describe("test", () => {
  it("caps the question count at the number of cards", () => {
    const qs = buildTest(cards(5), { count: 20, types: ["written"], prompt: "term" }, seeded(1));
    expect(qs).toHaveLength(5);
  });
  it("drops types the set cannot support", () => {
    expect(availableTypes(cards(3))).toEqual({ written: true, mc: false, tf: true, matching: false });
    const qs = buildTest(cards(3), { count: 3, types: ["mc", "matching"], prompt: "term" });
    expect(qs).toEqual([]);
  });
  it("mixes types and grades a perfect paper as full marks", () => {
    const deck = cards(20);
    const qs = buildTest(deck, { count: 20, types: ["written", "mc", "tf", "matching"], prompt: "term" }, seeded(9));
    const kinds = new Set(qs.map((q) => q.kind));
    expect(kinds).toEqual(new Set(["written", "mc", "tf", "matching"]));
    const used = qs.flatMap((q) => (q.kind === "matching" ? q.cardIds : [q.cardId]));
    expect(new Set(used).size).toBe(20);
    const answers = Object.fromEntries(
      qs.map((q) => [
        q.id,
        q.kind === "matching" ? q.answers : q.kind === "tf" ? q.isTrue : q.answer,
      ]),
    );
    const r = gradeTest(qs, answers);
    expect(r.score).toBe(r.total);
    expect(r.total).toBe(20);
    expect(r.wrongCardIds).toEqual([]);
  });
  it("marks unanswered questions wrong", () => {
    const deck = cards(4);
    const qs = buildTest(deck, { count: 4, types: ["mc"], prompt: "definition" }, seeded(2));
    const r = gradeTest(qs, {});
    expect(r.score).toBe(0);
    expect(r.wrongCardIds).toHaveLength(4);
  });
});

describe("match", () => {
  it("builds pairs and skips duplicate terms", () => {
    const deck = [...cards(8), { id: "dup", term: "word0", definition: "다른 뜻" }];
    const board = buildBoard(deck, seeded(5));
    expect(board).toHaveLength(12);
    const t = board.find((x) => x.side === "term")!;
    const d = board.find((x) => x.cardId === t.cardId && x.side === "definition")!;
    expect(isPair(t, d)).toBe(true);
    expect(isPair(t, t)).toBe(false);
  });
  it("needs at least two usable cards", () => {
    expect(canPlay(cards(1))).toBe(false);
    expect(canPlay(cards(2))).toBe(true);
  });
});

describe("local repo", () => {
  function memory() {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  }
  it("seeds sample sets on first load and persists changes", () => {
    const st = memory();
    const r = createLocalRepo(st);
    expect(r.getSnapshot()!.sets.length).toBe(3);
    const id = r.createSet({ title: "내 단어", description: "", visibility: "private", cards: [{ term: "a", definition: "1" }, { term: "", definition: "" }] });
    const again = createLocalRepo(st).getSnapshot()!;
    const set = again.sets.find((s) => s.id === id)!;
    expect(set.cards).toHaveLength(1); // blank row dropped
  });
  it("tracks mastery and keeps stars on reset", () => {
    const r = createLocalRepo(memory());
    const set = r.getSnapshot()!.sets[0];
    const cid = set.cards[0].id;
    r.toggleStar(cid);
    r.recordAnswer(cid, true);
    r.recordAnswer(cid, true);
    expect(r.getSnapshot()!.progress[cid].mastery).toBe("mastered");
    r.recordAnswer(cid, false);
    expect(r.getSnapshot()!.progress[cid]).toMatchObject({ mastery: "learning", correctStreak: 0 });
    r.resetProgress(set.id);
    expect(r.getSnapshot()!.progress[cid]).toMatchObject({ mastery: "new", starred: true });
  });
  it("keeps only the best match time", () => {
    const r = createLocalRepo(memory());
    const id = r.getSnapshot()!.sets[0].id;
    expect(r.recordMatch(id, 20000)).toBe(true);
    expect(r.recordMatch(id, 25000)).toBe(false);
    expect(r.recordMatch(id, 15000)).toBe(true);
    expect(r.getSnapshot()!.matchBest[id]).toBe(15000);
  });
  it("round-trips a backup and rejects junk", () => {
    const a = createLocalRepo(memory());
    a.createSet({ title: "백업", description: "", visibility: "private", cards: [{ term: "x", definition: "y" }] });
    const b = createLocalRepo(memory());
    b.importAll(a.exportAll());
    expect(b.getSnapshot()!.sets.map((s) => s.title)).toContain("백업");
    expect(() => b.importAll('{"nope":1}')).toThrow();
  });
  it("deleting a set removes its progress", () => {
    const r = createLocalRepo(memory());
    const set = r.getSnapshot()!.sets[0];
    r.recordAnswer(set.cards[0].id, true);
    r.deleteSet(set.id);
    expect(r.getSnapshot()!.progress[set.cards[0].id]).toBeUndefined();
  });
});
