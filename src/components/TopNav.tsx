"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Cloud, CloudAlert, CloudUpload, Plus, Search, UserRound } from "lucide-react";
import { resync, useAccount } from "@/lib/data";
import { cloudEnabled } from "@/lib/supabase";
import { useState, type FormEvent } from "react";
import { buttonClass } from "./Button";

export function TopNav() {
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const { session, status } = useAccount();

  function onSearch(e: FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg/95 backdrop-blur">
      <nav aria-label="주 메뉴" className="mx-auto flex h-full max-w-content items-center gap-3 px-4">
        <Link
          href="/"
          aria-label="토익 단어장 홈"
          aria-current={path === "/" ? "page" : undefined}
          className="flex shrink-0 items-center gap-2 rounded-md font-bold text-text"
        >
          <BookOpen aria-hidden className="size-5 text-accent" />
          <span className="hidden sm:inline">토익 단어장</span>
        </Link>
        <form role="search" onSubmit={onSearch} className="relative min-w-0 flex-1">
          <label htmlFor="nav-search" className="sr-only">
            단어나 세트 검색
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id="nav-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="단어나 세트 검색"
            className="h-9 w-full rounded-md border border-border-input bg-bg pl-9 pr-3 text-sm placeholder:text-muted"
          />
        </form>
        {cloudEnabled &&
          (session ? (
            status.state === "error" ? (
              <button
                type="button"
                onClick={resync}
                title={status.message}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-danger hover:bg-danger-soft"
              >
                <CloudAlert aria-hidden className="size-5" />
                <span className="sr-only">서버 저장 실패. 눌러서 다시 저장</span>
              </button>
            ) : (
              <Link
                href="/account/"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface"
              >
                {status.state === "synced" ? <Cloud aria-hidden className="size-5" /> : <CloudUpload aria-hidden className="size-5 animate-pulse" />}
                <span className="sr-only">{status.state === "synced" ? "계정 · 서버에 저장됨" : "계정 · 저장 중"}</span>
              </Link>
            )
          ) : (
            <Link href="/account/" className={buttonClass("secondary", "sm", "shrink-0")}>
              <UserRound aria-hidden className="size-4" />
              <span className="hidden sm:inline">로그인</span>
              <span className="sr-only sm:hidden">로그인</span>
            </Link>
          ))}
        <Link href="/sets/new" className={buttonClass("primary", "sm", "shrink-0")}>
          <Plus aria-hidden className="size-4" />
          <span className="hidden sm:inline">새 세트</span>
          <span className="sr-only sm:hidden">새 세트</span>
        </Link>
      </nav>
    </header>
  );
}
