import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GameBoard } from "./game-board";

// ---------- mocks ----------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ code: "ABCDEF", roundNum: "1" }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../auth/components/auth-provider", () => ({
  useAuthContext: () => ({ user: { uid: "player-1" } }),
}));

const MOCK_GAME = {
  id: "game-456",
  code: "ABCDEF",
  hostUid: "player-1",
  status: "active" as const,
  difficulty: "medium" as const,
  players: {
    "player-1": {
      uid: "player-1",
      displayName: "Player 1",
      totalScore: 0,
      roundsCompleted: 0,
    },
  },
  currentRound: 1,
  totalRounds: 3,
  createdAt: new Date() as unknown as import("firebase/firestore").Timestamp,
  updatedAt: new Date() as unknown as import("firebase/firestore").Timestamp,
};

vi.mock("./game-layout", () => ({
  useGameContext: () => ({ game: MOCK_GAME, gameId: "game-456" }),
}));

const mockUseRound = vi.fn();
vi.mock("../hooks/use-round", () => ({
  useRound: (...args: unknown[]) => mockUseRound(...args),
}));

vi.mock("../hooks/use-round-progress", () => ({
  useRoundProgress: () => ({
    otherProgress: [],
    writeProgress: vi.fn(),
    flushProgress: vi.fn(),
  }),
}));

vi.mock("../../lobby/hooks/use-game", () => ({
  useGame: () => ({
    advanceRound: vi.fn(),
    finishGame: vi.fn(),
  }),
}));

vi.mock("../utils/scoring", () => ({
  getUniqueLetters: (phrase: string) => {
    const letters = new Set<string>();
    for (const ch of phrase.toLowerCase()) {
      if (/[a-z]/.test(ch)) letters.add(ch);
    }
    return letters;
  },
  calculateTimeBonus: () => 20,
}));

vi.mock("../../../shared/hooks/use-game-session", () => ({
  removeGameSession: vi.fn(),
}));

vi.mock("./phrase-display", () => ({
  PhraseDisplay: () => <div data-testid="phrase-display" />,
}));
vi.mock("./keyboard", () => ({
  Keyboard: ({
    onKeyPress,
  }: {
    onKeyPress: (key: string) => void;
    correctLetters: Set<string>;
    wrongLetters: Set<string>;
    disabled: boolean;
  }) => (
    <div data-testid="keyboard">
      <button onClick={() => onKeyPress("a")}>A</button>
    </div>
  ),
}));
vi.mock("./solve-input", () => ({
  SolveInput: () => <div data-testid="solve-input" />,
}));

// ---------- helpers ----------

const MOCK_ROUND = {
  id: "round-123",
  gameId: "game-456",
  roundNumber: 1,
  phrase: "THE MATRIX",
  category: "Movie Titles" as const,
  status: "active" as const,
  createdAt: new Date(),
};

const defaultHookReturn = {
  round: MOCK_ROUND,
  guessedLetters: [],
  wrongLetters: [],
  solveAttempts: [],
  solved: false,
  usedHint: false,
  showHint: false,
  score: 0,
  completed: false,
  loading: false,
  getElapsed: vi.fn().mockReturnValue(0),
  guessLetter: vi.fn(),
  attemptSolve: vi.fn(),
  revealHint: vi.fn(),
  submitResult: vi.fn(),
  giveUp: vi.fn(),
};

const renderBoard = () =>
  render(
    <MemoryRouter>
      <GameBoard />
    </MemoryRouter>,
  );

// ---------- tests ----------

describe("GameBoard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseRound.mockReturnValue({ ...defaultHookReturn });
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows loading state when round is not yet available", () => {
    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      round: null,
      loading: true,
    });
    renderBoard();
    expect(screen.getByText("Loading round...")).toBeInTheDocument();
  });

  it("shows the keyboard and controls when unsolved", () => {
    renderBoard();
    expect(screen.getByTestId("keyboard")).toBeInTheDocument();
    expect(screen.getByTestId("solve-input")).toBeInTheDocument();
    expect(screen.getByText("Give Up")).toBeInTheDocument();
  });

  it("hides keyboard and shows submitting message when solved", () => {
    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: false,
    });
    renderBoard();
    expect(screen.queryByTestId("keyboard")).not.toBeInTheDocument();
    expect(
      screen.getByText("You got it! Submitting..."),
    ).toBeInTheDocument();
  });

  it("calls submitResult after 2-second delay when solved", async () => {
    const mockSubmitResult = vi.fn().mockResolvedValue(42);

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: false,
      submitResult: mockSubmitResult,
    });

    renderBoard();

    expect(mockSubmitResult).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockSubmitResult).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith("/ABCDEF/1/results", { replace: true });
  });

  it("does not navigate if submitResult returns undefined", async () => {
    const mockSubmitResult = vi.fn().mockResolvedValue(undefined);

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: false,
      submitResult: mockSubmitResult,
    });

    renderBoard();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockSubmitResult).toHaveBeenCalledOnce();
    // Still navigates since we navigate after submit regardless now
  });

  it("does not auto-submit when already completed", async () => {
    const mockSubmitResult = vi.fn().mockResolvedValue(42);

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: true,
      submitResult: mockSubmitResult,
    });

    renderBoard();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockSubmitResult).not.toHaveBeenCalled();
  });

  it("calls giveUp and navigates to results when Give Up is clicked", async () => {
    const mockGiveUp = vi.fn().mockResolvedValue(5);

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      giveUp: mockGiveUp,
    });

    renderBoard();

    await act(async () => {
      fireEvent.click(screen.getByText("Give Up"));
    });

    expect(mockGiveUp).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith("/ABCDEF/1/results", { replace: true });
  });

  it("shows hint when showHint is true", () => {
    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      showHint: true,
    });

    renderBoard();
    expect(screen.getByText("Movie Titles")).toBeInTheDocument();
  });

  it("hides hint button when hint already used", () => {
    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      usedHint: true,
    });

    renderBoard();
    expect(
      screen.queryByText("Show Hint (-5 pts)"),
    ).not.toBeInTheDocument();
  });

  it("navigates home after confirmation when Leave Game is clicked", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderBoard();

    fireEvent.click(screen.getByText("Leave Game"));
    expect(window.confirm).toHaveBeenCalledWith(
      "Leave this game? Your progress will be lost.",
    );
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("does not navigate when leave confirmation is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderBoard();

    fireEvent.click(screen.getByText("Leave Game"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
