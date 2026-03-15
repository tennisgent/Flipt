const CORRECT_LETTER_POINTS = 1;
const INCORRECT_LETTER_PENALTY = -1;
const WRONG_SOLVE_PENALTY = -3;
const SOLVE_BONUS = 10;
const NO_HINT_BONUS = 5;
const MAX_GUESSES_FOR_EFFICIENCY = 26;

interface ScoreInput {
  phrase: string;
  guessedLetters: string[];
  wrongLetters: string[];
  solveAttempts: string[];
  solved: boolean;
  usedHint: boolean;
}

export const countLetterOccurrences = (
  phrase: string,
  letter: string,
): number => {
  const normalized = phrase.toLowerCase();
  return [...normalized].filter((ch) => ch === letter.toLowerCase()).length;
};

export const getUniqueLetters = (phrase: string): Set<string> => {
  const letters = new Set<string>();
  for (const ch of phrase.toLowerCase()) {
    if (/[a-z]/.test(ch)) {
      letters.add(ch);
    }
  }
  return letters;
};

export const calculateScore = (input: ScoreInput): number => {
  let score = 0;

  const phraseLetters = getUniqueLetters(input.phrase);

  // +1 per occurrence for each correct guess
  for (const letter of input.guessedLetters) {
    if (phraseLetters.has(letter.toLowerCase())) {
      score += countLetterOccurrences(input.phrase, letter) * CORRECT_LETTER_POINTS;
    }
  }

  // -1 per wrong letter
  score += input.wrongLetters.length * INCORRECT_LETTER_PENALTY;

  // -3 per wrong solve attempt
  score += input.solveAttempts.length * WRONG_SOLVE_PENALTY;

  // +10 for solving
  if (input.solved) {
    score += SOLVE_BONUS;
  }

  // +5 no-hint bonus
  if (!input.usedHint) {
    score += NO_HINT_BONUS;
  }

  // Efficiency bonus: +(26 - total guesses), min 0
  const totalGuesses =
    input.guessedLetters.length +
    input.wrongLetters.length +
    input.solveAttempts.length;
  const efficiencyBonus = Math.max(
    0,
    MAX_GUESSES_FOR_EFFICIENCY - totalGuesses,
  );
  score += efficiencyBonus;

  return score;
};

export const isLetterInPhrase = (phrase: string, letter: string): boolean => {
  return getUniqueLetters(phrase).has(letter.toLowerCase());
};
