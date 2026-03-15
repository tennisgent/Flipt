import type { Difficulty, PhraseCategory } from "../../../lib/types";

type PhraseDifficulty = "easy" | "medium" | "hard";

interface PhraseEntry {
  text: string;
  category: PhraseCategory;
  difficulty: PhraseDifficulty;
}

// Letter frequency in English (higher = more common)
const LETTER_FREQ: Record<string, number> = {
  e: 13, t: 9.1, a: 8.2, o: 7.5, i: 7, n: 6.7, s: 6.3, h: 6.1,
  r: 6, d: 4.3, l: 4, c: 2.8, u: 2.8, m: 2.4, w: 2.4, f: 2.2,
  g: 2, y: 2, p: 1.9, b: 1.5, v: 1, k: 0.8, j: 0.15, x: 0.15,
  q: 0.1, z: 0.07,
};

/**
 * Calculates a difficulty score for a phrase.
 * Higher score = harder phrase.
 *
 * Factors:
 * - Unique letter count (more unique letters = harder to guess)
 * - Total length (longer phrases have more tiles to decode visually)
 * - Letter rarity (uncommon letters are harder to guess)
 */
export const calculatePhraseDifficulty = (text: string): number => {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  const unique = new Set(letters);

  // Factor 1: Unique letter count (range ~3-16)
  const uniqueCount = unique.size;

  // Factor 2: Total letter count (range ~5-30)
  const totalLetters = letters.length;

  // Factor 3: Average letter rarity (invert frequency so rare = high)
  let raritySum = 0;
  for (const ch of unique) {
    raritySum += 14 - (LETTER_FREQ[ch] || 0); // 14 is above max freq
  }
  const avgRarity = raritySum / unique.size;

  // Weighted combination
  return uniqueCount * 3 + totalLetters * 0.5 + avgRarity * 2;
};

/**
 * Classifies a numeric difficulty score into easy/medium/hard.
 * Thresholds tuned against the current phrase bank.
 */
const classifyDifficulty = (score: number): PhraseDifficulty => {
  if (score < 54) return "easy";
  if (score < 61) return "medium";
  return "hard";
};

const makePhraseEntry = (
  text: string,
  category: PhraseCategory,
): PhraseEntry => ({
  text,
  category,
  difficulty: classifyDifficulty(calculatePhraseDifficulty(text)),
});

