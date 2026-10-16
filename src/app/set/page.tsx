"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpenCheck, ChevronRight, Copy, Gamepad2, Layers, ListChecks, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { toast } from "@/components/Toast";
import { BackLink, MasteryRing, ProgressBar, Sheet, SpeakButton } from "@/components/ui";
import { WithSet } from "@/components/WithSet";
import { repo } from "@/lib/data";
import type { Mastery } from "@/lib/types";

const masteryLabel: Record<Mastery, string> = { new: "처음", learning: "학습 중", mastered: "외움" };
const masteryClass: Record<Mastery, string> = {
  new: "bg-surface-2 text-muted",
  learning: "bg-accent-soft text-accent",
  mastered: "bg-success-soft text-success",
};

export default function SetPage() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<"all" | "starred" | "notMastered">("all");

  return (
    <WithSet>
      {(set, data) => {
        const prog = (id: string) => data.progress[id];
        const mastered = set.cards.filter((c) => prog(c.id)?.mastery === "mastered").length;
        const starred = set.cards.filter((c) => prog(c.id)?.starred).length;
        const shown = set.cards.filter((c) =>
          filter === "starred" ? prog(c.id)?.starred : filter === "notMastered" ? prog(c.id)?.mastery !== "mastered" : true,
        );
        const modes = [
          { href: "learn", label: "학습", desc: "보기에서 고르고, 직접 써 보며 외우기", icon: BookOpenCheck },
          { href: "flashcards", label: "카드", desc: "뒤집으며 복습", icon: Layers },
          { href: "test", label: "시험", desc: "모의 테스트", icon: ListChecks },
          { href: "match", label: "매칭", desc: "시간 기록 게임", icon: Gamepad2 },
        ];
        return (
          <div>
            <BackLink href="/">내 세트</BackLink>
            <header className="mb-6 flex items-center gap-5">
              <div className="min-w-0 flex-1">
                <h1 className="break-words text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">{set.title}</h1>
                {set.description && <p className="mt-1 text-[15px] text-muted">{set.description}</p>}
              </div>
            </header>

            <section aria-label="진행 상황" className="mb-4 flex items-center gap-4 rounded-lg bg-bg p-4 shadow-card sm:p-5">
              <MasteryRing value={mastered} max={set.cards.length} size={52} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {set.cards.length}단어 중 {mastered}개 외움
                </p>
                <p className="mt-0.5 text-[13px] text-muted">학습이나 시험에서 연속 두 번 맞히면 외운 단어가 돼요.</p>
                <div className="mt-2">
                  <ProgressBar value={mastered} max={set.cards.length} label="암기 진행률" />
                </div>
              </div>
            </section>

            <nav aria-label="학습 방법" className="grid grid-cols-3 gap-2 sm:gap-3">
              {modes.map((m, i) =>
                i === 0 ? (
                  <Link
                    key={m.href}
                    href={`/set/${m.href}?id=${set.id}`}
                    className="col-span-3 flex items-center gap-4 rounded-lg bg-accent px-5 py-5 text-on-accent shadow-card hover:bg-accent-strong"
                  >
                    <m.icon aria-hidden className="size-7 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold">{m.label}</span>
                      <span className="block text-sm opacity-85">{m.desc}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 opacity-80" />
                  </Link>
                ) : (
                  <Link
                    key={m.href}
                    href={`/set/${m.href}?id=${set.id}`}
                    className="flex flex-col items-start gap-2 rounded-lg bg-bg p-4 shadow-card hover:bg-accent-soft"
                  >
                    <m.icon aria-hidden className="size-5 shrink-0 text-accent" />
                    <span>
                      <span className="block font-semibold">{m.label}</span>
                      <span className="block text-xs text-muted">{m.desc}</span>
                    </span>
                  </Link>
                ),
              )}
            </nav>

            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href={`/set/edit?id=${set.id}`} variant="secondary" size="sm">
                <Pencil aria-hidden className="size-4" /> 편집
              </ButtonLink>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const text = set.cards.map((c) => `${c.term}\t${c.definition}`).join("\n");
                  try {
                    await navigator.clipboard.writeText(text);
                    toast("단어 목록을 복사했어요. 엑셀에 붙여 넣을 수 있어요.");
                  } catch {
                    toast("복사하지 못했어요.", "error");
                  }
                }}
              >
                <Copy aria-hidden className="size-4" /> 목록 복사
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  repo.resetProgress(set.id);
                  toast("진행 상황을 초기화했어요.");
                }}
              >
                <RotateCcw aria-hidden className="size-4" /> 진행 초기화
              </Button>
              {!confirmDelete ? (
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden className="size-4" /> 삭제
                </Button>
              ) : (
                <span role="alert" className="flex items-center gap-2 rounded-full bg-danger-soft py-1 pl-4 pr-1 text-sm font-medium text-danger">
                  정말 삭제할까요?
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      repo.deleteSet(set.id);
                      toast("세트를 삭제했어요.");
                      router.push("/");
                    }}
                  >
                    삭제
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    취소
                  </Button>
                </span>
              )}
            </div>

            <section aria-labelledby="words" className="mt-10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="words" className="px-1 text-xl font-bold">
                  단어 {set.cards.length}개
                </h2>
                <div role="group" aria-label="보기 필터" className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm">
                  {(
                    [
                      ["all", "전체"],
                      ["notMastered", "못 외운 것"],
                      ["starred", `별표 ${starred}`],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={filter === v}
                      onClick={() => setFilter(v)}
                      className="rounded-full px-3 py-1.5 text-muted aria-pressed:bg-bg aria-pressed:font-semibold aria-pressed:text-text aria-pressed:shadow-card"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {shown.length === 0 ? (
                <p className="rounded-lg bg-bg p-8 text-center text-sm text-muted shadow-card">
                  {filter === "starred" ? "별표한 단어가 없어요. 카드나 아래 목록에서 ☆를 눌러 보세요." : "모두 외웠어요! 🎉"}
                </p>
              ) : (
                <Sheet>
                <ul className="divide-y divide-border">
                  {shown.map((c) => {
                    const p = prog(c.id);
                    const m = p?.mastery ?? "new";
                    return (
                      <li key={c.id} className="flex items-start gap-2 py-3 pl-4 pr-2 sm:items-center sm:pl-5">
                        <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-4">
                          <span lang="en" className="break-words text-[19px] font-semibold leading-snug">
                            {c.term}
                          </span>
                          <span className="break-words text-[15px] text-muted sm:self-center">{c.definition}</span>
                        </div>
                        {m !== "new" && (
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${masteryClass[m]}`}>{masteryLabel[m]}</span>
                        )}
                        <SpeakButton text={c.term} />
                        <button
                          type="button"
                          aria-pressed={!!p?.starred}
                          aria-label={`${c.term} 별표`}
                          onClick={() => repo.toggleStar(c.id)}
                          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface aria-pressed:text-warning"
                        >
                          <Star aria-hidden className="size-5" fill={p?.starred ? "currentColor" : "none"} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                </Sheet>
              )}
            </section>
          </div>
        );
      }}
    </WithSet>
  );
}
