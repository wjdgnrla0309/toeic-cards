// Screenshots for design review and replica-diff. Runs only with SHOTS=1.
import { test } from "@playwright/test";
import { makeSet, seed } from "./fixtures";

test.skip(!process.env.SHOTS, "set SHOTS=1 to capture screens");

const out = (name: string, project: string) => `../replica/clone-screens/${project}-${name}.png`;

test("capture", async ({ page }, info) => {
  const p = info.project.name;
  await seed(page, [makeSet("s1", "토익 Day 3 비즈니스 동사"), makeSet("s2", "Part 5 형용사")]);
  await page.goto("/");
  await page.getByText("오늘의 단어").waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: out("S01-home", p), fullPage: true });
  await page.goto("/set/?id=s1");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.screenshot({ path: out("S05-set", p), fullPage: true });
  await page.goto("/set/flashcards/?id=s1");
  await page.getByRole("button", { name: /^카드 뒤집기/ }).waitFor();
  await page.screenshot({ path: out("S06-flashcards", p) });
  await page.goto("/set/learn/?id=s1");
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.getByRole("region", { name: "문제" }).waitFor();
  await page.screenshot({ path: out("S07-learn", p) });
  await page.getByRole("radiogroup").getByRole("radio").first().click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: out("S07-learn-feedback", p) });
  await page.goto("/sets/new/");
  await page.screenshot({ path: out("S03-new", p) });
  await page.goto("/set/test/?id=s1");
  await page.getByRole("button", { name: "시험 시작" }).click();
  await page.screenshot({ path: out("S09-test", p) });
  await page.goto("/set/match/?id=s1");
  await page.getByRole("button", { name: "시작" }).click();
  await page.screenshot({ path: out("S10-match", p) });
});
