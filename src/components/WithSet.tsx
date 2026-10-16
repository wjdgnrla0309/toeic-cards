"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useSet } from "@/lib/data";
import type { Snapshot } from "@/lib/data/repo";
import type { StudySet } from "@/lib/types";
import { LoadingPage, NotFound } from "./ui";

/** Resolves the ?id= query param to a set, with loading and not-found states. */
export function WithSet({ children }: { children: (set: StudySet, data: Snapshot) => ReactNode }) {
  const id = useSearchParams().get("id") ?? "";
  const r = useSet(id);
  if (r.loading) return <LoadingPage />;
  if (!r.set) return <NotFound />;
  return <>{children(r.set, r.data)}</>;
}
