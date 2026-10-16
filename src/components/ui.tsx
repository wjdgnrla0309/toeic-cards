"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
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
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-[var(--motion-base)]" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Small ring showing how much of a set is memorised. */
export function MasteryRing({ value, max, size = 40 }: { value: number; max: number; size?: number }) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? value / max : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
      {value > 0 && (
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={pct >= 1 ? "var(--success)" : "var(--accent)"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
      />
      )}
    </svg>
  );
}

/** One set as a notebook line: title, counts, and a mastery ring. */
export function SetCard({ set, progress }: { set: StudySet; progress: Record<string, CardProgress> }) {
  const mastered = set.cards.filter((c) => progress[c.id]?.mastery === "mastered").length;
  return (
    <Link href={`/set?id=${set.id}`} className="group flex items-center gap-4 px-4 py-4 hover:bg-surface sm:px-5">
      <MasteryRing value={mastered} max={set.cards.length} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[17px] font-semibold group-hover:text-accent">{set.title}</h3>
        <p className="mt-0.5 text-[13px] text-muted">
          {set.cards.length}단어 중 {mastered}개 외움
        </p>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
    </Link>
  );
}

/** White sheet that holds list rows, separated by hairlines. */
export function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-lg bg-bg shadow-card ${className}`}>{children}</div>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">{children}</h1>
      {sub && <p className="mt-2 max-w-prose text-[15px] text-muted">{sub}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
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
    <div className="rounded-lg bg-bg p-10 text-center shadow-card">
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
      className={`inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text ${className}`}
    >
      <Volume2 aria-hidden className="size-5" />
    </button>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex max-w-full items-center gap-1 text-sm font-medium text-muted hover:text-text">
      <ChevronLeft aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  );
}
