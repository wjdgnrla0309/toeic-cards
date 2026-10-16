import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { TopNav } from "@/components/TopNav";
import { ToastHost } from "@/components/Toast";
import "./globals.css";

// Source Serif 4 (SIL OFL 1.1) for English words, bundled at build time.
const serif = Source_Serif_4({ subsets: ["latin", "latin-ext"], weight: ["400", "600", "700"], variable: "--font-source-serif" });

export const metadata: Metadata = {
  title: "토익 단어장",
  description: "토익 단어를 플래시카드, 학습, 시험, 매칭 게임으로 외우는 개인용 단어장",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${serif.variable} h-full antialiased`}>
      <head>
        {/* Pretendard (SIL OFL 1.1) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />

      </head>
      <body className="flex min-h-full flex-col bg-surface text-text">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
        >
          본문 바로가기
        </a>
        <Suspense fallback={<div className="h-14 border-b border-border" />}>
          <TopNav />
        </Suspense>
        <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 pb-28 pt-6 sm:pb-16 sm:pt-10">
          {children}
        </main>
        <ToastHost />
      </body>
    </html>
  );
}
