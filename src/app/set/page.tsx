"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpenCheck, Copy, Gamepad2, Layers, ListChecks, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { toast } from "@/components/Toast";
import { PageTitle, ProgressBar, SpeakButton } from "@/components/ui";
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
          { href: "flashcards", label: "카드", desc: "뒤집으며 복습", icon: Layers },
          { href: "learn", label: "학습", desc: "두 번 맞히면 완료", icon: BookOpenCheck },
          { href: "test", label: "시험", desc: "모의 테스트", icon: ListChecks },
          { href: "match", label: "매칭", desc: "시간 기록 게임", icon: Gamepad2 },
        ];
        return (
          <div>
            <PageTitle sub={set.description || undefined}>{set.title}</PageTitle>

            <nav aria-label="학습 방법" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {modes.map((m) => (
                <Link
                  key={m.href}
                  href={`/set/${m.href}?id=${set.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-bg p-4 transition-shadow hover:shadow-card"
                >
                  <m.icon aria-hidden className="size-6 shrink-0 text-accent" />
                  <span>
                    <span className="block font-semibold">{m.label}</span>
                    <span className="block text-xs text-muted">{m.desc}</span>
                  </span>
                </Link>
              ))}
            </nav>

            <section aria-label="진행 상황" className="mt-6 rounded-lg bg-surface p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold">외운 단어</span>
                <span className="text-muted">
                  {mastered} / {set.cards.length}
                </span>
              </div>
              <ProgressBar value={mastered} max={set.cards.length} label="암기 진행률" />
              <p className="mt-2 text-xs text-muted">학습·시험에서 연속 두 번 맞히면 &lsquo;외움&rsquo;이 돼요.</p>
            </section>

            <div className="mt-6 flex flex-wrap gap-2">
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
                <span role="alert" className="flex items-center gap-2 rounded-md bg-danger-soft px-2 text-sm text-danger">
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

            <section aria-labelledby="words" className="mt-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="words" className="text-lg font-semibold">
                  단어 {set.cards.length}개
                </h2>
                <div role="group" aria-label="보기 필터" className="flex gap-1 text-sm">
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
                      className="rounded-full px-3 py-1 text-muted aria-pressed:bg-accent-soft aria-pressed:font-semibold aria-pressed:text-accent"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {shown.length === 0 ? (
                <p className="rounded-lg bg-surface p-6 text-center text-sm text-muted">
                  {filter === "starred" ? "별표한 단어가 없어요. 카드나 아래 목록에서 ☆를 눌러 보세요." : "모두 외웠어요! 🎉"}
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {shown.map((c) => {
                    const p = prog(c.id);
                    const m = p?.mastery ?? "new";
                    return (
                      <li key={c.id} className="flex items-start gap-3 p-3 sm:items-center">
                        <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-4">
                          <span lang="en" className="break-words font-semibold">
                            {c.term}
                          </span>
                          <span className="break-words text-muted">{c.definition}</span>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${masteryClass[m]}`}>{masteryLabel[m]}</span>
                        <SpeakButton text={c.term} />
                        <button
                          type="button"
                          aria-pressed={!!p?.starred}
                          aria-label={`${c.term} 별표`}
                          onClick={() => repo.toggleStar(c.id)}
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface aria-pressed:text-warning"
                        >
                          <Star aria-hidden className="size-5" fill={p?.starred ? "currentColor" : "none"} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        );
      }}
    </WithSet>
  );
}
