import type { Timestamp } from "firebase/firestore";

export interface Player {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface GamePlayer extends Player {
  totalScore: number;
  roundsCompleted: number;
}

export type Difficulty = "easy" | "medium" | "hard" | "ramping";

export interface Game {
  id: string;
  code: string;
  name: string;
  hostUid: string;
  status: GameStatus;
  difficulty: Difficulty;
  players: Record<string, GamePlayer>;
  currentRound: number;
  totalRounds: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GameStatus = "waiting" | "active" | "finished";

export interface Round {
  id: string;
  gameId: string;
  roundNumber: number;
  phrase: string;
  category: string;
  status: RoundStatus;
  createdAt: Timestamp;
}

export type RoundStatus = "active" | "completed";

export interface RoundResult {
  id: string;
  roundId: string;
  gameId: string;
  playerUid: string;
  guessedLetters: string[];
  wrongLetters: string[];
  solveAttempts: string[];
  solved: boolean;
  usedHint: boolean;
  score: number;
  completedAt: Timestamp;
}

export interface Phrase {
  id: string;
  text: string;
  category: PhraseCategory;
}

export type PhraseCategory =
  | "Movie Titles"
  | "Famous Quotes"
  | "Song Lyrics"
  | "Food & Drink"
  | "Places"
  | "Idioms"
  | "Pop Culture"
  | "Sports"
  | "Science & Nature"
  | "History";
