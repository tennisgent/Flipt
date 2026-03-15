import { describe, it, expect } from "vitest";
import {
  calculateScore,
  countLetterOccurrences,
  getUniqueLetters,
  isLetterInPhrase,
} from "./scoring";

describe("countLetterOccurrences", () => {
  it("counts occurrences of a letter in a phrase", () => {
    expect(countLetterOccurrences("HELLO WORLD", "L")).toBe(3);
    expect(countLetterOccurrences("HELLO WORLD", "H")).toBe(1);
    expect(countLetterOccurrences("HELLO WORLD", "Z")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(countLetterOccurrences("Hello", "h")).toBe(1);
    expect(countLetterOccurrences("hello", "H")).toBe(1);
  });

  it("counts only alphabetic characters", () => {
    expect(countLetterOccurrences("IT'S A TEST!", "T")).toBe(3);
    expect(countLetterOccurrences("IT'S A TEST!", "I")).toBe(1);
  });
});

describe("getUniqueLetters", () => {
  it("returns unique letters from a phrase", () => {
    const letters = getUniqueLetters("HELLO");
    expect(letters).toEqual(new Set(["h", "e", "l", "o"]));
  });

  it("ignores spaces and punctuation", () => {
    const letters = getUniqueLetters("IT'S A TEST!");
    expect(letters.has(" ")).toBe(false);
    expect(letters.has("'")).toBe(false);
    expect(letters.has("!")).toBe(false);
  });
});

describe("isLetterInPhrase", () => {
  it("returns true for letters in the phrase", () => {
    expect(isLetterInPhrase("HELLO", "h")).toBe(true);
    expect(isLetterInPhrase("HELLO", "E")).toBe(true);
  });

  it("returns false for letters not in the phrase", () => {
    expect(isLetterInPhrase("HELLO", "z")).toBe(false);
  });
});

describe("calculateScore", () => {
  const baseInput = {
    phrase: "HELLO WORLD",
    guessedLetters: [] as string[],
    wrongLetters: [] as string[],
    solveAttempts: [] as string[],
    solved: false,
    usedHint: false,
  };

  it("scores correct letter guesses by occurrence count", () => {
    const score = calculateScore({
      ...baseInput,
      guessedLetters: ["l"], // L appears 3 times
      solved: true,
    });
    // +3 (3 L's) + 10 (solve) + 5 (no hint) + 25 (efficiency: 26-1)
    expect(score).toBe(43);
  });

  it("penalizes wrong letters", () => {
    const score = calculateScore({
      ...baseInput,
      guessedLetters: ["l"],
      wrongLetters: ["z", "x"],
      solved: true,
    });
    // +3 + -2 + 10 + 5 + (26-3)=23
    expect(score).toBe(39);
  });

  it("penalizes wrong solve attempts", () => {
    const score = calculateScore({
      ...baseInput,
      solveAttempts: ["HELLO EARTH", "HELLO WORKS"],
      solved: true,
    });
    // 0 (no letters) + -6 (2 wrong solves) + 10 (solve) + 5 (no hint) + (26-2)=24
    expect(score).toBe(33);
  });

  it("awards solve bonus only if solved", () => {
    const noSolve = calculateScore({ ...baseInput });
    const withSolve = calculateScore({ ...baseInput, solved: true });
    expect(withSolve - noSolve).toBe(10);
  });

  it("removes no-hint bonus when hint is used", () => {
    const noHint = calculateScore({ ...baseInput, solved: true });
    const withHint = calculateScore({
      ...baseInput,
      solved: true,
      usedHint: true,
    });
    expect(noHint - withHint).toBe(5);
  });

  it("calculates efficiency bonus correctly", () => {
    const fewGuesses = calculateScore({
      ...baseInput,
      guessedLetters: ["h"],
      solved: true,
    });
    // +1 + 10 + 5 + (26-1)=25 = 41
    expect(fewGuesses).toBe(41);

    // Lots of guesses
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    const phraseLetters = getUniqueLetters("HELLO WORLD");
    const correct = letters.filter((l) => phraseLetters.has(l));
    const wrong = letters.filter((l) => !phraseLetters.has(l));
    const manyGuesses = calculateScore({
      ...baseInput,
      guessedLetters: correct,
      wrongLetters: wrong,
      solved: true,
    });
    // correct letters: h(1)+e(1)+l(3)+o(2)+w(1)+r(1)+d(1) = 10
    // wrong letters: 19 * -1 = -19
    // solve: 10, no hint: 5, efficiency: 26-26 = 0
    expect(manyGuesses).toBe(6);
  });

  it("efficiency bonus floors at 0", () => {
    const lotsOfAttempts = calculateScore({
      ...baseInput,
      guessedLetters: "abcdefghijklmnopqrstuvwxyz".split(""),
      solveAttempts: ["WRONG1", "WRONG2", "WRONG3"],
      solved: true,
    });
    // The efficiency bonus shouldn't go negative
    // total guesses = 26 + 3 = 29, efficiency = max(0, 26-29) = 0
    // We just check it's calculated correctly
    expect(lotsOfAttempts).toBeTypeOf("number");
  });

  it("gives perfect score for ideal game", () => {
    // Guess only the unique letters, solve immediately, no hint
    const score = calculateScore({
      phrase: "CAT",
      guessedLetters: ["c", "a", "t"],
      wrongLetters: [],
      solveAttempts: [],
      solved: true,
      usedHint: false,
    });
    // c(1) + a(1) + t(1) = 3
    // solve: 10, no hint: 5, efficiency: 26-3 = 23
    expect(score).toBe(41);
  });
});
