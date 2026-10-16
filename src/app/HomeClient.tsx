"use client";

import { useRef, useState } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { toast } from "@/components/Toast";
import { LoadingPage, PageTitle, SetCard } from "@/components/ui";
import { addSampleSets, importLocalSets, localSetsForImport, repo, useAccount, useData } from "@/lib/data";
import { seedSets } from "@/lib/data/seed";

export function HomeClient() {
  const data = useData();
  const { session } = useAccount();
  const fileRef = useRef<HTMLInputElement>(null);
  const doneKey = session ? `toeic-cards:moved:${session.user.id}` : "";
  const [moved, setMoved] = useState(() => {
    try {
      return typeof window !== "undefined" && !!doneKey && localStorage.getItem(doneKey) === "1";
    } catch {
      return false;
    }
  });
  if (!data) return <LoadingPage />;

  const localSets = session && !moved ? localSetsForImport() : [];
  function markMoved() {
    try {
      localStorage.setItem(doneKey, "1");
    } catch {}
    setMoved(true);
  }

  const sorted = [...data.sets].sort((a, b) =>
    (b.lastStudiedAt ?? b.updatedAt).localeCompare(a.lastStudiedAt ?? a.updatedAt),
  );
  const totalWords = data.sets.reduce((n, s) => n + s.cards.length, 0);
  const mastered = Object.values(data.progress).filter((p) => p.mastery === "mastered").length;

  function exportBackup() {
    const blob = new Blob([repo.exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `toeic-cards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importBackup(file: File) {
    try {
      repo.importAll(await file.text());
      toast("백업을 불러왔어요.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "불러오지 못했어요.", "error");
    }
  }

  return (
    <div>
      <PageTitle sub={`세트 ${data.sets.length}개 · 단어 ${totalWords}개 · 외운 단어 ${mastered}개`}>내 단어장</PageTitle>

      {localSets.length > 0 && (
        <section aria-labelledby="move" className="mb-6 rounded-lg border border-accent bg-accent-soft p-4">
          <h2 id="move" className="font-semibold text-accent">
            이 브라우저에 있던 세트 {localSets.length}개를 계정으로 옮길까요?
          </h2>
          <p className="mt-1 text-sm text-text">{localSets.map((s) => s.title).join(", ")}</p>
          <p className="mt-1 text-xs text-muted">단어만 옮겨지고, 학습 진행 상황은 새로 시작해요.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                const n = importLocalSets(localSets.map((s) => s.id));
                markMoved();
                toast(`${n}개 세트를 계정에 저장했어요.`);
              }}
            >
              모두 옮기기
            </Button>
            <Button variant="ghost" size="sm" onClick={markMoved}>
              옮기지 않기
            </Button>
          </div>
        </section>
      )}

      {sorted.length === 0 && session && (
        <div className="mb-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              addSampleSets(seedSets);
              toast("샘플 세트를 추가했어요.");
            }}
          >
            토익 샘플 세트 3개 추가
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-input bg-surface p-10 text-center">
          <p className="text-lg font-semibold">아직 세트가 없어요.</p>
          <p className="mt-1 text-sm text-muted">외울 단어를 직접 입력하거나, 엑셀·메모장 목록을 붙여 넣어 만들 수 있어요.</p>
          <ButtonLink href="/sets/new" className="mt-5">
            <Plus aria-hidden className="size-4" /> 첫 세트 만들기
          </ButtonLink>
        </div>
      ) : (
        <section aria-labelledby="recent">
          <h2 id="recent" className="mb-3 text-sm font-semibold text-muted">
            최근 순
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((s) => (
              <li key={s.id} className="min-w-0">
                <SetCard set={s} progress={data.progress} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="backup" className="mt-10 rounded-lg border border-border bg-surface p-4">
        <h2 id="backup" className="font-semibold">
          백업
        </h2>
        <p className="mt-1 text-sm text-muted">
          {session
            ? "서버에 저장되고 있어요. 필요하면 파일로도 내려받아 둘 수 있어요."
            : "지금은 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 사라지니 가끔 백업 파일로 내려받아 두세요."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportBackup}>
            <Download aria-hidden className="size-4" /> 백업 내려받기
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden className="size-4" /> 백업 불러오기
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}
