"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/Button";
import { BackLink, ProgressBar, SpeakButton } from "@/components/ui";
import { WithSet } from "@/components/WithSet";
import { repo } from "@/lib/data";
import type { Snapshot } from "@/lib/data/repo";
import {
  answer as applyAnswer,
  currentQuestion,
  isDone,
  isRoundOver,
  nextRound,
  progress,
  startLearn,
  type LearnQuestion,
  type LearnState,
} from "@/lib/study/learn";
import { gradeWritten, type Grade } from "@/lib/study/text";
import type { StudySet } from "@/lib/types";

export default function LearnPage() {
  return <WithSet>{(set, data) => <Learn set={set} data={data} />}</WithSet>;
}

type Feedback = { grade: Grade; given: string; q: LearnQuestion };

function Learn({ set, data }: { set: StudySet; data: Snapshot }) {
  const router = useRouter();
  const saved = data.learn[set.id];
  const [state, setState] = useState<LearnState | null>(saved ?? null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Build the question once per queue head, so options don't reshuffle on re-render.
  const head = state?.queue[0];
  const stage = head && state ? state.correct[head] : undefined;
  const question = useMemo(
    () => (state && head ? currentQuestion(state, set.cards) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [head, stage, state?.round, set.cards],
  );

  useEffect(() => {
    if (feedback) nextRef.current?.focus();
    else if (question?.kind === "written") inputRef.current?.focus();
  }, [feedback, question]);

  function begin(opts: { prompt: "term" | "definition"; starredOnly: boolean }) {
    const onlyIds = opts.starredOnly ? set.cards.filter((c) => data.progress[c.id]?.starred).map((c) => c.id) : undefined;
    const s = startLearn(set.cards, { shuffle: true, prompt: opts.prompt, onlyIds });
    setState(s);
    repo.saveLearn(set.id, s);
    repo.touchStudied(set.id);
  }

  function submit(given: string, q: LearnQuestion) {
    const grade: Grade = q.kind === "mc" ? (given === q.answer ? "correct" : "wrong") : gradeWritten(given, q.answer);
    setFeedback({ grade, given, q });
  }

  function proceed(override?: boolean) {
    if (!state || !feedback) return;
    const ok = override ?? feedback.grade !== "wrong";
    repo.recordAnswer(feedback.q.cardId, ok);
    const next = applyAnswer(state, feedback.q.cardId, ok);
    setState(next);
    repo.saveLearn(set.id, isDone(next) ? null : next);
    setFeedback(null);
    setTyped("");
  }

  if (!state) return <LearnStart set={set} data={data} onStart={begin} />;

  const p = progress(state);
  const header = (
    <>
      <BackLink href={`/sets/${set.id}`}>{set.title}</BackLink>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">학습 · {state.round}라운드</h1>
        <Button variant="ghost" size="sm" onClick={() => { repo.saveLearn(set.id, null); setState(null); }}>
          처음부터
        </Button>
      </div>
      <ProgressBar value={p.done} max={p.total} label="학습 진행" />
      <p className="mt-1 text-right text-xs text-muted">
        {Math.round((p.done / Math.max(1, p.total)) * 100)}%
      </p>
    </>
  );

  if (isDone(state)) {
    return (
      <div>
        {header}
        <div className="mt-6 rounded-lg bg-success-soft p-10 text-center">
          <p className="text-xl font-bold text-success">모든 단어를 두 번씩 맞혔어요!</p>
          <p className="mt-1 text-sm text-text">단어 {state.order.length}개 완료</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => setState(null)}>다시 학습</Button>
            <Button variant="secondary" onClick={() => router.push(`/sets/${set.id}/test`)}>시험 보기</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isRoundOver(state)) {
    const cards = state.roundCards.map((id) => set.cards.find((c) => c.id === id)).filter(Boolean);
    return (
      <div>
        {header}
        <div className="mt-6 rounded-lg bg-surface p-6">
          <p className="text-lg font-semibold">{state.round}라운드 끝!</p>
          <ul className="mt-3 divide-y divide-border">
            {cards.map((c) => (
              <li key={c!.id} className="flex justify-between gap-4 py-2 text-sm">
                <span lang="en" className="font-semibold">{c!.term}</span>
                <span className="text-right text-muted">{c!.definition}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-4 w-full" autoFocus onClick={() => { const s = nextRound(state); setState(s); repo.saveLearn(set.id, s); }}>
            다음 라운드
          </Button>
        </div>
      </div>
    );
  }

  if (!question) return header;
  const promptIsTerm = state.prompt === "term";

  return (
    <div>
      {header}
      <section aria-label="문제" className="mt-6 rounded-lg border border-border bg-bg p-5 shadow-card sm:p-8">
        <p className="text-xs font-semibold text-muted">
          {question.kind === "mc" ? "알맞은 답을 고르세요" : `${promptIsTerm ? "뜻" : "영어 단어"}를 입력하세요`}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <p lang={promptIsTerm ? "en" : "ko"} className="break-words text-2xl font-bold sm:text-[28px]">
            {question.prompt}
          </p>
          {promptIsTerm && <SpeakButton text={question.prompt} />}
        </div>

        {question.kind === "mc" ? (
          <div role="radiogroup" aria-label="보기" className="mt-6 grid gap-3 sm:grid-cols-2">
            {question.options.map((o, idx) => {
              const isAnswer = o === question.answer;
              const chosen = feedback?.given === o;
              const cls = feedback
                ? isAnswer
                  ? "border-success bg-success-soft text-success"
                  : chosen
                    ? "border-danger bg-danger-soft text-danger"
                    : "border-border opacity-60"
                : "border-border hover:border-accent hover:bg-accent-soft";
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  disabled={!!feedback}
                  onClick={() => submit(o, question)}
                  onKeyDown={(e) => {
                    const n = Number(e.key);
                    if (n >= 1 && n <= question.options.length) submit(question.options[n - 1], question);
                  }}
                  className={`flex min-h-14 items-center gap-3 rounded-md border-2 px-4 py-3 text-left font-medium disabled:cursor-default ${cls}`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-muted">{idx + 1}</span>
                  <span lang={promptIsTerm ? "ko" : "en"} className="break-words">{o}</span>
                  {feedback && isAnswer && <Check aria-label="정답" className="ml-auto size-5 shrink-0" />}
                  {feedback && chosen && !isAnswer && <X aria-label="내가 고른 오답" className="ml-auto size-5 shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!feedback) submit(typed, question);
            }}
          >
            <label htmlFor="answer" className="sr-only">답</label>
            <input
              id="answer"
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              readOnly={!!feedback}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              lang={promptIsTerm ? "ko" : "en"}
              placeholder="답을 입력하고 Enter"
              className="h-12 w-full rounded-md border border-border-input bg-bg px-3 text-lg"
            />
            {!feedback && (
              <div className="mt-3 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => submit("", question)}>
                  모르겠어요
                </Button>
                <Button type="submit" disabled={!typed.trim()}>확인</Button>
              </div>
            )}
          </form>
        )}

        {feedback && (
          <div
            role="status"
            className={`mt-6 rounded-md p-4 ${feedback.grade === "wrong" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}
          >
            <p className="flex items-center gap-2 font-semibold">
              {feedback.grade === "wrong" ? <X aria-hidden className="size-5" /> : <Check aria-hidden className="size-5" />}
              {feedback.grade === "correct" ? "정답!" : feedback.grade === "close" ? "거의 맞았어요 (오타 허용)" : "틀렸어요"}
            </p>
            {feedback.grade !== "correct" && (
              <p className="mt-1 text-sm text-text">
                정답: <strong lang={promptIsTerm ? "ko" : "en"}>{question.answer}</strong>
                {feedback.given && feedback.q.kind === "written" && <> · 내 답: {feedback.given}</>}
              </p>
            )}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {feedback.grade === "wrong" && feedback.q.kind === "written" && feedback.given.trim() && (
                <Button variant="ghost" size="sm" onClick={() => proceed(true)}>
                  맞은 걸로 처리
                </Button>
              )}
              <Button ref={nextRef} onClick={() => proceed()}>
                계속 (Enter)
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function LearnStart({
  set,
  data,
  onStart,
}: {
  set: StudySet;
  data: Snapshot;
  onStart: (o: { prompt: "term" | "definition"; starredOnly: boolean }) => void;
}) {
  const [prompt, setPrompt] = useState<"term" | "definition">("term");
  const [starredOnly, setStarredOnly] = useState(false);
  const starred = set.cards.filter((c) => data.progress[c.id]?.starred).length;
  const tooFew = set.cards.length < 1 || (starredOnly && starred < 1);
  return (
    <div>
      <BackLink href={`/sets/${set.id}`}>{set.title}</BackLink>
      <h1 className="mb-4 text-xl font-bold">학습</h1>
      <div className="space-y-5 rounded-lg border border-border bg-bg p-5">
        <p className="text-sm text-muted">
          처음에는 보기 중에서 고르고, 맞히면 다음엔 직접 입력해요. 단어마다 두 번 맞히면 끝나요. 한 라운드는 7문제예요.
        </p>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">문제로 보여 줄 것</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="prompt" checked={prompt === "term"} onChange={() => setPrompt("term")} className="accent-accent" />
              영어 → 뜻
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="prompt" checked={prompt === "definition"} onChange={() => setPrompt("definition")} className="accent-accent" />
              뜻 → 영어 (철자 연습)
            </label>
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={starredOnly} onChange={(e) => setStarredOnly(e.target.checked)} className="size-4 accent-accent" />
          별표한 단어만 ({starred}개)
        </label>
        <Button size="lg" className="w-full" disabled={tooFew} onClick={() => onStart({ prompt, starredOnly })}>
          시작하기
        </Button>
        {tooFew && <p className="text-sm text-danger">공부할 단어가 없어요.</p>}
      </div>
    </div>
  );
}
