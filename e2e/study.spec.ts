import type { Page } from "@playwright/test";
import { a11y, answerOf, expect, makeSet, noHorizontalScroll, seed, test, termOf, WORDS } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await seed(page, [
    makeSet("s1", "테스트 세트"),
    makeSet("tiny", "세 단어", WORDS.slice(0, 3)),
    makeSet("one", "한 단어", WORDS.slice(0, 1)),
  ]);
});

test.describe("F03 카드", () => {
  test("F03-H1 뒤집기, 이동, 끝 화면", async ({ page }) => {
    await page.goto("/set/?id=s1");
    await page.getByRole("link", { name: /^카드/ }).click();
    await expect(page.getByRole("heading", { name: "카드" })).toBeVisible();
    await a11y(page, "S06 flashcards");
    await noHorizontalScroll(page);
    const card = page.getByRole("button", { name: /^카드 뒤집기/ });
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("1 / 8")).toBeVisible();
    for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "다음 카드" }).click();
    await expect(page.getByText("8장을 모두 봤어요.")).toBeVisible();
    await page.getByRole("button", { name: "처음부터" }).click();
    await expect(page.getByText("1 / 8")).toBeVisible();
  });

  test("F03-E1 키보드만: Space 뒤집기, → 다음", async ({ page }) => {
    await page.goto("/set/flashcards/?id=s1");
    const card = page.getByRole("button", { name: /^카드 뒤집기/ });
    await expect(card).toBeVisible();
    await page.locator("body").press("Space");
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await page.locator("body").press("ArrowRight");
    await expect(page.getByText("2 / 8")).toBeVisible();
    await expect(card).toHaveAttribute("aria-pressed", "false");
    // Focused card button: Space must flip exactly once.
    await card.focus();
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("aria-pressed", "true");
  });

  test("F03-E2 별표만 보기", async ({ page }) => {
    await page.goto("/set/flashcards/?id=s1");
    await page.getByRole("button", { name: "별표만" }).click();
    await expect(page.getByText("별표한 단어가 없어요.")).toBeVisible();
    await page.getByRole("button", { name: "전체 보기" }).click();
    await page.getByRole("button", { name: "별표", exact: true }).click();
    await page.getByRole("button", { name: "별표만" }).click();
    await expect(page.getByText("1 / 1")).toBeVisible();
  });
});

/** Answers the current Learn question; `right` decides whether to answer correctly. */
async function answerLearn(page: Page, right: boolean) {
  const q = page.getByRole("region", { name: "문제" });
  const term = (await q.locator("p[lang=en]").first().innerText()).trim();
  const answer = answerOf(term)!;
  const choices = q.getByRole("radiogroup", { name: "보기" });
  if (await choices.isVisible()) {
    if (right) await choices.getByRole("radio", { name: new RegExp(answer) }).click();
    else await choices.getByRole("radio").filter({ hasNotText: answer }).first().click();
  } else {
    await q.getByRole("textbox", { name: "답" }).fill(right ? answer : "틀린답");
    await q.getByRole("textbox", { name: "답" }).press("Enter");
  }
  return term;
}

