"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cloud, CloudAlert, CloudUpload, House, Plus, Search, UserRound } from "lucide-react";
import { resync, useAccount } from "@/lib/data";
import { cloudEnabled } from "@/lib/supabase";
import { useState, type FormEvent, type ReactNode } from "react";
import { buttonClass } from "./Button";

function AccountControl({ compact = false }: { compact?: boolean }) {
  const { session, status } = useAccount();
  if (!cloudEnabled) return null;
  if (!session) {
    return compact ? (
      <TabLink href="/account/" label="로그인" icon={<UserRound aria-hidden className="size-5" />} />
    ) : (
      <Link href="/account/" className={buttonClass("ghost", "sm", "shrink-0")}>
        <UserRound aria-hidden className="size-4" /> 로그인
      </Link>
    );
  }
  if (status.state === "error") {
    return (
      <button
        type="button"
        onClick={resync}
        title={status.message}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
      >
        <CloudAlert aria-hidden className="size-5" />
        <span className="sr-only">서버 저장 실패. 눌러서 다시 저장</span>
      </button>
    );
  }
  const icon =
    status.state === "synced" ? <Cloud aria-hidden className="size-5" /> : <CloudUpload aria-hidden className="size-5 animate-pulse" />;
  const label = status.state === "synced" ? "계정 (서버에 저장됨)" : "계정 (저장 중)";
  return compact ? (
    <TabLink href="/account/" label="계정" srLabel={label} icon={icon} />
  ) : (
    <Link href="/account/" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface">
      {icon}
      <span className="sr-only">{label}</span>
    </Link>
  );
}

function TabLink({ href, label, srLabel, icon, current }: { href: string; label: string; srLabel?: string; icon: ReactNode; current?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted aria-[current=page]:text-accent"
    >
      {icon}
      <span aria-hidden={!!srLabel}>{label}</span>
      {srLabel && <span className="sr-only">{srLabel}</span>}
    </Link>
  );
}

export function TopNav() {
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
        <nav aria-label="주 메뉴" className="mx-auto flex h-14 max-w-content items-center gap-3 px-4">
          <Link
            href="/"
            aria-label="토익 단어장 홈"
            aria-current={path === "/" ? "page" : undefined}
            className="shrink-0 rounded-md text-[17px] font-extrabold tracking-tight text-text"
          >
            <span className="marker">단어장</span>
          </Link>
          <form role="search" onSubmit={onSearch} className="relative min-w-0 flex-1">
            <label htmlFor="nav-search" className="sr-only">
              단어나 세트 검색
            </label>
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="nav-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="단어나 세트 검색"
              className="h-10 w-full rounded-full border border-transparent bg-surface pl-10 pr-4 text-sm placeholder:text-muted hover:border-border focus:border-border-input focus:bg-bg"
            />
          </form>
          <div className="hidden items-center gap-1 sm:flex">
            <AccountControl />
            <Link href="/sets/new" className={buttonClass("primary", "sm", "shrink-0")}>
              <Plus aria-hidden className="size-4" /> 새 세트
            </Link>
          </div>
        </nav>
      </header>

      {/* Phone: app-style tab bar at the thumb. */}
      <nav
        aria-label="하단 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <TabLink href="/" label="홈" icon={<House aria-hidden className="size-5" />} current={path === "/"} />
        <Link href="/sets/new" className="flex flex-1 flex-col items-center justify-center py-1.5">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent shadow-card">
            <Plus aria-hidden className="size-5" />
          </span>
          <span className="sr-only">새 세트</span>
        </Link>
        {cloudEnabled ? (
          <div className="flex flex-1">
            <AccountControl compact />
          </div>
        ) : (
          <TabLink href="/search" label="검색" icon={<Search aria-hidden className="size-5" />} current={path.startsWith("/search")} />
        )}
      </nav>
    </>
  );
}
