import type { SetDraft } from "../types";

/**
 * Sample sets so the app is usable on first open. Written for this app:
 * frequently studied business-English words with common Korean meanings.
 * Not an official TOEIC list. Users can edit, delete or import their own.
 */
const raw: { title: string; description: string; words: [string, string][] }[] = [
  {
    title: "토익 빈출 동사 1",
    description: "업무·회의·일정 관련 동사 (샘플)",
    words: [
      ["postpone", "연기하다, 미루다"],
      ["submit", "제출하다"],
      ["attend", "참석하다"],
      ["confirm", "확인하다, 확정하다"],
      ["implement", "시행하다, 실행하다"],
      ["allocate", "할당하다, 배분하다"],
      ["reimburse", "변제하다, 환급하다"],
      ["renovate", "개조하다, 보수하다"],
      ["inquire", "문의하다"],
      ["assess", "평가하다"],
      ["expand", "확장하다"],
      ["negotiate", "협상하다"],
      ["accommodate", "수용하다, 숙박시키다"],
      ["distribute", "배포하다, 유통하다"],
      ["evaluate", "평가하다, 감정하다"],
      ["oversee", "감독하다"],
      ["revise", "수정하다, 개정하다"],
      ["install", "설치하다"],
      ["promote", "승진시키다, 홍보하다"],
      ["retain", "유지하다, 보유하다"],
    ],
  },
  {
    title: "토익 빈출 명사",
    description: "회사·계약·인사 관련 명사 (샘플)",
    words: [
      ["invoice", "송장, 청구서"],
      ["itinerary", "여행 일정표"],
      ["warranty", "품질 보증(서)"],
      ["merger", "합병"],
      ["revenue", "수익, 매출"],
      ["applicant", "지원자"],
      ["supervisor", "관리자, 상사"],
      ["inventory", "재고(목록)"],
      ["deadline", "마감 기한"],
      ["estimate", "견적(서), 추정"],
      ["subscription", "구독, 정기 구매"],
      ["refund", "환불"],
      ["shipment", "선적, 배송(품)"],
      ["questionnaire", "설문지"],
      ["reception", "접수처, 환영회"],
      ["expertise", "전문 지식"],
      ["agenda", "안건, 의제"],
      ["branch", "지점, 지사"],
      ["contract", "계약(서)"],
      ["budget", "예산"],
    ],
  },
  {
    title: "토익 빈출 형용사·부사",
    description: "Part 5·6 어휘 문제 단골 (샘플)",
    words: [
      ["mandatory", "의무적인, 필수의"],
      ["eligible", "자격이 있는"],
      ["tentative", "잠정적인"],
      ["complimentary", "무료의, 칭찬하는"],
      ["adjacent", "인접한"],
      ["comprehensive", "포괄적인, 종합적인"],
      ["punctual", "시간을 지키는"],
      ["substantial", "상당한"],
      ["preliminary", "예비의, 사전의"],
      ["confidential", "기밀의"],
      ["temporarily", "일시적으로"],
      ["promptly", "즉시, 신속하게"],
      ["approximately", "대략"],
      ["previously", "이전에"],
      ["considerably", "상당히"],
      ["exclusively", "독점적으로, 오로지"],
      ["accordingly", "그에 따라"],
      ["respectively", "각각"],
      ["affordable", "(가격이) 적당한"],
      ["reliable", "믿을 수 있는"],
    ],
  },
];

export const seedSets: SetDraft[] = raw.map((s) => ({
  title: s.title,
  description: s.description,
  visibility: "private",
  cards: s.words.map(([term, definition]) => ({ term, definition })),
}));
