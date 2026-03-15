import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculatePhraseDifficulty, classifyDifficulty } from "./phrases";

// Mock firebase/firestore so we don't need a real Firestore instance
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
}));

vi.mock("../../../lib/firebase", () => ({
  db: {},
}));

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

describe("classifyDifficulty", () => {
  it("classifies low scores as easy", () => {
    expect(classifyDifficulty(40)).toBe("easy");
    expect(classifyDifficulty(53)).toBe("easy");
  });

  it("classifies mid scores as medium", () => {
    expect(classifyDifficulty(54)).toBe("medium");
    expect(classifyDifficulty(60)).toBe("medium");
  });

  it("classifies high scores as hard", () => {
    expect(classifyDifficulty(61)).toBe("hard");
    expect(classifyDifficulty(80)).toBe("hard");
  });
});

describe("getRandomPhrase", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a phrase from Firestore query results", async () => {
    const { getDocs } = await import("firebase/firestore");
    const mockedGetDocs = vi.mocked(getDocs);
    mockedGetDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            text: "JURASSIC PARK",
            category: "Movie Titles",
            difficulty: "easy",
            rand: 0.5,
          }),
        },
      ],
    } as never);

    const { getRandomPhrase } = await import("./phrases");
    const result = await getRandomPhrase([], "easy");
    expect(result.text).toBe("JURASSIC PARK");
    expect(result.category).toBe("Movie Titles");
    expect(result.difficulty).toBe("easy");
  });

  it("skips excluded phrases and picks the next one", async () => {
    const { getDocs } = await import("firebase/firestore");
    const mockedGetDocs = vi.mocked(getDocs);
    mockedGetDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            text: "JURASSIC PARK",
            category: "Movie Titles",
            difficulty: "easy",
            rand: 0.5,
          }),
        },
        {
          data: () => ({
            text: "THE LION KING",
            category: "Movie Titles",
            difficulty: "easy",
            rand: 0.6,
          }),
        },
      ],
    } as never);

    const { getRandomPhrase } = await import("./phrases");
    const result = await getRandomPhrase(["JURASSIC PARK"], "easy");
    expect(result.text).toBe("THE LION KING");
  });

  it("throws when no phrases are available", async () => {
    const { getDocs } = await import("firebase/firestore");
    const mockedGetDocs = vi.mocked(getDocs);
    // Return empty for all attempts (3 attempts * 2 directions + fallback * 2)
    mockedGetDocs.mockResolvedValue({ docs: [] } as never);

    const { getRandomPhrase } = await import("./phrases");
    await expect(getRandomPhrase([], "easy")).rejects.toThrow(
      "No more phrases available",
    );
  });
});
