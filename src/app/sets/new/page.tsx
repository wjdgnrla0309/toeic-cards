"use client";

import { useRouter } from "next/navigation";
import { SetEditor } from "@/components/SetEditor";
import { toast } from "@/components/Toast";
import { LoadingPage, PageTitle } from "@/components/ui";
import { repo, useData } from "@/lib/data";

export default function NewSetPage() {
  const router = useRouter();
  const data = useData();
  if (!data) return <LoadingPage />;
  return (
    <div>
      <PageTitle>새 세트 만들기</PageTitle>
      <SetEditor
        submitLabel="만들기"
        onCancel={() => router.back()}
        onSubmit={(draft) => {
          const id = repo.createSet(draft);
          toast("세트를 만들었어요.");
          router.push(`/sets/${id}`);
        }}
      />
    </div>
  );
}
