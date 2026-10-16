"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileText, Plus, Trash2, X } from "lucide-react";
import { Button } from "./Button";
import type { SetDraft, Visibility } from "@/lib/types";
import { guessTermSep, parseImport, type RowSep, type TermSep } from "@/lib/study/importText";

type Row = SetDraft["cards"][number] & { key: string };

let keySeq = 0;
const newRow = (term = "", definition = ""): Row => ({ key: `r${++keySeq}`, term, definition });

export function SetEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: SetDraft;
  submitLabel: string;
  onSubmit: (draft: SetDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "private");
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.cards.length
      ? initial.cards.map((c) => ({ ...c, key: `r${++keySeq}` }))
      : [newRow(), newRow(), newRow()],
  );
  const [showImport, setShowImport] = useState(false);
  const [tried, setTried] = useState(false);
  const focusKey = useRef<string | null>(null);

  useEffect(() => {
    if (!focusKey.current) return;
    document.getElementById(`term-${focusKey.current}`)?.focus();
    focusKey.current = null;
  }, [rows]);

  const filled = rows.filter((r) => r.term.trim() || r.definition.trim());
  const halfRows = rows.filter((r) => !!r.term.trim() !== !!r.definition.trim());
  const errors = {
    title: !title.trim() ? "세트 이름을 입력하세요." : "",
    cards: filled.length < 2 ? "단어를 2개 이상 입력하세요." : "",
    half: halfRows.length ? `단어나 뜻이 비어 있는 줄이 ${halfRows.length}개 있어요.` : "",
  };
  const valid = !errors.title && !errors.cards && !errors.half;

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function move(i: number, d: -1 | 1) {
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const a = rs.slice();
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  }
  function addRow() {
    const r = newRow();
    focusKey.current = r.key;
    setRows((rs) => [...rs, r]);
  }
  function submit() {
    setTried(true);
    if (!valid) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    onSubmit({
      title,
      description,
      visibility,
      cards: filled.map(({ id, term, definition, imageUrl }) => ({ id, term, definition, imageUrl })),
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
      className="space-y-6"
    >
      <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-semibold">
            세트 이름
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="예: 토익 Day 1 동사"
            aria-invalid={tried && !!errors.title}
            aria-describedby={tried && errors.title ? "title-err" : undefined}
            className="h-11 w-full rounded-md border border-border-input bg-bg px-3 aria-[invalid=true]:border-danger"
          />
          {tried && errors.title && (
            <p id="title-err" className="mt-1 text-sm text-danger">
              {errors.title}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="desc" className="mb-1 block text-sm font-semibold">
            설명 <span className="font-normal text-muted">(선택)</span>
          </label>
          <input
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 w-full rounded-md border border-border-input bg-bg px-3"
          />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">공개 범위</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ["private", "나만 보기"],
                ["link", "링크가 있는 사람"],
                ["public", "모두 공개"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="vis" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="accent-accent" />
                {label}
              </label>
            ))}
          </div>
          {visibility !== "private" && (
            <p className="mt-1 text-xs text-warning">지금은 이 브라우저에만 저장되므로, 공유는 서버 연결(backend) 후에 동작해요.</p>
          )}
        </fieldset>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">단어 {filled.length}개</h2>
        <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
          <FileText aria-hidden className="size-4" /> 목록 붙여 넣기
        </Button>
      </div>

      {tried && (errors.cards || errors.half) && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.cards || errors.half}
        </p>
      )}

      <ol className="space-y-3">
        {rows.map((r, i) => {
          const bad = tried && !!r.term.trim() !== !!r.definition.trim();
          return (
            <li key={r.key} className={`rounded-lg border bg-bg p-3 ${bad ? "border-danger" : "border-border"}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">{i + 1}</span>
                <div className="flex gap-1">
                  <IconBtn label={`${i + 1}번 위로`} onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn label={`${i + 1}번 아래로`} onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn label={`${i + 1}번 삭제`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} disabled={rows.length <= 1}>
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`term-${r.key}`} className="mb-1 block text-xs font-medium text-muted">
                    단어
                  </label>
                  <textarea
                    id={`term-${r.key}`}
                    rows={1}
                    value={r.term}
                    onChange={(e) => update(r.key, { term: e.target.value })}
                    aria-invalid={bad && !r.term.trim()}
                    lang="en"
                    className="min-h-11 w-full resize-y rounded-md border border-border-input bg-bg px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor={`def-${r.key}`} className="mb-1 block text-xs font-medium text-muted">
                    뜻 <span className="font-normal">(여러 뜻은 쉼표로)</span>
                  </label>
                  <textarea
                    id={`def-${r.key}`}
                    rows={1}
                    value={r.definition}
                    onChange={(e) => update(r.key, { definition: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && !e.shiftKey && i === rows.length - 1) {
                        e.preventDefault();
                        addRow();
                      }
                    }}
                    aria-invalid={bad && !r.definition.trim()}
                    className="min-h-11 w-full resize-y rounded-md border border-border-input bg-bg px-3 py-2"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Button variant="secondary" className="w-full" onClick={addRow}>
        <Plus aria-hidden className="size-4" /> 단어 추가
      </Button>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImport={(parsed) => {
            setRows((rs) => {
              const kept = rs.filter((r) => r.term.trim() || r.definition.trim());
              return [...kept, ...parsed.map((p) => newRow(p.term, p.definition))];
            });
            setShowImport(false);
          }}
        />
      )}
    </form>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (rows: { term: string; definition: string }[]) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [termSep, setTermSep] = useState<TermSep>("tab");
  const [rowSep, setRowSep] = useState<RowSep>("newline");
  const [customTerm, setCustomTerm] = useState("");
  const [touchedSep, setTouchedSep] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const parsed = useMemo(() => parseImport(text, { termSep, rowSep, customTerm }), [text, termSep, rowSep, customTerm]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="import-title"
      className="m-auto w-[min(720px,calc(100vw-32px))] rounded-lg bg-bg p-0 text-text shadow-pop backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="import-title" className="text-lg font-semibold">
          목록 붙여 넣기
        </h2>
        <button type="button" aria-label="닫기" onClick={() => ref.current?.close()} className="rounded-md p-1 text-muted hover:bg-surface">
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <label htmlFor="import-text" className="mb-1 block text-sm font-semibold">
            엑셀, 구글 시트, 메모장에서 복사한 목록
          </label>
          <textarea
            id="import-text"
            autoFocus
            rows={7}
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              if (!touchedSep) setTermSep(guessTermSep(v));
            }}
            placeholder={"postpone\t연기하다, 미루다\nsubmit\t제출하다"}
            className="w-full rounded-md border border-border-input bg-bg px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted">엑셀에서 두 칸(단어, 뜻)을 복사하면 탭으로 구분돼요. 각 줄에서 첫 번째 구분자만 단어와 뜻을 나눠요.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">단어와 뜻 사이</legend>
            {(
              [
                ["tab", "탭"],
                ["comma", "쉼표 ,"],
                ["dash", "대시  - "],
                ["custom", "직접 입력"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 py-0.5 text-sm">
                <input
                  type="radio"
                  name="termSep"
                  checked={termSep === v}
                  onChange={() => {
                    setTermSep(v);
                    setTouchedSep(true);
                  }}
                  className="accent-accent"
                />
                {l}
                {v === "custom" && termSep === "custom" && (
                  <input
                    aria-label="구분자"
                    value={customTerm}
                    onChange={(e) => setCustomTerm(e.target.value)}
                    className="h-8 w-20 rounded-md border border-border-input px-2"
                  />
                )}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">단어끼리</legend>
            {(
              [
                ["newline", "줄바꿈"],
                ["semicolon", "세미콜론 ;"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 py-0.5 text-sm">
                <input type="radio" name="rowSep" checked={rowSep === v} onChange={() => setRowSep(v)} className="accent-accent" />
                {l}
              </label>
            ))}
          </fieldset>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            미리보기 · {parsed.rows.length}개{parsed.skipped > 0 && <span className="text-warning"> (구분자가 없는 줄 {parsed.skipped}개 제외)</span>}
          </h3>
          {parsed.rows.length === 0 ? (
            <p className="rounded-md bg-surface px-3 py-4 text-center text-sm text-muted">
              {text.trim() ? "단어를 찾지 못했어요. 구분자를 바꿔 보세요." : "목록을 붙여 넣으면 여기에 보여요."}
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">단어</th>
                    <th scope="col" className="px-3 py-2">뜻</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5">{r.term || <em className="text-danger">비어 있음</em>}</td>
                      <td className="px-3 py-1.5">{r.definition || <em className="text-danger">비어 있음</em>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onClick={() => ref.current?.close()}>
          취소
        </Button>
        <Button disabled={!parsed.rows.length} onClick={() => onImport(parsed.rows)}>
          {parsed.rows.length}개 가져오기
        </Button>
      </div>
    </dialog>
  );
}
