import { Suspense } from "react";
import { LoadingPage } from "@/components/ui";
import { SearchClient } from "./SearchClient";

export default function Page() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <SearchClient />
    </Suspense>
  );
}
