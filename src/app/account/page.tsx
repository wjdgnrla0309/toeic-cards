"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { PageTitle } from "@/components/ui";
import { useAccount } from "@/lib/data";
import { cloudEnabled, supabase } from "@/lib/supabase";

export default function AccountPage() {
  const { session, ready } = useAccount();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (!cloudEnabled) {
    return (
      <div>
        <PageTitle>계정</PageTitle>
        <p className="rounded-lg bg-bg p-6 shadow-card text-muted">서버 저장이 아직 설정되지 않았어요. 지금은 이 브라우저에만 저장돼요.</p>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) return setError("이메일 주소를 확인하세요.");
    if (password.length < 8) return setError("비밀번호는 8자 이상이어야 해요.");
    setBusy(true);
    const sb = supabase();
    const redirect = `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/account/`;
    const { data, error } =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("Invalid login") ? "이메일 또는 비밀번호가 맞지 않아요."
        : error.message.includes("already registered") ? "이미 가입된 이메일이에요. 로그인해 주세요."
        : error.message.includes("Email not confirmed") ? "메일함에서 가입 확인 링크를 먼저 눌러 주세요."
        : error.message,
      );
      return;
    }
    if (mode === "up" && !data.session) {
      setSent(true);
      return;
    }
    toast("로그인했어요. 단어가 서버에 저장돼요.");
    router.push("/");
  }

  if (!ready) return null;

  if (session) {
    return (
      <div>
        <PageTitle sub="단어와 학습 기록이 서버에 저장되고, 같은 계정으로 로그인한 모든 기기에서 보여요.">계정</PageTitle>
        <div className="space-y-4 rounded-lg bg-bg shadow-card p-5">
          <p className="text-sm">
            로그인: <strong>{session.user.email}</strong>
          </p>
          <Button
            variant="secondary"
            onClick={async () => {
              await supabase().auth.signOut();
              toast("로그아웃했어요.");
              router.push("/");
            }}
          >
            로그아웃
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle sub="로그인하면 PC와 휴대폰에서 같은 단어장을 쓸 수 있고, 사진으로 단어를 등록할 수 있어요.">
        {mode === "in" ? "로그인" : "가입하기"}
      </PageTitle>
      {sent ? (
        <div role="status" className="rounded-lg bg-success-soft p-5 text-success">
          <p className="font-semibold">{email}로 확인 메일을 보냈어요.</p>
          <p className="mt-1 text-sm text-text">메일의 링크를 누르면 가입이 끝나요. 메일이 안 보이면 스팸함을 확인하세요.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-lg bg-bg shadow-card p-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">이메일</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-md border border-border-input bg-bg px-3"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">
              비밀번호 <span className="font-normal text-muted">(8자 이상)</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-border-input bg-bg px-3"
            />
          </div>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {mode === "in" ? "로그인" : "가입하기"}
          </Button>
          <p className="text-center text-sm text-muted">
            {mode === "in" ? "처음이신가요? " : "이미 계정이 있나요? "}
            <button type="button" className="font-semibold text-accent underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); }}>
              {mode === "in" ? "가입하기" : "로그인"}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
