import { describe, it, expect } from "vitest";
import {
  PHRASES,
  calculatePhraseDifficulty,
  getRandomPhrase,
  getPhraseCounts,
} from "./phrases";

describe("calculatePhraseDifficulty", () => {
  it("scores shorter common phrases lower", () => {
    const short = calculatePhraseDifficulty("THE MATRIX");
    const long = calculatePhraseDifficulty("PERIODIC TABLE OF ELEMENTS");
    expect(short).toBeLessThan(long);
  });

  it("scores phrases with rare letters higher", () => {
    const common = calculatePhraseDifficulty("TREE");
    const rare = calculatePhraseDifficulty("JAZZ");
    expect(rare).toBeGreaterThan(common);
  });
});

describe("phrase bank", () => {
  it("has 100 phrases", () => {
    expect(PHRASES).toHaveLength(100);
  });

  it("every phrase has a difficulty assigned", () => {
    for (const phrase of PHRASES) {
      expect(["easy", "medium", "hard"]).toContain(phrase.difficulty);
    }
  });

  it("has a reasonable distribution across difficulties", () => {
    const counts = getPhraseCounts();
    // Each tier should have at least 20 phrases
    expect(counts.easy).toBeGreaterThanOrEqual(20);
    expect(counts.medium).toBeGreaterThanOrEqual(20);
    expect(counts.hard).toBeGreaterThanOrEqual(20);
  });
});

describe("getRandomPhrase", () => {
  it("returns a phrase matching the requested difficulty", () => {
    const easy = getRandomPhrase([], "easy");
    expect(easy.difficulty).toBe("easy");

    const hard = getRandomPhrase([], "hard");
    expect(hard.difficulty).toBe("hard");
  });

  it("excludes already-used phrases", () => {
    const allEasyTexts = PHRASES.filter((p) => p.difficulty === "easy").map(
      (p) => p.text,
    );
    // Exclude all but one easy phrase
    const excludeAll = allEasyTexts.slice(1);
    const result = getRandomPhrase(excludeAll, "easy");
    expect(result.text).toBe(allEasyTexts[0]);
  });

  it("falls back to any difficulty when target is exhausted", () => {
    const allTexts = PHRASES.filter((p) => p.difficulty === "easy").map(
      (p) => p.text,
    );
    // Exclude ALL easy phrases
    const result = getRandomPhrase(allTexts, "easy");
    // Should still return something (medium or hard)
    expect(result.text).toBeTruthy();
    expect(result.difficulty).not.toBe("easy");
  });

  it("ramping mode gives easy phrases for early rounds", () => {
    // Round 1 of 5 should be easy
    const phrase = getRandomPhrase([], "ramping", 1, 5);
    expect(phrase.difficulty).toBe("easy");
  });

  it("ramping mode gives hard phrases for late rounds", () => {
    // Round 5 of 5 should be hard
    const phrase = getRandomPhrase([], "ramping", 5, 5);
    expect(phrase.difficulty).toBe("hard");
  });

  it("ramping mode gives medium phrases for middle rounds", () => {
    // Round 3 of 5 should be medium
    const phrase = getRandomPhrase([], "ramping", 3, 5);
    expect(phrase.difficulty).toBe("medium");
  });
});
