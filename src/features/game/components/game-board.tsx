import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useRound } from "../hooks/use-round";
import { useRoundProgress } from "../hooks/use-round-progress";
import { getUniqueLetters } from "../utils/scoring";
import { PhraseDisplay } from "./phrase-display";
import { Keyboard } from "./keyboard";
import { SolveInput } from "./solve-input";
import type { Game } from "../../../lib/types";
import "./game-board.css";

interface GameBoardProps {
  gameId: string;
  game: Game;
  roundNumber: number;
  onRoundComplete: (score: number, roundId: string, phrase: string) => void;
  onLeave: () => void;
}

export const GameBoard = ({
  gameId,
  game,
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

  const { otherProgress, writeProgress, flushProgress } = useRoundProgress(
    round?.id ?? null,
    gameId,
    user?.uid || "",
  );

  // Use refs for the auto-submit effect to avoid re-runs that cancel the timer.
  // If any of these were in the dependency array, changing them would re-trigger
  // the effect, run cleanup (clearTimeout), and kill the pending submission.
  const submittedRef = useRef(false);
  const submitResultRef = useRef(submitResult);
  submitResultRef.current = submitResult;
  const onRoundCompleteRef = useRef(onRoundComplete);
  onRoundCompleteRef.current = onRoundComplete;

  // Track and broadcast progress to other players
  useEffect(() => {
    if (!round || completed) return;
    const phraseLetters = getUniqueLetters(round.phrase);
    if (phraseLetters.size === 0) return;
    const revealedCount = guessedLetters.filter((l) =>
      phraseLetters.has(l),
    ).length;
    const percent = Math.round((revealedCount / phraseLetters.size) * 100);
    writeProgress(percent);
  }, [guessedLetters, round, completed, writeProgress]);

  // Flush 100% immediately when solved so other players see it right away
  useEffect(() => {
    if (solved && round) {
      flushProgress(100);
    }
  }, [solved, round, flushProgress]);

  const revealedLetters = new Set(guessedLetters);
  const wrongLetterSet = new Set(wrongLetters);

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
        <button className="game-board__leave" onClick={handleLeave}>
          Leave Game
        </button>
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

      {otherProgress.length > 0 && (
        <div className="game-board__progress">
          {otherProgress.map((p) => {
            const player = game.players[p.playerUid];
            const name = player?.displayName || "Player";
            const isFinished = p.percent >= 100;
            return (
              <div key={p.playerUid} className="game-board__progress-player">
                <span className="game-board__progress-name">{name}</span>
                <div className="game-board__progress-bar">
                  <div
                    className={`game-board__progress-fill${isFinished ? " game-board__progress-fill--done" : ""}`}
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
                <span className="game-board__progress-percent">
                  {p.percent}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button className="game-board__leave" onClick={handleLeave}>
        Leave Game
      </button>
    </div>
  );
};
