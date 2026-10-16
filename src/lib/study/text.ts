/** Normalise an answer for comparison: case, spacing, punctuation. */
export function normalize(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // "(부사)" 같은 괄호 설명은 무시
    .replace(/[.,!?;:'"`~·…\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Edit distance where swapping two neighbouring letters counts as one typo. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Typos allowed: 0 for short answers, 1 up to 8 chars, 2 beyond. */
export function typoBudget(len: number): number {
  if (len <= 3) return 0;
  if (len <= 8) return 1;
  return 2;
}

export type Grade = "correct" | "close" | "wrong";

/**
 * Grade a written answer. An expected value may hold several meanings
 * separated by "," or ";" (e.g. "연기하다, 미루다"): any one of them counts.
 * "close" means right within the typo budget; it is still scored correct.
 */
export function gradeWritten(answer: string, expected: string): Grade {
  const a = normalize(answer);
  if (!a) return "wrong";
  const whole = normalize(expected);
  const options = [whole, ...expected.split(/[,;]/).map(normalize)].filter(Boolean);
  if (options.includes(a)) return "correct";
  for (const o of options) {
    if (editDistance(a, o) <= typoBudget(o.length)) return "close";
  }
  return "wrong";
}