test.describe("F04 학습", () => {
  test("F04-H1 모두 맞히면 완료", async ({ page }) => {
    await page.goto("/set/learn/?id=s1");
    await a11y(page, "S07 learn start");
    await page.getByRole("button", { name: "시작하기" }).click();
    await expect(page.getByRole("heading", { name: /학습 · 1라운드/ })).toBeVisible();
    await a11y(page, "S07 learn question");
    await noHorizontalScroll(page);
    let sawWritten = false;
    for (let i = 0; i < 60; i++) {
      if (await page.getByText("모든 단어를 두 번씩 맞혔어요!").isVisible()) break;
      const next = page.getByRole("button", { name: "다음 라운드" });
      if (await next.isVisible()) {
        await next.click();
        continue;
      }
      if (await page.getByRole("textbox", { name: "답" }).isVisible()) sawWritten = true;
      await answerLearn(page, true);
      await expect(page.getByText("정답!")).toBeVisible();
      await page.getByRole("button", { name: "계속 (Enter)" }).click();
    }
    await expect(page.getByText("모든 단어를 두 번씩 맞혔어요!")).toBeVisible();
    expect(sawWritten).toBe(true);
    await page.goto("/set/?id=s1");
    await expect(page.getByText("8단어 중 8개 외움")).toBeVisible();
  });

  test("F04-E1 오답은 정답을 보여 주고 라운드 끝에 다시 나옴", async ({ page }) => {
    await page.goto("/set/learn/?id=s1");
    await page.getByRole("button", { name: "시작하기" }).click();
    const term = await answerLearn(page, false);
    await expect(page.getByText("틀렸어요")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "틀렸어요" })).toContainText(answerOf(term)!);
    await page.getByRole("button", { name: "계속 (Enter)" }).click();
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) {
      const t = await answerLearn(page, true);
      seen.push(t);
      await page.getByRole("button", { name: "계속 (Enter)" }).click();
      if (t === term) break;
    }
    expect(seen.at(-1)).toBe(term);
  });

  test("F04-E2 주관식 오타 허용, '맞은 걸로 처리'", async ({ page }) => {
    // Definition → term prompts make the written answer an English word.
    await page.goto("/set/learn/?id=tiny");
    await page.getByRole("radio", { name: /뜻 → 영어/ }).check();
    await page.getByRole("button", { name: "시작하기" }).click();
    const q = page.getByRole("region", { name: "문제" });
    // First pass: multiple choice for every card.
    for (let i = 0; i < 3; i++) {
      const def = (await q.locator("p[lang=ko]").first().innerText()).trim();
      await q.getByRole("radio", { name: new RegExp(termOf(def)!) }).click();
      await page.getByRole("button", { name: "계속 (Enter)" }).click();
    }
    await page.getByRole("button", { name: "다음 라운드" }).click();
    // Written: swap two letters → accepted as a typo.
    let def = (await q.locator("p[lang=ko]").first().innerText()).trim();
    const word = termOf(def)!;
    const i = [...word].findIndex((ch, k) => k > 0 && ch !== word[k + 1] && k + 1 < word.length);
    const typo = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
    await q.getByRole("textbox", { name: "답" }).fill(typo);
    await q.getByRole("textbox", { name: "답" }).press("Enter");
    await expect(page.getByText("거의 맞았어요 (오타 허용)")).toBeVisible();
    await page.getByRole("button", { name: "계속 (Enter)" }).click();
    // Wrong answer, then override.
    def = (await q.locator("p[lang=ko]").first().innerText()).trim();
    await q.getByRole("textbox", { name: "답" }).fill("완전히다른답");
    await q.getByRole("textbox", { name: "답" }).press("Enter");
    await expect(page.getByText("틀렸어요")).toBeVisible();
    await page.getByRole("button", { name: "맞은 걸로 처리" }).click();
    await expect(page.getByRole("progressbar", { name: "학습 진행" })).toHaveAttribute("aria-valuenow", "5");
  });

  test("F04-E3 새로고침해도 이어 하기", async ({ page }) => {
    await page.goto("/set/learn/?id=s1");
    await page.getByRole("button", { name: "시작하기" }).click();
    await answerLearn(page, true);
    await page.getByRole("button", { name: "계속 (Enter)" }).click();
    await expect(page.getByRole("progressbar", { name: "학습 진행" })).toHaveAttribute("aria-valuenow", "1");
    await page.reload();
    await expect(page.getByRole("progressbar", { name: "학습 진행" })).toHaveAttribute("aria-valuenow", "1");
    await expect(page.getByRole("region", { name: "문제" })).toBeVisible();
  });

  test("F04-E4 키보드만: 숫자키로 고르고 Enter로 계속", async ({ page }) => {
    await page.goto("/set/learn/?id=s1");
    await page.getByRole("button", { name: "시작하기" }).click();
    const radios = page.getByRole("radiogroup", { name: "보기" }).getByRole("radio");
    await radios.first().focus();
    await page.keyboard.press("2");
    await expect(page.getByRole("button", { name: "계속 (Enter)" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("progressbar", { name: "학습 진행" })).toBeVisible();
    await expect(page.getByRole("button", { name: "계속 (Enter)" })).toHaveCount(0);
  });
});

