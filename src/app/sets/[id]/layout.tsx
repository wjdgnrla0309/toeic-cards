import { Suspense, type ReactNode } from "react";
import { LoadingPage } from "@/components/ui";

// [id] is only known at request time, so the client pages below suspend on useParams.
export default function SetLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingPage />}>{children}</Suspense>;
}