export const PHRASES: PhraseEntry[] = [
  // Movie Titles
  makePhraseEntry("THE SHAWSHANK REDEMPTION", "Movie Titles"),
  makePhraseEntry("BACK TO THE FUTURE", "Movie Titles"),
  makePhraseEntry("THE WIZARD OF OZ", "Movie Titles"),
  makePhraseEntry("JURASSIC PARK", "Movie Titles"),
  makePhraseEntry("THE LION KING", "Movie Titles"),
  makePhraseEntry("FORREST GUMP", "Movie Titles"),
  makePhraseEntry("THE DARK KNIGHT", "Movie Titles"),
  makePhraseEntry("PULP FICTION", "Movie Titles"),
  makePhraseEntry("FINDING NEMO", "Movie Titles"),
  makePhraseEntry("THE MATRIX", "Movie Titles"),

  // Famous Quotes
  makePhraseEntry("TO BE OR NOT TO BE", "Famous Quotes"),
  makePhraseEntry("I THINK THEREFORE I AM", "Famous Quotes"),
  makePhraseEntry("HOUSTON WE HAVE A PROBLEM", "Famous Quotes"),
  makePhraseEntry("MAY THE FORCE BE WITH YOU", "Famous Quotes"),
  makePhraseEntry("THAT IS ONE SMALL STEP FOR MAN", "Famous Quotes"),
  makePhraseEntry("HERE LOOKING AT YOU KID", "Famous Quotes"),
  makePhraseEntry("LIFE IS LIKE A BOX OF CHOCOLATES", "Famous Quotes"),
  makePhraseEntry("YOU CANT HANDLE THE TRUTH", "Famous Quotes"),
  makePhraseEntry("ELEMENTARY MY DEAR WATSON", "Famous Quotes"),
  makePhraseEntry("I WILL BE BACK", "Famous Quotes"),

  // Song Lyrics
  makePhraseEntry("DONT STOP BELIEVING", "Song Lyrics"),
  makePhraseEntry("BOHEMIAN RHAPSODY", "Song Lyrics"),
  makePhraseEntry("IMAGINE ALL THE PEOPLE", "Song Lyrics"),
  makePhraseEntry("WE WILL ROCK YOU", "Song Lyrics"),
  makePhraseEntry("SWEET HOME ALABAMA", "Song Lyrics"),
  makePhraseEntry("STAIRWAY TO HEAVEN", "Song Lyrics"),
  makePhraseEntry("EVERY BREATH YOU TAKE", "Song Lyrics"),
  makePhraseEntry("DANCING IN THE MOONLIGHT", "Song Lyrics"),
  makePhraseEntry("THUNDER AND LIGHTNING", "Song Lyrics"),
  makePhraseEntry("WALKING ON SUNSHINE", "Song Lyrics"),

  // Food & Drink
  makePhraseEntry("PEANUT BUTTER AND JELLY", "Food & Drink"),
  makePhraseEntry("CHICKEN NOODLE SOUP", "Food & Drink"),
  makePhraseEntry("STRAWBERRY SHORTCAKE", "Food & Drink"),
  makePhraseEntry("MACARONI AND CHEESE", "Food & Drink"),
  makePhraseEntry("CHOCOLATE CHIP COOKIES", "Food & Drink"),
  makePhraseEntry("BANANA SPLIT SUNDAE", "Food & Drink"),
  makePhraseEntry("FRESH SQUEEZED LEMONADE", "Food & Drink"),
  makePhraseEntry("GRILLED CHEESE SANDWICH", "Food & Drink"),
  makePhraseEntry("PEPPERONI PIZZA", "Food & Drink"),
  makePhraseEntry("BLUEBERRY PANCAKES", "Food & Drink"),

  // Places
  makePhraseEntry("GRAND CANYON", "Places"),
  makePhraseEntry("STATUE OF LIBERTY", "Places"),
  makePhraseEntry("GREAT WALL OF CHINA", "Places"),
  makePhraseEntry("EIFFEL TOWER", "Places"),
  makePhraseEntry("MOUNT EVEREST", "Places"),
  makePhraseEntry("GOLDEN GATE BRIDGE", "Places"),
  makePhraseEntry("NIAGARA FALLS", "Places"),
  makePhraseEntry("CENTRAL PARK", "Places"),
  makePhraseEntry("TIMES SQUARE", "Places"),
  makePhraseEntry("SILICON VALLEY", "Places"),

  // Idioms
  makePhraseEntry("BREAK A LEG", "Idioms"),
  makePhraseEntry("PIECE OF CAKE", "Idioms"),
  makePhraseEntry("BITE THE BULLET", "Idioms"),
  makePhraseEntry("UNDER THE WEATHER", "Idioms"),
  makePhraseEntry("HIT THE NAIL ON THE HEAD", "Idioms"),
  makePhraseEntry("COST AN ARM AND A LEG", "Idioms"),
  makePhraseEntry("BLESSING IN DISGUISE", "Idioms"),
  makePhraseEntry("ONCE IN A BLUE MOON", "Idioms"),
  makePhraseEntry("BURNING THE MIDNIGHT OIL", "Idioms"),
  makePhraseEntry("THE BEST OF BOTH WORLDS", "Idioms"),

  // Pop Culture
  makePhraseEntry("GAME OF THRONES", "Pop Culture"),
  makePhraseEntry("STRANGER THINGS", "Pop Culture"),
  makePhraseEntry("TAYLOR SWIFT ERA", "Pop Culture"),
  makePhraseEntry("SUPER MARIO BROTHERS", "Pop Culture"),
  makePhraseEntry("HARRY POTTER", "Pop Culture"),
  makePhraseEntry("STAR WARS SAGA", "Pop Culture"),
  makePhraseEntry("POKEMON MASTER", "Pop Culture"),
  makePhraseEntry("MINECRAFT WORLD", "Pop Culture"),
  makePhraseEntry("SOCIAL MEDIA INFLUENCER", "Pop Culture"),
  makePhraseEntry("VIRAL INTERNET CHALLENGE", "Pop Culture"),

  // Sports
  makePhraseEntry("WORLD SERIES CHAMPION", "Sports"),
  makePhraseEntry("TOUCHDOWN CELEBRATION", "Sports"),
  makePhraseEntry("SLAM DUNK CONTEST", "Sports"),
  makePhraseEntry("OLYMPIC GOLD MEDAL", "Sports"),
  makePhraseEntry("GRAND SLAM WINNER", "Sports"),
  makePhraseEntry("HOLE IN ONE", "Sports"),
  makePhraseEntry("SUPER BOWL HALFTIME", "Sports"),
  makePhraseEntry("PENALTY SHOOTOUT", "Sports"),
  makePhraseEntry("TRIPLE CROWN WINNER", "Sports"),
  makePhraseEntry("MARATHON FINISH LINE", "Sports"),

  // Science & Nature
  makePhraseEntry("NORTHERN LIGHTS AURORA", "Science & Nature"),
  makePhraseEntry("MILKY WAY GALAXY", "Science & Nature"),
  makePhraseEntry("THEORY OF RELATIVITY", "Science & Nature"),
  makePhraseEntry("PHOTOSYNTHESIS PROCESS", "Science & Nature"),
  makePhraseEntry("PERIODIC TABLE OF ELEMENTS", "Science & Nature"),
  makePhraseEntry("RAINFOREST ECOSYSTEM", "Science & Nature"),
  makePhraseEntry("SOLAR ECLIPSE", "Science & Nature"),
  makePhraseEntry("CORAL REEF HABITAT", "Science & Nature"),
  makePhraseEntry("GRAVITATIONAL PULL", "Science & Nature"),
  makePhraseEntry("VOLCANIC ERUPTION", "Science & Nature"),

  // History
  makePhraseEntry("DECLARATION OF INDEPENDENCE", "History"),
  makePhraseEntry("ANCIENT EGYPTIAN PYRAMID", "History"),
  makePhraseEntry("INDUSTRIAL REVOLUTION", "History"),
  makePhraseEntry("RENAISSANCE MASTERPIECE", "History"),
  makePhraseEntry("ROMAN COLOSSEUM", "History"),
  makePhraseEntry("SILK ROAD TRADE ROUTE", "History"),
  makePhraseEntry("BOSTON TEA PARTY", "History"),
  makePhraseEntry("WRIGHT BROTHERS FLIGHT", "History"),
  makePhraseEntry("MOON LANDING MISSION", "History"),
  makePhraseEntry("CIVIL RIGHTS MOVEMENT", "History"),
];

