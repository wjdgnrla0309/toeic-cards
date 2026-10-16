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


describe("850+ word book", () => {
  it("is one set without repeated words or identical meanings", async () => {
    const { libraryCards, librarySet } = await import("../../data/library");
    expect(librarySet.cards.length).toBe(libraryCards.length);
    expect(new Set(libraryCards.map((c) => c.term)).size).toBe(libraryCards.length);
    expect(new Set(libraryCards.map((c) => c.definition)).size).toBe(libraryCards.length);
    const purchase = libraryCards.find((c) => c.term === "purchase")!;
    expect(purchase.definition).toBe("구매, 구매하다 (= buy)");
    expect(gradeWritten("구매하다", purchase.definition)).toBe("correct");
  });

  it("folds the old topic sets into one and keeps progress", async () => {
    const { mergeSplitLibrary, LIBRARY_TITLE } = await import("../../data/library");
    const t = "2026-10-16T00:00:00.000Z";
    const mk = (id: string, title: string, cards: [string, string, string][]) => ({
      id, title, description: "", visibility: "private" as const, createdAt: t, updatedAt: t,
      cards: cards.map(([cid, term, definition]) => ({ id: cid, term, definition })),
    });
    const snap = {
      sets: [
        mk("mine", "내 세트", [["m1", "a", "1"]]),
        mk("h", `${LIBRARY_TITLE} | 회의·사무`, [["c1", "postpone", "연기하다, 미루다"], ["c9", "myword", "내가 넣은 단어"]]),
        mk("p7", `${LIBRARY_TITLE} | Part 7 동의어 바꿔 쓰기`, [["c2", "postpone", "연기하다 (= put off, delay)"]]),
      ],
      progress: {
        c1: { cardId: "c1", correctStreak: 2, timesSeen: 3, starred: true, mastery: "mastered" as const },
        c2: { cardId: "c2", correctStreak: 1, timesSeen: 1, starred: false, mastery: "learning" as const },
        m1: { cardId: "m1", correctStreak: 0, timesSeen: 1, starred: false, mastery: "learning" as const },
      },
      learn: { h: {} as never, mine: {} as never },
      matchBest: { p7: 1000 },
    };
    let n = 0;
    const next = mergeSplitLibrary(snap, () => `new${++n}`)!;
    expect(next.sets.map((s) => s.title)).toEqual(["내 세트", LIBRARY_TITLE]);
    const book = next.sets[1];
    const postpone = book.cards.find((c) => c.term === "postpone")!;
    expect(postpone.id).toBe("c1");
    expect(next.progress.c1.mastery).toBe("mastered");
    expect(next.progress.c2).toBeUndefined(); // duplicate card dropped
    expect(next.progress.m1).toBeDefined(); // other sets untouched
    expect(book.cards.at(-1)).toMatchObject({ id: "c9", term: "myword" }); // user's own word kept
    expect(Object.keys(next.learn)).toEqual(["mine"]);
    expect(next.matchBest).toEqual({});
    expect(mergeSplitLibrary(next)).toBeNull();
  });
});
