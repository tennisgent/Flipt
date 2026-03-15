import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { GameBoard } from "./game-board";

// ---------- mocks ----------

// Mock useAuthContext to return a fake user
vi.mock("../../auth/components/auth-provider", () => ({
  useAuthContext: () => ({ user: { uid: "player-1" } }),
}));

// We'll control what useRound returns per-test
const mockUseRound = vi.fn();
vi.mock("../hooks/use-round", () => ({
  useRound: (...args: unknown[]) => mockUseRound(...args),
}));

// Stub child components so we don't need their internals
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
  guessLetter: vi.fn(),
  attemptSolve: vi.fn(),
  revealHint: vi.fn(),
  submitResult: vi.fn(),
  giveUp: vi.fn(),
};

const renderBoard = (onRoundComplete = vi.fn()) =>
  render(
    <GameBoard
      gameId="game-456"
      roundNumber={1}
      onRoundComplete={onRoundComplete}
    />,
  );

// ---------- tests ----------

describe("GameBoard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseRound.mockReturnValue({ ...defaultHookReturn });
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
    const onRoundComplete = vi.fn();

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: false,
      submitResult: mockSubmitResult,
    });

    renderBoard(onRoundComplete);

    // Timer hasn't fired yet
    expect(mockSubmitResult).not.toHaveBeenCalled();

    // Advance past the 2-second delay
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockSubmitResult).toHaveBeenCalledOnce();
    expect(onRoundComplete).toHaveBeenCalledWith(
      42,
      "round-123",
      "THE MATRIX",
    );
  });

  it("does not call onRoundComplete if submitResult returns undefined", async () => {
    const mockSubmitResult = vi.fn().mockResolvedValue(undefined);
    const onRoundComplete = vi.fn();

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: false,
      submitResult: mockSubmitResult,
    });

    renderBoard(onRoundComplete);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockSubmitResult).toHaveBeenCalledOnce();
    expect(onRoundComplete).not.toHaveBeenCalled();
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

  it("submits only once even with multiple re-renders", async () => {
    const mockSubmitResult = vi.fn().mockResolvedValue(42);
    const onRoundComplete = vi.fn();

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: false,
      submitResult: mockSubmitResult,
    });

    const { rerender } = render(
      <GameBoard
        gameId="game-456"
        roundNumber={1}
        onRoundComplete={onRoundComplete}
      />,
    );

    // Re-render multiple times (simulating state changes that would
    // previously have cancelled the timer)
    const freshSubmitResult = vi.fn().mockResolvedValue(42);
    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      completed: false,
      submitResult: freshSubmitResult,
    });

    rerender(
      <GameBoard
        gameId="game-456"
        roundNumber={1}
        onRoundComplete={onRoundComplete}
      />,
    );

    // A third re-render
    rerender(
      <GameBoard
        gameId="game-456"
        roundNumber={1}
        onRoundComplete={onRoundComplete}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // The latest submitResult ref should be called (not the original)
    // and it should only be called once total
    const totalCalls =
      mockSubmitResult.mock.calls.length +
      freshSubmitResult.mock.calls.length;
    expect(totalCalls).toBe(1);
    expect(onRoundComplete).toHaveBeenCalledOnce();
  });

  it("calls giveUp and onRoundComplete when Give Up is clicked", async () => {
    const mockGiveUp = vi.fn().mockResolvedValue(5);
    const onRoundComplete = vi.fn();

    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      giveUp: mockGiveUp,
    });

    renderBoard(onRoundComplete);

    await act(async () => {
      fireEvent.click(screen.getByText("Give Up"));
    });

    expect(mockGiveUp).toHaveBeenCalledOnce();
    expect(onRoundComplete).toHaveBeenCalledWith(
      5,
      "round-123",
      "THE MATRIX",
    );
  });

  it("forwards keyboard events to guessLetter", () => {
    const mockGuessLetter = vi.fn();
    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      guessLetter: mockGuessLetter,
    });

    renderBoard();

    fireEvent.keyDown(window, { key: "t" });
    expect(mockGuessLetter).toHaveBeenCalledWith("t");

    fireEvent.keyDown(window, { key: "E" });
    expect(mockGuessLetter).toHaveBeenCalledWith("e");
  });

  it("ignores keyboard events when solved", () => {
    const mockGuessLetter = vi.fn();
    mockUseRound.mockReturnValue({
      ...defaultHookReturn,
      solved: true,
      guessLetter: mockGuessLetter,
    });

    renderBoard();

    fireEvent.keyDown(window, { key: "t" });
    expect(mockGuessLetter).not.toHaveBeenCalled();
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
});
