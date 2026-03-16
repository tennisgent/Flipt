import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useRound } from "../hooks/use-round";
import { PhraseDisplay } from "./phrase-display";
import { Keyboard } from "./keyboard";
import { SolveInput } from "./solve-input";
import "./game-board.css";

interface GameBoardProps {
  gameId: string;
  roundNumber: number;
  onRoundComplete: (score: number, roundId: string, phrase: string) => void;
  onLeave: () => void;
}

export const GameBoard = ({
  gameId,
  roundNumber,
  onRoundComplete,
  onLeave,
}: GameBoardProps) => {
  const { user } = useAuthContext();
  const {
    round,
    guessedLetters,
    wrongLetters,
    solveAttempts,
    solved,
    usedHint,
    showHint,
    score,
    completed,
    loading,
    guessLetter,
    attemptSolve,
    revealHint,
    submitResult,
    giveUp,
  } = useRound(gameId, user?.uid || "", roundNumber);

  // Use refs for the auto-submit effect to avoid re-runs that cancel the timer.
  // If any of these were in the dependency array, changing them would re-trigger
  // the effect, run cleanup (clearTimeout), and kill the pending submission.
  const submittedRef = useRef(false);
  const submitResultRef = useRef(submitResult);
  submitResultRef.current = submitResult;
  const onRoundCompleteRef = useRef(onRoundComplete);
  onRoundCompleteRef.current = onRoundComplete;

  const revealedLetters = new Set(guessedLetters);
  const wrongLetterSet = new Set(wrongLetters);

  // Handle physical keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (solved || completed) return;
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        guessLetter(key);
      }
    },
    [guessLetter, solved, completed],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-submit when solved
  useEffect(() => {
    if (solved && !submittedRef.current && !completed && round) {
      submittedRef.current = true;
      const timer = setTimeout(async () => {
        const finalScore = await submitResultRef.current();
        if (finalScore !== undefined) {
          onRoundCompleteRef.current(finalScore, round.id, round.phrase);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [solved, completed, round]);

  // If round was already completed (e.g. page refresh after submitting),
  // skip straight to round results using the score from the existing result.
  useEffect(() => {
    if (completed && round && submittedRef.current === false) {
      submittedRef.current = true;
      onRoundCompleteRef.current(score, round.id, round.phrase);
    }
  }, [completed, round, score]);

  const handleGiveUp = useCallback(async () => {
    if (!round) return;
    const finalScore = await giveUp();
    if (finalScore !== undefined) {
      onRoundComplete(finalScore, round.id, round.phrase);
    }
  }, [giveUp, onRoundComplete, round]);

  const handleLeave = useCallback(() => {
    if (window.confirm("Leave this game? Your progress will be lost.")) {
      onLeave();
    }
  }, [onLeave]);

  if (loading || !round) {
    return (
      <div className="game-board">
        <div className="game-board__loading">Loading round...</div>
      </div>
    );
  }

  return (
    <div className="game-board">
      <div className="game-board__header">
        <span className="game-board__round">Round {roundNumber}</span>
        <div className="game-board__stats">
          <span className="game-board__stat">
            {wrongLetters.length} miss{wrongLetters.length !== 1 ? "es" : ""}
          </span>
        </div>
      </div>

      {showHint && (
        <div className="game-board__hint">
          <span className="game-board__hint-label">Category:</span>{" "}
          {round.category}
        </div>
      )}

      <PhraseDisplay
        phrase={round.phrase}
        revealedLetters={revealedLetters}
        solved={solved || completed}
      />

      <div className="game-board__controls">
        {!solved && !completed && (
          <>
            <Keyboard
              correctLetters={revealedLetters}
              wrongLetters={wrongLetterSet}
              onKeyPress={guessLetter}
              disabled={false}
            />

            <div className="game-board__actions">
              <SolveInput
                onSolve={attemptSolve}
                disabled={false}
                attemptsLeft={3 - solveAttempts.length}
              />

              <div className="game-board__secondary-actions">
                {!usedHint && (
                  <button
                    className="game-board__hint-button"
                    onClick={revealHint}
                  >
                    Show Hint (-5 pts)
                  </button>
                )}
                <button
                  className="game-board__give-up-button"
                  onClick={handleGiveUp}
                >
                  Give Up
                </button>
              </div>
            </div>

            {solveAttempts.length > 0 && (
              <p className="game-board__attempts">
                Wrong solve attempts: {solveAttempts.length} (-
                {solveAttempts.length * 3} pts)
              </p>
            )}
          </>
        )}

        {solved && !completed && (
          <div className="game-board__solving">
            <p className="game-board__solving-text">
              You got it! Submitting...
            </p>
          </div>
        )}
      </div>

      <button className="game-board__leave" onClick={handleLeave}>
        Leave Game
      </button>
    </div>
  );
};
