"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle, Star } from "lucide-react";
import { Button } from "@/components/Button";
import { BackLink, ProgressBar, SpeakButton } from "@/components/ui";
import { WithSet } from "@/components/WithSet";
import { repo } from "@/lib/data";
import type { Snapshot } from "@/lib/data/repo";
import { shuffle } from "@/lib/study/random";
import type { StudySet } from "@/lib/types";

export default function FlashcardsPage() {
  return <WithSet>{(set, data) => <Flashcards set={set} data={data} />}</WithSet>;
}

function Flashcards({ set, data }: { set: StudySet; data: Snapshot }) {
  const [order, setOrder] = useState(() => set.cards.map((c) => c.id));
  const [starredOnly, setStarredOnly] = useState(false);
  const [front, setFront] = useState<"term" | "definition">("term");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const deck = useMemo(() => {
    const byId = new Map(set.cards.map((c) => [c.id, c]));
    return order
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c && (!starredOnly || !!data.progress[c.id]?.starred));
  }, [order, set.cards, starredOnly, data.progress]);

  const done = i >= deck.length;
  const card = deck[Math.min(i, deck.length - 1)];

  useEffect(() => {
    repo.touchStudied(set.id);
  }, [set.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if ((e.key === " " || e.key === "Enter") && (e.target as HTMLElement).id !== "flip") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key.toLowerCase() === "s" && card) repo.toggleStar(card.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function go(d: 1 | -1) {
    setFlipped(false);
    setI((x) => Math.max(0, Math.min(deck.length, x + d)));
  }

  const restart = (shuffled: boolean) => {
    setOrder(shuffled ? shuffle(set.cards.map((c) => c.id)) : set.cards.map((c) => c.id));
    setI(0);
    setFlipped(false);
  };

  return (
    <div>
      <BackLink href={`/sets/${set.id}`}>{set.title}</BackLink>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">카드</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Button variant="secondary" size="sm" onClick={() => restart(true)}>
            <Shuffle aria-hidden className="size-4" /> 섞기
          </Button>
          <Button variant="secondary" size="sm" aria-pressed={front === "definition"} onClick={() => { setFront((f) => (f === "term" ? "definition" : "term")); setFlipped(false); }}>
            앞면: {front === "term" ? "영어" : "뜻"}
          </Button>
          <Button variant="secondary" size="sm" aria-pressed={starredOnly} onClick={() => { setStarredOnly((s) => !s); setI(0); setFlipped(false); }}>
            <Star aria-hidden className="size-4" fill={starredOnly ? "currentColor" : "none"} /> 별표만
          </Button>
        </div>
      </div>

      <ProgressBar value={Math.min(i, deck.length)} max={deck.length} label="카드 진행" />
      <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
        {deck.length ? `${Math.min(i + 1, deck.length)} / ${deck.length}` : "0 / 0"}
      </p>

      {deck.length === 0 ? (
        <div className="mt-6 rounded-lg bg-surface p-10 text-center">
          <p className="font-semibold">별표한 단어가 없어요.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setStarredOnly(false)}>
            전체 보기
          </Button>
        </div>
      ) : done ? (
        <div className="mt-6 rounded-lg bg-surface p-10 text-center">
          <p className="text-lg font-semibold">{deck.length}장을 모두 봤어요.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => restart(false)}>처음부터</Button>
            <Button variant="secondary" onClick={() => restart(true)}>섞어서 다시</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flip-scene mt-4">
            <button
              id="flip"
              type="button"
              aria-pressed={flipped}
              aria-label={`카드 뒤집기. ${flipped ? "뒷면" : "앞면"}`}
              onClick={() => setFlipped((f) => !f)}
              className="flip-inner relative block h-72 w-full rounded-lg sm:h-80"
              data-flipped={flipped}
            >
              {(["front", "back"] as const).map((side) => {
                const showTerm = (side === "front") === (front === "term");
                const text = showTerm ? card.term : card.definition;
                return (
                  <span
                    key={side}
                    aria-hidden={(side === "back") !== flipped}
                    className={`flip-face absolute inset-0 flex items-center justify-center rounded-lg border border-border bg-bg p-6 shadow-card ${side === "back" ? "flip-back" : ""}`}
                  >
                    <span lang={showTerm ? "en" : "ko"} className={`break-words text-center ${showTerm ? "text-3xl font-bold sm:text-[40px] sm:leading-[48px]" : "text-2xl font-semibold"}`}>
                      {text}
                    </span>
                  </span>
                );
              })}
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {flipped ? (front === "term" ? card.definition : card.term) : ""}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="secondary" onClick={() => go(-1)} disabled={i === 0} aria-label="이전 카드">
              <ChevronLeft aria-hidden className="size-5" />
            </Button>
            <div className="flex items-center gap-1">
              <SpeakButton text={card.term} />
              <button
                type="button"
                aria-pressed={!!data.progress[card.id]?.starred}
                aria-label="별표"
                onClick={() => repo.toggleStar(card.id)}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface aria-pressed:text-warning"
              >
                <Star aria-hidden className="size-5" fill={data.progress[card.id]?.starred ? "currentColor" : "none"} />
              </button>
            </div>
            <Button onClick={() => go(1)} aria-label="다음 카드">
              <ChevronRight aria-hidden className="size-5" />
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">스페이스: 뒤집기 · ←/→: 이동 · S: 별표</p>
        </>
      )}
    </div>
  );
}
