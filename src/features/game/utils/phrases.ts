import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { Difficulty, PhraseCategory } from "../../../lib/types";

type PhraseDifficulty = "easy" | "medium" | "hard";

export interface PhraseEntry {
  text: string;
  category: PhraseCategory;
  difficulty: PhraseDifficulty;
}

// ── Difficulty scoring (also used by the seed script) ──────────────────

const LETTER_FREQ: Record<string, number> = {
  e: 13, t: 9.1, a: 8.2, o: 7.5, i: 7, n: 6.7, s: 6.3, h: 6.1,
  r: 6, d: 4.3, l: 4, c: 2.8, u: 2.8, m: 2.4, w: 2.4, f: 2.2,
  g: 2, y: 2, p: 1.9, b: 1.5, v: 1, k: 0.8, j: 0.15, x: 0.15,
  q: 0.1, z: 0.07,
};

export const calculatePhraseDifficulty = (text: string): number => {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  const unique = new Set(letters);
  const uniqueCount = unique.size;
  const totalLetters = letters.length;
  let raritySum = 0;
  for (const ch of unique) {
    raritySum += 14 - (LETTER_FREQ[ch] || 0);
  }
  const avgRarity = raritySum / unique.size;
  return uniqueCount * 3 + totalLetters * 0.5 + avgRarity * 2;
};

export const classifyDifficulty = (score: number): PhraseDifficulty => {
  if (score < 54) return "easy";
  if (score < 61) return "medium";
  return "hard";
};

/**
 * For "ramping" mode: maps round progress to a difficulty tier.
 */
const getRampingDifficulty = (
  roundNumber: number,
  totalRounds: number,
): PhraseDifficulty => {
  const progress = roundNumber / totalRounds;
  if (progress <= 0.33) return "easy";
  if (progress <= 0.66) return "medium";
  return "hard";
};

/**
 * Fetches a random phrase from Firestore matching the difficulty setting.
 *
 * Uses a `rand` field stored on each phrase document. We generate a random
 * value and query for the nearest document above it (with a wraparound
 * fallback). This gives O(1) random selection without fetching all docs.
 *
 * Phrases whose text appears in `excludeTexts` are filtered client-side
 * after fetch. For typical game sizes (5-10 rounds) this is fine — we
 * fetch a small batch and retry if we hit an excluded phrase.
 */
export const getRandomPhrase = async (
  excludeTexts: string[] = [],
  difficulty: Difficulty = "medium",
  roundNumber: number = 1,
  totalRounds: number = 5,
): Promise<PhraseEntry> => {
  const targetDifficulty: PhraseDifficulty =
    difficulty === "ramping"
      ? getRampingDifficulty(roundNumber, totalRounds)
      : difficulty;

  const phrasesRef = collection(db, "phrases");
  const excludeSet = new Set(excludeTexts);

  // Try up to 3 random picks before falling back to a full scan
  for (let attempt = 0; attempt < 3; attempt++) {
    const rand = Math.random();

    // Try >= rand first, then wrap around with < rand
    for (const op of [">=" as const, "<" as const]) {
      const dir = op === ">=" ? "asc" : "desc";
      const q = query(
        phrasesRef,
        where("difficulty", "==", targetDifficulty),
        where("rand", op, rand),
        orderBy("rand", dir),
        limit(5), // fetch a small batch to increase chance of non-excluded hit
      );

      const snapshot = await getDocs(q);
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!excludeSet.has(data.text as string)) {
          return {
            text: data.text as string,
            category: data.category as PhraseCategory,
            difficulty: data.difficulty as PhraseDifficulty,
          };
        }
      }
    }
  }

  // Fallback: try ANY difficulty (still excluding used phrases)
  const rand = Math.random();
  for (const op of [">=" as const, "<" as const]) {
    const dir = op === ">=" ? "asc" : "desc";
    const q = query(
      phrasesRef,
      where("rand", op, rand),
      orderBy("rand", dir),
      limit(10),
    );

    const snapshot = await getDocs(q);
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!excludeSet.has(data.text as string)) {
        return {
          text: data.text as string,
          category: data.category as PhraseCategory,
          difficulty: data.difficulty as PhraseDifficulty,
        };
      }
    }
  }

  throw new Error("No more phrases available");
};
