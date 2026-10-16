"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/Button";
import { BackLink } from "@/components/ui";
import { WithSet } from "@/components/WithSet";
import { repo } from "@/lib/data";
import type { Snapshot } from "@/lib/data/repo";
import { buildBoard, canPlay, isPair, PENALTY_MS, type Tile } from "@/lib/study/match";
import type { StudySet } from "@/lib/types";

export default function MatchPage() {
  return <WithSet>{(set, data) => <Match set={set} data={data} />}</WithSet>;
}

const clock = () => performance.now();
const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}초`;

function Match({ set, data }: { set: StudySet; data: Snapshot }) {
  const [phase, setPhase] = useState<"ready" | "play" | "done">("ready");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [penalty, setPenalty] = useState(0);
  const [now, setNow] = useState(0);
  const [final, setFinal] = useState<{ ms: number; best: boolean } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const best = data.matchBest[set.id];

  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setNow(clock()), 100);
    return () => clearInterval(t);
  }, [phase]);

  function start() {
    setTiles(buildBoard(set.cards));
    setGone(new Set());
    setSelected(null);
    setWrong([]);
    setPenalty(0);
    setFinal(null);
    const t0 = clock();
    setStartedAt(t0);
    setNow(t0);
    setPhase("play");
    repo.touchStudied(set.id);
  }

  function pick(t: Tile) {
    if (gone.has(t.id)) return;
    if (!selected) {
      setSelected(t);
      return;
    }
    if (selected.id === t.id) {
      setSelected(null);
      return;
    }
    if (isPair(selected, t)) {
      const next = new Set(gone).add(selected.id).add(t.id);
      setGone(next);
      setSelected(null);
      if (next.size === tiles.length) {
        const ms = Math.round(clock() - startedAt + penalty);
        const isBest = repo.recordMatch(set.id, ms);
        setFinal({ ms, best: isBest });
        setPhase("done");
      }
    } else {
      setWrong([selected.id, t.id]);
      setPenalty((p) => p + PENALTY_MS);
      setSelected(null);
      setTimeout(() => setWrong([]), 350);
    }
  }

  const elapsed = phase === "play" ? now - startedAt + penalty : 0;

  return (
    <div>
      <BackLink href={`/set?id=${set.id}`}>{set.title}</BackLink>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">매칭</h1>
        {phase === "play" && (
          <p className="font-mono text-lg font-semibold" aria-hidden>
            {fmt(elapsed)}
          </p>
        )}
      </div>

      {!canPlay(set.cards) ? (
        <p className="rounded-lg bg-surface p-8 text-center text-muted">매칭 게임을 하려면 단어가 2개 이상 필요해요.</p>
      ) : phase === "ready" ? (
        <div className="rounded-lg bg-surface p-10 text-center">
          <p className="text-lg font-semibold">단어와 뜻의 짝을 최대한 빨리 맞혀 보세요.</p>
          <p className="mt-1 text-sm text-muted">틀리면 {PENALTY_MS / 1000}초가 더해져요.{best !== undefined && ` 내 최고 기록: ${fmt(best)}`}</p>
          <Button size="lg" className="mt-5" onClick={start} autoFocus>
            시작
          </Button>
        </div>
      ) : phase === "done" && final ? (
        <div role="status" className="rounded-lg bg-success-soft p-10 text-center">
          {final.best && (
            <p className="mb-2 flex items-center justify-center gap-2 font-semibold text-success">
              <Trophy aria-hidden className="size-5" /> 최고 기록!
            </p>
          )}
          <p className="text-[40px] font-bold leading-[48px]">{fmt(final.ms)}</p>
          {!final.best && best !== undefined && <p className="mt-1 text-sm text-muted">최고 기록 {fmt(best)}</p>}
          <Button className="mt-5" onClick={start} autoFocus>
            다시 하기
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((t) => {
            const isGone = gone.has(t.id);
            const isSel = selected?.id === t.id;
            const isWrong = wrong.includes(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={isGone}
                  aria-pressed={isSel}
                  aria-label={isGone ? "맞힌 카드" : t.text}
                  onClick={() => pick(t)}
                  className={`flex h-24 w-full items-center justify-center rounded-lg border-2 p-3 text-center font-medium transition-opacity duration-[var(--motion-base)] sm:h-28 ${
                    isGone
                      ? "pointer-events-none opacity-0"
                      : isWrong
                        ? "shake border-danger bg-danger-soft"
                        : isSel
                          ? "border-accent bg-accent-soft"
                          : "border-border bg-bg hover:bg-surface"
                  }`}
                >
                  <span lang={t.side === "term" ? "en" : "ko"} className="break-words">
                    {t.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