/**
 * For "ramping" mode: maps round progress to a difficulty tier.
 * Early rounds are easy, middle rounds are medium, late rounds are hard.
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
 * Gets a random phrase matching the difficulty setting.
 */
export const getRandomPhrase = (
  excludeTexts: string[] = [],
  difficulty: Difficulty = "medium",
  roundNumber: number = 1,
  totalRounds: number = 5,
): PhraseEntry => {
  const targetDifficulty: PhraseDifficulty =
    difficulty === "ramping"
      ? getRampingDifficulty(roundNumber, totalRounds)
      : difficulty;

  // First try to match exact difficulty
  let available = PHRASES.filter(
    (p) =>
      !excludeTexts.includes(p.text) && p.difficulty === targetDifficulty,
  );

  // Fallback: if not enough phrases, widen to all unused
  if (available.length === 0) {
    available = PHRASES.filter((p) => !excludeTexts.includes(p.text));
  }

  if (available.length === 0) {
    throw new Error("No more phrases available");
  }

  const index = Math.floor(Math.random() * available.length);
  return available[index];
};

/**
 * Returns counts of phrases per difficulty level (for debugging/balancing).
 */
export const getPhraseCounts = (): Record<PhraseDifficulty, number> => {
  const counts: Record<PhraseDifficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  for (const phrase of PHRASES) {
    counts[phrase.difficulty]++;
  }
  return counts;
};
