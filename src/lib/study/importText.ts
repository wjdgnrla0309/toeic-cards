export type TermSep = "tab" | "comma" | "dash" | "custom";
export type RowSep = "newline" | "semicolon" | "custom";

export interface ImportOptions {
  termSep: TermSep;
  rowSep: RowSep;
  customTerm?: string;
  customRow?: string;
}

export interface ParsedRow {
  term: string;
  definition: string;
}

function termSepString(o: ImportOptions): string {
  switch (o.termSep) {
    case "tab": return "\t";
    case "comma": return ",";
    case "dash": return " - ";
    case "custom": return o.customTerm || "\t";
  }
}

/**
 * Parse pasted text into cards. Only the FIRST term separator splits a row,
 * so "postpone, 연기하다, 미루다" keeps both meanings in the definition.
 * Blank rows and rows without a separator are skipped (reported back).
 */
export function parseImport(text: string, o: ImportOptions): { rows: ParsedRow[]; skipped: number } {
  const rowSplit =
    o.rowSep === "newline" ? /\r?\n/ :
    o.rowSep === "semicolon" ? /;/ :
    (o.customRow || "\n");
  const sep = termSepString(o);
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const raw of text.split(rowSplit)) {
    const line = raw.trim();
    if (!line) continue;
    const at = line.indexOf(sep);
    if (at < 0) { skipped++; continue; }
    const term = line.slice(0, at).trim();
    const definition = line.slice(at + sep.length).trim();
    if (!term && !definition) { skipped++; continue; }
    rows.push({ term, definition });
  }
  return { rows, skipped };
}

/** Guess the term separator from the first few lines. */
export function guessTermSep(text: string): TermSep {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  if (!lines.length) return "tab";
  const share = (s: string) => lines.filter((l) => l.includes(s)).length / lines.length;
  if (share("\t") >= 0.6) return "tab";
  if (share(" - ") >= 0.6) return "dash";
  if (share(",") >= 0.6) return "comma";
  return "tab";
}
