import { Suspense } from "react";
import { LoadingPage } from "@/components/ui";
import { HomeClient } from "./HomeClient";

export default function Page() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <HomeClient />
    </Suspense>
  );
}
