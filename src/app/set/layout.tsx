import { Suspense, type ReactNode } from "react";
import { LoadingPage } from "@/components/ui";

// ?id= is only known in the browser, so the client pages below suspend on useSearchParams.
export default function SetLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingPage />}>{children}</Suspense>;
}
