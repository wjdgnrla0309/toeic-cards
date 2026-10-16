"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; kind: "success" | "error"; text: string };
let push: ((t: Omit<Toast, "id">) => void) | null = null;

export function toast(text: string, kind: Toast["kind"] = "success") {
  push?.({ text, kind });
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    push = (t) => {
      const id = ++n;
      setItems((xs) => [...xs, { ...t, id }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md px-4 py-3 text-sm font-medium shadow-pop ${
            t.kind === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
