import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

export const KEY = "toeic-cards:v1";

export interface SeedCard { id: string; term: string; definition: string }
export interface SeedSet { id: string; title: string; cards: SeedCard[] }

/** A small set with known answers, used by the study-mode specs. */
export const WORDS: [string, string][] = [
  ["postpone", "연기하다"],
  ["submit", "제출하다"],
  ["attend", "참석하다"],
  ["invoice", "청구서"],
  ["merger", "합병"],
  ["refund", "환불"],
  ["budget", "예산"],
  ["branch", "지점"],
];

export function makeSet(id: string, title: string, words: [string, string][] = WORDS): SeedSet {
  return { id, title, cards: words.map(([term, definition], i) => ({ id: `${id}-c${i}`, term, definition })) };
}

/** Replace the app's stored data before the page loads (once per test, not on reload). */
export async function seed(page: Page, sets: SeedSet[]) {
  const t = "2026-10-16T00:00:00.000Z";
  const snapshot = {
    sets: sets.map((s) => ({ ...s, description: "", visibility: "private", createdAt: t, updatedAt: t })),
    progress: {},
    learn: {},
    matchBest: {},
  };
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("__seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("__seeded", "1");
      }
    },
    [KEY, JSON.stringify(snapshot)] as const,
  );
}

export const answerOf = (term: string) => WORDS.find(([t]) => t === term)?.[1];
export const termOf = (def: string) => WORDS.find(([, d]) => d === def)?.[0];

/** Fails the test on console errors, page errors and 5xx responses. */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(`console: ${m.text()}`);
      });
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("response", (r) => {
        if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`);
      });
      await use();
      expect(problems, problems.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** axe scan, WCAG 2 A/AA. */
export async function a11y(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const v = r.violations.map((x) => `${x.id} (${x.impact}): ${x.nodes.length} node(s) — ${x.nodes[0]?.target.join(" ")}`);
  expect(v, `${label} axe violations:\n${v.join("\n")}`).toEqual([]);
}

/** No horizontal page scroll. */
export async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, "page scrolls horizontally").toBeLessThanOrEqual(0);
}
