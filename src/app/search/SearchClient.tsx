"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoadingPage, PageTitle, SetCard } from "@/components/ui";
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
        <p className="rounded-lg bg-surface p-8 text-center text-muted">찾는 결과가 없어요.</p>
      )}
      {sets.length > 0 && (
        <section aria-labelledby="r-sets" className="mb-8">
          <h2 id="r-sets" className="mb-3 font-semibold">세트 {sets.length}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((s) => (
              <li key={s.id}>
                <SetCard set={s} progress={data.progress} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {words.length > 0 && (
        <section aria-labelledby="r-words">
          <h2 id="r-words" className="mb-3 font-semibold">단어 {words.length}</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {words.slice(0, 200).map((w) => (
              <li key={w.id} className="grid gap-1 p-3 sm:grid-cols-3 sm:gap-4">
                <span lang="en" className="font-semibold">{w.term}</span>
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
