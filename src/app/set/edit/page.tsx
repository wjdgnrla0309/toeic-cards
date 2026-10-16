"use client";

import { useRouter } from "next/navigation";
import { SetEditor } from "@/components/SetEditor";
import { toast } from "@/components/Toast";
import { BackLink, PageTitle } from "@/components/ui";
import { WithSet } from "@/components/WithSet";
import { repo } from "@/lib/data";

export default function EditSetPage() {
  const router = useRouter();
  return (
    <WithSet>
      {(set) => (
        <div>
          <BackLink href={`/set?id=${set.id}`}>{set.title}</BackLink>
          <PageTitle sub="단어를 바꾸면 진행 중이던 학습 세션은 처음부터 다시 시작돼요.">세트 편집</PageTitle>
          <SetEditor
            initial={set}
            submitLabel="저장"
            onCancel={() => router.push(`/set?id=${set.id}`)}
            onSubmit={(draft) => {
              repo.updateSet(set.id, draft);
              toast("저장했어요.");
              router.push(`/set?id=${set.id}`);
            }}
          />
        </div>
      )}
    </WithSet>
  );
}
