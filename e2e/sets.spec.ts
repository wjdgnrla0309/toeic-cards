import { a11y, expect, makeSet, noHorizontalScroll, seed, test } from "./fixtures";

test.describe("F01 새 세트 만들기", () => {
  test("F01-H1/H2 만들기, 새로고침 후에도 유지", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "내 단어장" })).toBeVisible();
    await a11y(page, "S01 home");
    await noHorizontalScroll(page);
    await page.getByRole("link", { name: "새 세트" }).click();
    await expect(page.getByRole("heading", { name: "새 세트 만들기" })).toBeVisible();
    await a11y(page, "S03 new set");

    await page.getByLabel("세트 이름").fill("내 Day 1");
    await page.getByLabel("단어", { exact: true }).nth(0).fill("negotiate");
    await page.getByLabel(/^뜻/).nth(0).fill("협상하다");
    await page.getByLabel("단어", { exact: true }).nth(1).fill("expand");
    await page.getByLabel(/^뜻/).nth(1).fill("확장하다");
    await page.getByRole("button", { name: "만들기" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "내 Day 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "단어 2개" })).toBeVisible();
    await a11y(page, "S05 set detail");
    await noHorizontalScroll(page);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "내 Day 1" })).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("link", { name: /내 Day 1/ })).toBeVisible();
  });

  test("F01-E1/E2 빈 이름, 단어 부족, 뜻 빈 줄은 오류", async ({ page }) => {
    await page.goto("/sets/new/");
    await page.getByRole("button", { name: "만들기" }).click();
    await expect(page.getByText("세트 이름을 입력하세요.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("단어를 2개 이상");
    await expect(page.getByLabel("세트 이름")).toBeFocused();

    await page.getByLabel("세트 이름").fill("x");
    await page.getByLabel("단어", { exact: true }).nth(0).fill("a");
    await page.getByLabel(/^뜻/).nth(0).fill("1");
    await page.getByLabel("단어", { exact: true }).nth(1).fill("b");
    await page.getByRole("button", { name: "만들기" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("비어 있는 줄이 1개");
    await expect(page).toHaveURL(/\/sets\/new\/$/);
  });

  test("F01-E3 이모지·악센트·긴 이름", async ({ page }) => {
    const long = "café résumé 📚 ".repeat(5).trim(); // > 60 chars
    await page.goto("/sets/new/");
    await page.getByLabel("세트 이름").fill(long);
    await page.getByLabel("단어", { exact: true }).nth(0).fill("naïve");
    await page.getByLabel(/^뜻/).nth(0).fill("순진한 😊");
    await page.getByLabel("단어", { exact: true }).nth(1).fill("façade");
    await page.getByLabel(/^뜻/).nth(1).fill("건물 정면");
    await page.getByRole("button", { name: "만들기" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(long);
    await expect(page.getByText("순진한 😊")).toBeVisible();
    await noHorizontalScroll(page);
    await page.goto("/");
    await noHorizontalScroll(page);
  });

  test("F01-E4 마지막 뜻 칸에서 Tab이면 새 줄", async ({ page }) => {
    await page.goto("/sets/new/");
    const defs = page.getByLabel(/^뜻/);
    await expect(defs).toHaveCount(3);
    await defs.nth(2).focus();
    await page.keyboard.press("Tab");
    await expect(defs).toHaveCount(4);
    await expect(page.getByLabel("단어", { exact: true }).nth(3)).toBeFocused();
  });

  test("F01-E5 만들기 두 번 클릭해도 세트 하나", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /토익 빈출 동사 1/ })).toBeVisible(); // data loaded
    const before = await page.getByRole("listitem").filter({ has: page.getByRole("link") }).count();
    await page.goto("/sets/new/");
    await page.getByLabel("세트 이름").fill("더블클릭");
    await page.getByLabel("단어", { exact: true }).nth(0).fill("a");
    await page.getByLabel(/^뜻/).nth(0).fill("1");
    await page.getByLabel("단어", { exact: true }).nth(1).fill("b");
    await page.getByLabel(/^뜻/).nth(1).fill("2");
    await page.getByRole("button", { name: "만들기" }).dblclick();
    await expect(page.getByRole("heading", { level: 1, name: "더블클릭" })).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("link", { name: /더블클릭/ })).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ has: page.getByRole("link") })).toHaveCount(before + 1);
  });

  test("F01-E6 편집: 순서 바꾸기, 삭제", async ({ page }) => {
    await seed(page, [makeSet("s1", "편집용", [["one", "하나"], ["two", "둘"], ["three", "셋"]])]);
    await page.goto("/set/edit/?id=s1");
    await a11y(page, "S03 edit");
    await page.getByRole("button", { name: "2번 위로" }).click();
    await page.getByRole("button", { name: "3번 삭제" }).click();
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("heading", { name: "단어 2개" })).toBeVisible();
    const terms = page.getByRole("list").last().locator("li span[lang=en]");
    await expect(terms).toHaveText(["two", "one"]);
  });

  test("F01-N1 삭제하면 사라지고 주소는 '찾을 수 없어요'", async ({ page }) => {
    await seed(page, [makeSet("s1", "지울 세트"), makeSet("s2", "남길 세트")]);
    await page.goto("/set/?id=s1");
    await page.getByRole("button", { name: "삭제" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("정말 삭제할까요?");
    await page.getByRole("main").getByRole("alert").getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /지울 세트/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /남길 세트/ })).toBeVisible();
    await page.goto("/set/?id=s1");
    await expect(page.getByText("세트를 찾을 수 없어요.")).toBeVisible();
  });
});

