import type { Card } from "../types";
import { shuffle, type Rng } from "./random";

export const MATCH_PAIRS = 6;
export const PENALTY_MS = 1000;

export interface Tile {
  id: string;      // unique tile id
  cardId: string;
  side: "term" | "definition";
  text: string;
}

export function buildBoard(cards: Card[], rng: Rng = Math.random, pairs = MATCH_PAIRS): Tile[] {
  // Skip cards whose term or meaning repeats, so every tile has exactly one partner.
  const seenT = new Set<string>();
  const seenD = new Set<string>();
  const usable = cards.filter((c) => {
    const t = c.term.trim(), d = c.definition.trim();
    if (!t || !d || seenT.has(t) || seenD.has(d)) return false;
    seenT.add(t); seenD.add(d);
    return true;
  });
  const chosen = shuffle(usable, rng).slice(0, pairs);
  const tiles: Tile[] = chosen.flatMap((c) => [
    { id: `${c.id}:t`, cardId: c.id, side: "term" as const, text: c.term },
    { id: `${c.id}:d`, cardId: c.id, side: "definition" as const, text: c.definition },
  ]);
  return shuffle(tiles, rng);
}

export function canPlay(cards: Card[]): boolean {
  return buildBoard(cards, () => 0.5, 2).length >= 4;
}

export function isPair(a: Tile, b: Tile): boolean {
  return a.cardId === b.cardId && a.side !== b.side;
}