test.describe("F05 시험", () => {
  test("F05-H1 전부 맞히면 100점", async ({ page }) => {
    await page.goto("/set/test/?id=s1");
    await expect(page.getByRole("heading", { name: "시험 설정" })).toBeVisible();
    await a11y(page, "S08 test setup");
    await expect(page.getByLabel(/문제 수/)).toHaveValue("8");
    await page.getByRole("button", { name: "시험 시작" }).click();
    await expect(page.getByRole("heading", { name: /^시험 · \d+문제$/ })).toBeVisible();
    await a11y(page, "S09 test");
    await noHorizontalScroll(page);

    for (const item of await page.locator("main ol > li").all()) {
      const kind = await item.locator("div").first().innerText();
      if (kind.includes("주관식")) {
        const term = (await item.locator("p[lang=en]").innerText()).trim();
        await item.getByRole("textbox", { name: "답" }).fill(answerOf(term)!);
      } else if (kind.includes("객관식")) {
        const term = (await item.locator("legend").innerText()).trim();
        await item.getByRole("radio", { name: answerOf(term)!, exact: true }).check();
      } else if (kind.includes("O / X")) {
        const term = (await item.locator("legend span[lang=en]").innerText()).trim();
        const shown = (await item.locator("legend span[lang=ko]").innerText()).trim();
        await item.getByText(shown === answerOf(term) ? "O 맞다" : "X 틀리다").click();
      } else if (kind.includes("짝 맞추기")) {
        for (const row of await item.getByRole("listitem").all()) {
          const term = (await row.locator("span[lang=en]").innerText()).trim();
          await row.getByRole("combobox").selectOption(answerOf(term)!);
        }
      }
    }
    await page.getByRole("button", { name: "제출" }).click();
    await expect(page.getByRole("status", { name: "결과" })).toContainText("100점");
    await expect(page.getByRole("button", { name: /틀린 .*개만 다시/ })).toHaveCount(0);
  });

  test("F05-E1/E4 미응답 경고, 그대로 제출, 틀린 것만 다시", async ({ page }) => {
    await page.goto("/set/test/?id=s1");
    await page.getByRole("button", { name: "시험 시작" }).click();
    await page.getByRole("button", { name: "제출" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("답하지 않은 문제가");
    await page.getByRole("button", { name: "그대로 제출" }).click();
    await expect(page.getByRole("status", { name: "결과" })).toContainText("0점");
    await page.getByRole("button", { name: "틀린 8개만 다시" }).click();
    await expect(page.getByRole("heading", { name: /^시험 · \d+문제$/ })).toBeVisible();
    await expect(page.getByRole("status", { name: "결과" })).toHaveCount(0);
  });

  test("F05-E2/E3 유형 제약", async ({ page }) => {
    await page.goto("/set/test/?id=tiny");
    await expect(page.getByRole("checkbox", { name: /객관식/ })).toBeDisabled();
    await expect(page.getByRole("checkbox", { name: /짝 맞추기/ })).toBeDisabled();
    await page.getByRole("checkbox", { name: /주관식/ }).uncheck();
    await page.getByRole("checkbox", { name: /O \/ X/ }).uncheck();
    await expect(page.getByText("유형을 하나 이상 고르세요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "시험 시작" })).toBeDisabled();
  });
});

test.describe("F06 매칭", () => {
  test("F06-H1/E1 짝 맞추기, 오답 페널티, 최고 기록", async ({ page }) => {
    await page.goto("/set/match/?id=s1");
    await a11y(page, "S10 match ready");
    await page.getByRole("button", { name: "시작" }).click();
    const tiles = page.getByRole("list").last().getByRole("button");
    await expect(tiles).toHaveCount(12);
    await a11y(page, "S10 match board");
    await noHorizontalScroll(page);

    // One wrong pair first: two English tiles.
    const texts = await tiles.allInnerTexts();
    const english = texts.filter((t) => answerOf(t.trim()));
    await page.getByRole("button", { name: english[0], exact: true }).click();
    await page.getByRole("button", { name: english[1], exact: true }).click();

    for (const term of english) {
      await page.getByRole("button", { name: term, exact: true }).click();
      await page.getByRole("button", { name: answerOf(term)!, exact: true }).click();
    }
    const result = page.getByRole("status").filter({ hasText: "초" });
    await expect(result).toBeVisible();
    await expect(result).toContainText("최고 기록!");
    const secs = parseFloat((await result.innerText()).match(/([\d.]+)초/)![1]);
    expect(secs).toBeGreaterThanOrEqual(1); // includes the 1s penalty
    await page.getByRole("button", { name: "다시 하기" }).click();
    await expect(tiles).toHaveCount(12);
  });

  test("F06-E2 단어 1개면 안내", async ({ page }) => {
    await page.goto("/set/match/?id=one");
    await expect(page.getByText("단어가 2개 이상 필요해요")).toBeVisible();
  });
});
