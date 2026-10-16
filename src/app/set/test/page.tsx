"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/Button";
import { BackLink } from "@/components/ui";
import { WithSet } from "@/components/WithSet";
import { repo } from "@/lib/data";
import {
  availableTypes,
  buildTest,
  DEFAULT_COUNT,
  gradeTest,
  type Answers,
  type QType,
  type TestConfig,
  type TestQuestion,
  type TestResult,
} from "@/lib/study/testGen";
import type { StudySet } from "@/lib/types";

export default function TestPage() {
  return <WithSet>{(set) => <TestScreen set={set} />}</WithSet>;
}

const typeLabels: Record<QType, string> = {
  written: "주관식",
  mc: "객관식",
  tf: "O / X",
  matching: "짝 맞추기",
};

function TestScreen({ set }: { set: StudySet }) {
  const [qs, setQs] = useState<TestQuestion[] | null>(null);
  const [cfg, setCfg] = useState<TestConfig | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [warnUnanswered, setWarnUnanswered] = useState(0);

  function start(c: TestConfig) {
    setCfg(c);
    setQs(buildTest(set.cards, c));
    setAnswers({});
    setResult(null);
    setWarnUnanswered(0);
    repo.touchStudied(set.id);
    window.scrollTo({ top: 0 });
  }

  function unansweredCount(): number {
    if (!qs) return 0;
    return qs.filter((q) => {
      const a = answers[q.id];
      if (q.kind === "matching") return !Array.isArray(a) || a.filter(Boolean).length < q.prompts.length;
      if (q.kind === "written") return !(typeof a === "string" && a.trim());
      return a === undefined;
    }).length;
  }

  function submit(force = false) {
    if (!qs) return;
    const n = unansweredCount();
    if (n && !force) {
      setWarnUnanswered(n);
      return;
    }
    const r = gradeTest(qs, answers);
    for (const q of qs) {
      if (q.kind === "matching") q.cardIds.forEach((id) => repo.recordAnswer(id, !r.wrongCardIds.includes(id)));
      else repo.recordAnswer(q.cardId, !!r.perQuestion[q.id]);
    }
    setResult(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!qs || !cfg) return <TestSetup set={set} onStart={start} />;

  const promptIsTerm = cfg.prompt === "term";
  const set_ = (id: string, v: Answers[string]) => setAnswers((a) => ({ ...a, [id]: v }));

  return (
    <div>
      <BackLink href={`/set?id=${set.id}`}>{set.title}</BackLink>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">시험 · {qs.length}문제</h1>
        <Button variant="secondary" size="sm" onClick={() => setQs(null)}>
          설정 바꾸기
        </Button>
      </div>

      {result && (
        <section role="status" aria-label="결과" className="mb-6 rounded-lg bg-surface p-6 text-center">
          <p className="text-sm font-semibold text-muted">점수</p>
          <p className="mt-1 text-[40px] font-bold leading-[48px]">
            {Math.round((result.score / Math.max(1, result.total)) * 100)}점
          </p>
          <p className="text-sm text-muted">
            {result.total}개 중 {result.score}개 정답
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => start(cfg)}>새 시험</Button>
            {result.wrongCardIds.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  const sub = { ...set, cards: set.cards.filter((c) => result.wrongCardIds.includes(c.id)) };
                  setCfg(cfg);
                  setQs(buildTest(sub.cards, { ...cfg, types: cfg.types.filter((t) => availableTypes(sub.cards)[t]).length ? cfg.types : ["written"] }));
                  setAnswers({});
                  setResult(null);
                  window.scrollTo({ top: 0 });
                }}
              >
                틀린 {result.wrongCardIds.length}개만 다시
              </Button>
            )}
          </div>
        </section>
      )}

      <ol className="space-y-4">
        {qs.map((q, n) => {
          const ok = result?.perQuestion[q.id];
          return (
            <li
              key={q.id}
              className={`rounded-lg border bg-bg p-5 ${result ? (ok ? "border-success" : "border-danger") : "border-border"}`}
            >
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted">
                <span>
                  {n + 1}. {typeLabels[q.kind]}
                </span>
                {result && (
                  <span className={`flex items-center gap-1 ${ok ? "text-success" : "text-danger"}`}>
                    {ok ? <Check aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
                    {ok ? "정답" : "오답"}
                  </span>
                )}
              </div>
              <QuestionView q={q} value={answers[q.id]} onChange={(v) => set_(q.id, v)} locked={!!result} promptIsTerm={promptIsTerm} />
            </li>
          );
        })}
      </ol>

      {!result && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur">
          {warnUnanswered > 0 && (
            <p role="alert" className="mb-2 text-sm text-warning">
              답하지 않은 문제가 {warnUnanswered}개 있어요. 그래도 제출할까요?
            </p>
          )}
          <div className="flex justify-end gap-2">
            {warnUnanswered > 0 && (
              <Button variant="secondary" onClick={() => submit(true)}>
                그대로 제출
              </Button>
            )}
            <Button onClick={() => submit()}>제출</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionView({
  q,
  value,
  onChange,
  locked,
  promptIsTerm,
}: {
  q: TestQuestion;
  value: Answers[string];
  onChange: (v: Answers[string]) => void;
  locked: boolean;
  promptIsTerm: boolean;
}) {
  const pLang = promptIsTerm ? "en" : "ko";
  const aLang = promptIsTerm ? "ko" : "en";

  if (q.kind === "written") {
    return (
      <div>
        <p lang={pLang} className="text-lg font-semibold">{q.prompt}</p>
        <label className="mt-3 block">
          <span className="sr-only">답</span>
          <input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            readOnly={locked}
            autoComplete="off"
            spellCheck={false}
            lang={aLang}
            placeholder="답 입력"
            className="h-11 w-full rounded-md border border-border-input bg-bg px-3"
          />
        </label>
        {locked && <p className="mt-2 text-sm text-muted">정답: <strong lang={aLang} className="text-text">{q.answer}</strong></p>}
      </div>
    );
  }

  if (q.kind === "mc") {
    return (
      <fieldset>
        <legend lang={pLang} className="text-lg font-semibold">{q.prompt}</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {q.options.map((o) => {
            const chosen = value === o;
            const cls = locked
              ? o === q.answer
                ? "border-success bg-success-soft"
                : chosen
                  ? "border-danger bg-danger-soft"
                  : "border-border"
              : chosen
                ? "border-accent bg-accent-soft"
                : "border-border hover:bg-surface";
            return (
              <label key={o} className={`flex cursor-pointer items-center gap-3 rounded-md border-2 px-3 py-2 ${cls}`}>
                <input type="radio" name={q.id} checked={chosen} disabled={locked} onChange={() => onChange(o)} className="accent-accent" />
                <span lang={aLang}>{o}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (q.kind === "tf") {
    return (
      <fieldset>
        <legend className="w-full">
          <span lang={pLang} className="block text-lg font-semibold">{q.prompt}</span>
          <span className="mt-1 block text-muted">
            = <span lang={aLang}>{q.shown}</span> ?
          </span>
        </legend>
        <div className="mt-3 flex gap-2">
          {([true, false] as const).map((v) => {
            const chosen = value === v;
            const cls = locked
              ? v === q.isTrue
                ? "border-success bg-success-soft"
                : chosen
                  ? "border-danger bg-danger-soft"
                  : "border-border"
              : chosen
                ? "border-accent bg-accent-soft"
                : "border-border hover:bg-surface";
            return (
              <label key={String(v)} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-2 py-2 font-semibold ${cls}`}>
                <input type="radio" name={q.id} checked={chosen} disabled={locked} onChange={() => onChange(v)} className="sr-only" />
                {v ? "O 맞다" : "X 틀리다"}
              </label>
            );
          })}
        </div>
        {locked && !q.isTrue && <p className="mt-2 text-sm text-muted">정답: <strong lang={aLang} className="text-text">{q.answer}</strong></p>}
      </fieldset>
    );
  }

  const picks = Array.isArray(value) ? value : [];
  return (
    <div>
      <p className="mb-3 text-sm text-muted">각 단어에 맞는 뜻을 고르세요.</p>
      <ul className="space-y-2">
        {q.prompts.map((p, i) => {
          const right = picks[i] === q.answers[i];
          return (
            <li key={p} className="grid items-center gap-2 sm:grid-cols-2">
              <span lang={pLang} className="font-semibold">{p}</span>
              <label>
                <span className="sr-only">{p}의 짝</span>
                <select
                  value={picks[i] ?? ""}
                  disabled={locked}
                  onChange={(e) => {
                    const next = q.prompts.map((_, j) => picks[j] ?? "");
                    next[i] = e.target.value;
                    onChange(next);
                  }}
                  className={`h-10 w-full rounded-md border bg-bg px-2 ${locked ? (right ? "border-success" : "border-danger") : "border-border-input"}`}
                >
                  <option value="">선택</option>
                  {q.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
              {locked && !right && <span className="text-sm text-muted sm:col-start-2">정답: {q.answers[i]}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TestSetup({ set, onStart }: { set: StudySet; onStart: (c: TestConfig) => void }) {
  const avail = availableTypes(set.cards);
  const [count, setCount] = useState(Math.min(DEFAULT_COUNT, set.cards.length));
  const [types, setTypes] = useState<QType[]>(() => (["written", "mc", "tf", "matching"] as QType[]).filter((t) => avail[t]));
  const [prompt, setPrompt] = useState<"term" | "definition">("term");
  const valid = types.length > 0 && count >= 1;

  return (
    <div>
      <BackLink href={`/set?id=${set.id}`}>{set.title}</BackLink>
      <h1 className="mb-4 text-xl font-bold">시험 설정</h1>
      <form
        className="space-y-5 rounded-lg border border-border bg-bg p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onStart({ count, types, prompt });
        }}
      >
        <div>
          <label htmlFor="count" className="mb-1 block text-sm font-semibold">
            문제 수 <span className="font-normal text-muted">(최대 {set.cards.length})</span>
          </label>
          <input
            id="count"
            type="number"
            min={1}
            max={set.cards.length}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(set.cards.length, Number(e.target.value) || 1)))}
            className="h-11 w-28 rounded-md border border-border-input bg-bg px-3"
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">문제 유형</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(typeLabels) as QType[]).map((t) => (
              <label key={t} className={`flex items-center gap-2 text-sm ${avail[t] ? "" : "text-muted"}`}>
                <input
                  type="checkbox"
                  disabled={!avail[t]}
                  checked={types.includes(t)}
                  onChange={(e) => setTypes((ts) => (e.target.checked ? [...ts, t] : ts.filter((x) => x !== t)))}
                  className="size-4 accent-accent"
                />
                {typeLabels[t]}
                {!avail[t] && <span className="text-xs">(단어가 더 필요해요)</span>}
              </label>
            ))}
          </div>
          {!types.length && <p role="alert" className="mt-2 text-sm text-danger">유형을 하나 이상 고르세요.</p>}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">문제로 보여 줄 것</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="prompt" checked={prompt === "term"} onChange={() => setPrompt("term")} className="accent-accent" />
              영어 → 뜻
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="prompt" checked={prompt === "definition"} onChange={() => setPrompt("definition")} className="accent-accent" />
              뜻 → 영어
            </label>
          </div>
        </fieldset>
        <Button type="submit" size="lg" className="w-full" disabled={!valid}>
          시험 시작
        </Button>
      </form>
    </div>
  );
}