test.describe("F02 목록 붙여 넣기", () => {
  test("F02-H1/E1/E2 탭·쉼표 구분, 구분자 없는 줄 제외", async ({ page }) => {
    await page.goto("/sets/new/");
    await page.getByRole("button", { name: "목록 붙여 넣기" }).click();
    const dialog = page.getByRole("dialog", { name: "목록 붙여 넣기" });
    await expect(dialog).toBeVisible();
    await a11y(page, "S04 import");
    await expect(dialog.getByRole("button", { name: /0개 가져오기/ })).toBeDisabled();

    const box = dialog.getByLabel(/복사한 목록/);
    await box.fill("postpone\t연기하다, 미루다\nsubmit\t제출하다\n\nattend\t참석하다\n구분자없음");
    await expect(dialog.getByText("미리보기 · 3개")).toBeVisible();
    await expect(dialog.getByText("구분자가 없는 줄 1개 제외")).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "연기하다, 미루다" })).toBeVisible();

    await box.fill("postpone, 연기하다, 미루다\nsubmit, 제출하다");
    await expect(dialog.getByRole("radio", { name: "쉼표 ," })).toBeChecked();
    await expect(dialog.getByRole("cell", { name: "연기하다, 미루다" })).toBeVisible();
    await dialog.getByRole("button", { name: "2개 가져오기" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "단어 2개" })).toBeVisible();
    await expect(page.getByLabel("단어", { exact: true }).nth(0)).toHaveValue("postpone");
    await expect(page.getByLabel(/^뜻/).nth(0)).toHaveValue("연기하다, 미루다");
  });

  test("F02-E4 Esc로 닫기", async ({ page }) => {
    await page.goto("/sets/new/");
    await page.getByRole("button", { name: "목록 붙여 넣기" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("공통", () => {
  test("X-3 검색: 뜻으로 찾기, 결과 없음", async ({ page }) => {
    await seed(page, [makeSet("s1", "검색 세트")]);
    await page.goto("/");
    await page.getByRole("searchbox", { name: "단어나 세트 검색" }).fill("환불");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "검색" })).toBeVisible();
    await expect(page.getByText("refund")).toBeVisible();
    await a11y(page, "S11 search");
    await page.getByRole("searchbox").fill("없는단어zzz");
    await page.keyboard.press("Enter");
    await expect(page.getByText("찾는 결과가 없어요.")).toBeVisible();
  });

  test("X-4 백업 내려받기 → 다른 브라우저에서 불러오기", async ({ page, browser }) => {
    await seed(page, [makeSet("s1", "백업할 세트")]);
    await page.goto("/");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "백업 내려받기" }).click()]);
    const path = await download.path();

    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto("/");
    await expect(p2.getByRole("link", { name: /백업할 세트/ })).toHaveCount(0);
    const chooser = p2.waitForEvent("filechooser");
    await p2.getByRole("button", { name: "백업 불러오기" }).click();
    await (await chooser).setFiles(path);
    await expect(p2.getByText("백업을 불러왔어요.")).toBeVisible();
    await expect(p2.getByRole("link", { name: /백업할 세트/ })).toBeVisible();
    await other.close();
  });

  test("X-5 두 탭: 한쪽 변경이 다른 탭에 반영", async ({ page, context }) => {
    await page.goto("/");
    const p2 = await context.newPage();
    await p2.goto("/sets/new/");
    await p2.getByLabel("세트 이름").fill("다른 탭에서");
    await p2.getByLabel("단어", { exact: true }).nth(0).fill("a");
    await p2.getByLabel(/^뜻/).nth(0).fill("1");
    await p2.getByLabel("단어", { exact: true }).nth(1).fill("b");
    await p2.getByLabel(/^뜻/).nth(1).fill("2");
    await p2.getByRole("button", { name: "만들기" }).click();
    await expect(p2.getByRole("heading", { level: 1, name: "다른 탭에서" })).toBeVisible();
    await expect(page.getByRole("link", { name: /다른 탭에서/ })).toBeVisible();
  });

  test("샘플 세트가 첫 방문에 보임", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /토익 빈출 동사 1/ })).toBeVisible();
    await expect(page.getByText("3개 세트, 60단어 중 0개 외움")).toBeVisible();
  });
});
