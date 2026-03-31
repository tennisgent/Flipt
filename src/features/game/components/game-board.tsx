import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGameContext } from "./game-layout";
import { useRound } from "../hooks/use-round";
import { useRoundProgress } from "../hooks/use-round-progress";
import { getUniqueLetters, calculateTimeBonus } from "../utils/scoring";
import {
  isRoundAvailable,
  getDayForRound,
} from "../../../shared/utils/daily-helpers";
import { removeGameSession } from "../../../shared/hooks/use-game-session";
import { PhraseDisplay } from "./phrase-display";
import { Keyboard } from "./keyboard";
import { SolveInput } from "./solve-input";
import "./game-board.css";

export const GameBoard = () => {
  const { code, roundNum } = useParams<{ code: string; roundNum: string }>();
  const roundNumber = Number(roundNum);
  const { game, gameId } = useGameContext();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const {
    round,
    guessedLetters,
    wrongLetters,
    solveAttempts,
    solved,
    completed,
    loading,
    getElapsed,
    guessLetter,
    attemptSolve,
    submitResult,
    giveUp,
  } = useRound(gameId, user?.uid || "", roundNumber);

  // Live time bonus display — ticks every second while playing
  const [timeBonus, setTimeBonus] = useState(20);
  useEffect(() => {
    if (solved || completed || !round) return;
    const tick = () => setTimeBonus(calculateTimeBonus(getElapsed()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [solved, completed, round, getElapsed]);

  const { otherProgress, writeProgress, flushProgress } = useRoundProgress(
    round?.id ?? null,
    gameId,
    user?.uid || "",
  );

  const submittedRef = useRef(false);
  const submitResultRef = useRef(submitResult);
  submitResultRef.current = submitResult;

  // Reset submittedRef when round changes
  useEffect(() => {
    submittedRef.current = false;
  }, [roundNumber]);

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

  // Flush 100% immediately when solved
  useEffect(() => {
    if (solved && round) {
      flushProgress(100);
    }
  }, [solved, round, flushProgress]);

  const revealedLetters = new Set(guessedLetters);
  const wrongLetterSet = new Set(wrongLetters);

  const navigateToResults = useCallback(() => {
    navigate(`/${code}/${roundNumber}/results`, { replace: true });
  }, [code, roundNumber, navigate]);

  // Auto-submit when solved
  useEffect(() => {
    if (solved && !submittedRef.current && !completed && round) {
      submittedRef.current = true;
      const timer = setTimeout(async () => {
        await submitResultRef.current();
        navigateToResults();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [solved, completed, round, navigateToResults]);

  // If round was already completed (e.g. page refresh after submitting),
  // skip straight to round results
  useEffect(() => {
    if (completed && round && submittedRef.current === false) {
      submittedRef.current = true;
      navigateToResults();
    }
  }, [completed, round, navigateToResults]);

  // Guard: redirect if this is a locked daily round
  useEffect(() => {
    if (
      round &&
      game.type === "daily" &&
      !isRoundAvailable(round.availableDate)
    ) {
      navigate(`/${code}`, { replace: true });
    }
  }, [round, game.type, code, navigate]);

  const handleGiveUp = useCallback(async () => {
    if (!round) return;
    await giveUp();
    navigateToResults();
  }, [giveUp, round, navigateToResults]);

  const handleLeave = useCallback(() => {
    if (window.confirm("Leave this game? Your progress will be lost.")) {
      if (code) removeGameSession(code);
      navigate("/");
    }
  }, [code, navigate]);

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
        <span className="game-board__round">
          {game.type === "daily"
            ? (() => {
                const rpd = game.roundsPerDay ?? 1;
                const day = getDayForRound(roundNumber, rpd);
                return rpd > 1
                  ? `Day ${day} · Rd ${((roundNumber - 1) % rpd) + 1}`
                  : `Day ${day}`;
              })()
            : `Round ${roundNumber}`}
        </span>
        <div className="game-board__stats">
          {!solved && !completed && (
            <span
              className={`game-board__stat game-board__stat--time${timeBonus === 0 ? " game-board__stat--time-zero" : ""}`}
            >
              +{timeBonus} speed
            </span>
          )}
          <span className="game-board__stat">
            {wrongLetters.length} miss{wrongLetters.length !== 1 ? "es" : ""}
          </span>
        </div>
      </div>

      <div className="game-board__hint">
        <span className="game-board__hint-label">Category:</span>{" "}
        {round.category}
      </div>

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
