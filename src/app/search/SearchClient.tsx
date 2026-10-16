"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoadingPage, PageTitle, SetCard, Sheet } from "@/components/ui";
import { useData } from "@/lib/data";

export function SearchClient() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const data = useData();
  if (!data) return <LoadingPage />;

  const needle = q.toLowerCase();
  const sets = needle ? data.sets.filter((s) => s.title.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle)) : [];
  const words = needle
    ? data.sets.flatMap((s) =>
        s.cards
          .filter((c) => c.term.toLowerCase().includes(needle) || c.definition.toLowerCase().includes(needle))
          .map((c) => ({ ...c, set: s })),
      )
    : [];

  return (
    <div>
      <PageTitle sub={q ? `"${q}" 검색 결과` : "위 검색창에 단어나 세트 이름을 입력하세요."}>검색</PageTitle>
      {q && sets.length === 0 && words.length === 0 && (
        <p className="rounded-lg bg-bg p-8 shadow-card text-center text-muted">찾는 결과가 없어요.</p>
      )}
      {sets.length > 0 && (
        <section aria-labelledby="r-sets" className="mb-8">
          <h2 id="r-sets" className="mb-3 px-1 text-lg font-bold">세트 {sets.length}</h2>
          <Sheet>
            <ul className="divide-y divide-border">
              {sets.map((s) => (
                <li key={s.id} className="min-w-0">
                  <SetCard set={s} progress={data.progress} />
                </li>
              ))}
            </ul>
          </Sheet>
        </section>
      )}
      {words.length > 0 && (
        <section aria-labelledby="r-words">
          <h2 id="r-words" className="mb-3 px-1 text-lg font-bold">단어 {words.length}</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-lg bg-bg shadow-card">
            {words.slice(0, 200).map((w) => (
              <li key={w.id} className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4 sm:px-5">
                <span lang="en" className="text-[18px] font-semibold">{w.term}</span>
                <span className="text-muted">{w.definition}</span>
                <Link href={`/set?id=${w.set.id}`} className="truncate text-sm text-accent underline">
                  {w.set.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
