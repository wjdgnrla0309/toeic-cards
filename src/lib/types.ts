export type Visibility = "private" | "link" | "public";
export type Mastery = "new" | "learning" | "mastered";
export type StudyMode = "flashcards" | "learn" | "test" | "match";

export interface Card {
  id: string;
  term: string;
  definition: string;
  imageUrl?: string;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  visibility: Visibility;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
  lastStudiedAt?: string;
}

export interface CardProgress {
  cardId: string;
  correctStreak: number;
  timesSeen: number;
  starred: boolean;
  mastery: Mastery;
  lastSeenAt?: string;
}

export interface SetDraft {
  title: string;
  description: string;
  visibility: Visibility;
  cards: { id?: string; term: string; definition: string; imageUrl?: string }[];
}

export interface MatchRecord {
  setId: string;
  bestMs: number;
}
