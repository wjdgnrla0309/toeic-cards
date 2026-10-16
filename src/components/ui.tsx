"use client";

import Link from "next/link";
import { Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import type { CardProgress, StudySet } from "@/lib/types";

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-[var(--motion-base)]" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SetCard({ set, progress }: { set: StudySet; progress: Record<string, CardProgress> }) {
  const mastered = set.cards.filter((c) => progress[c.id]?.mastery === "mastered").length;
  return (
    <Link
      href={`/sets/${set.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-bg p-4 transition-shadow hover:shadow-card"
    >
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold group-hover:text-accent">{set.title}</h3>
        <p className="text-xs font-medium text-muted">
          단어 {set.cards.length}개 · 외움 {mastered}개
        </p>
      </div>
      <ProgressBar value={mastered} max={set.cards.length} label={`${set.title} 암기 진행률`} />
    </Link>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold sm:text-[28px] sm:leading-9">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

export function LoadingPage() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="space-y-4">
      <Skeleton className="h-9 w-1/2" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function NotFound({ what = "세트" }: { what?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-8 text-center">
      <p className="text-lg font-semibold">{what}를 찾을 수 없어요.</p>
      <p className="mt-1 text-sm text-muted">삭제되었거나 주소가 잘못되었을 수 있어요.</p>
      <Link href="/" className="mt-4 inline-block font-semibold text-accent underline">
        홈으로
      </Link>
    </div>
  );
}

/** English pronunciation through the browser's speech engine. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = /[가-힣]/.test(text) ? "ko-KR" : "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`${text} 발음 듣기`}
      className={`inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text ${className}`}
    >
      <Volume2 aria-hidden className="size-5" />
    </button>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-block text-sm font-medium text-muted hover:text-text">
      ← {children}
    </Link>
  );
}
