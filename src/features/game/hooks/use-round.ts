import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { calculateScore, calculateTimeBonus, getUniqueLetters, isLetterInPhrase } from "../utils/scoring";
import { playSound } from "../utils/sound";
import type { Round, RoundResult } from "../../../lib/types";

interface RoundState {
  round: Round | null;
  guessedLetters: string[];
  wrongLetters: string[];
  solveAttempts: string[];
  solved: boolean;
  solvedByGuessing: boolean;
  usedHint: boolean;
  showHint: boolean;
  score: number;
  completed: boolean;
}

export const useRound = (gameId: string, playerUid: string, roundNumber?: number) => {
  const [state, setState] = useState<RoundState>({
    round: null,
    guessedLetters: [],
    wrongLetters: [],
    solveAttempts: [],
    solved: false,
    solvedByGuessing: false,
    usedHint: false,
    showHint: false,
    score: 0,
    completed: false,
  });
  const [loading, setLoading] = useState(true);

  // Track elapsed time from when the round first loads
  const startTimeRef = useRef<number | null>(null);

  const getElapsed = useCallback((): number => {
    if (!startTimeRef.current) return 0;
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  }, []);

  // Subscribe to current round
  useEffect(() => {
    const roundsRef = collection(db, "rounds");
    // When roundNumber is known, query directly by it (needed for daily
    // games where multiple rounds are "active" simultaneously).
    const q =
      roundNumber !== undefined
        ? query(
            roundsRef,
            where("gameId", "==", gameId),
            where("roundNumber", "==", roundNumber),
          )
        : query(
            roundsRef,
            where("gameId", "==", gameId),
            where("status", "==", "active"),
          );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // There should only be one active round at a time
        const roundDoc = snapshot.docs[0];
        const round = { id: roundDoc.id, ...roundDoc.data() } as Round;

        // If we know which round number we expect, ignore stale rounds
        // that Firestore's local cache may return briefly (e.g. the
        // previous round still marked "active" in cache).
        if (roundNumber !== undefined && round.roundNumber !== roundNumber) {
          return;
        }

        setState((prev) => {
          // If the round changed, reset all local game state to prevent
          // stale guesses from a previous round bleeding through
          if (prev.round?.id !== round.id) {
            startTimeRef.current = Date.now();
            return {
              round,
              guessedLetters: [],
              wrongLetters: [],
              solveAttempts: [],
              solved: false,
              solvedByGuessing: false,
              usedHint: false,
              showHint: false,
              score: 0,
              completed: false,
            };
          }
          return { ...prev, round };
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [gameId, roundNumber]);

  // Check if we already have a result for this round
  useEffect(() => {
    if (!state.round) return;

    const resultsRef = collection(db, "round-results");
    const q = query(
      resultsRef,
      where("roundId", "==", state.round.id),
      where("playerUid", "==", playerUid),
    );

    getDocs(q).then((snapshot) => {
      if (!snapshot.empty) {
        const result = snapshot.docs[0].data() as RoundResult;
        setState((prev) => ({
          ...prev,
          guessedLetters: result.guessedLetters,
          wrongLetters: result.wrongLetters,
          solveAttempts: result.solveAttempts,
          solved: result.solved,
          usedHint: result.usedHint,
          score: result.score,
          completed: true,
        }));
      }
    });
  }, [state.round?.id, playerUid]);

  const guessLetter = useCallback(
    (letter: string) => {
      if (!state.round || state.completed || state.solved) return;

      const lower = letter.toLowerCase();
      if (
        state.guessedLetters.includes(lower) ||
        state.wrongLetters.includes(lower)
      ) {
        return;
      }

      if (isLetterInPhrase(state.round.phrase, lower)) {
        playSound("correct");
        setState((prev) => {
          const newGuessed = [...prev.guessedLetters, lower];
          // Check if all unique letters in the phrase are now revealed
          const phraseLetters = getUniqueLetters(prev.round!.phrase);
          const allRevealed = [...phraseLetters].every((l) =>
            newGuessed.includes(l),
          );
          return {
            ...prev,
            guessedLetters: newGuessed,
            // If all letters revealed, mark as solved but WITHOUT the
            // solve bonus — solvedByGuessing flag tracks this distinction
            solved: allRevealed ? true : prev.solved,
            solvedByGuessing: allRevealed ? true : prev.solvedByGuessing,
          };
        });
      } else {
        playSound("buzz");
        setState((prev) => ({
          ...prev,
          wrongLetters: [...prev.wrongLetters, lower],
        }));
      }
    },
    [
      state.round,
      state.completed,
      state.solved,
      state.guessedLetters,
      state.wrongLetters,
    ],
  );

  const attemptSolve = useCallback(
    (guess: string) => {
      if (!state.round || state.completed || state.solved) return;

      const normalizedGuess = guess.toUpperCase().trim();
      const normalizedPhrase = state.round.phrase.toUpperCase().trim();

      if (normalizedGuess === normalizedPhrase) {
        playSound("solve");
        setState((prev) => ({ ...prev, solved: true }));
      } else {
        playSound("buzz");
        setState((prev) => ({
          ...prev,
          solveAttempts: [...prev.solveAttempts, guess],
        }));
      }
    },
    [state.round, state.completed, state.solved],
  );

  const revealHint = useCallback(() => {
    setState((prev) => ({ ...prev, showHint: true, usedHint: true }));
  }, []);

  const submitResult = useCallback(async () => {
    if (!state.round || state.completed) return;

    // When solved by guessing every letter, don't award the +10 solve bonus
    const solvedForScoring = state.solved && !state.solvedByGuessing;

    const elapsedSeconds = getElapsed();
    const timeBonus = calculateTimeBonus(elapsedSeconds);

    const score = calculateScore({
      phrase: state.round.phrase,
      guessedLetters: state.guessedLetters,
      wrongLetters: state.wrongLetters,
      solveAttempts: state.solveAttempts,
      solved: solvedForScoring,
      usedHint: state.usedHint,
      elapsedSeconds,
    });

    const resultRef = doc(collection(db, "round-results"));
    const result: Omit<RoundResult, "id"> = {
      roundId: state.round.id,
      gameId,
      playerUid,
      guessedLetters: state.guessedLetters,
      wrongLetters: state.wrongLetters,
      solveAttempts: state.solveAttempts,
      solved: state.solved,
      usedHint: state.usedHint,
      score,
      elapsedSeconds,
      timeBonus,
      completedAt: serverTimestamp() as RoundResult["completedAt"],
    };

    await setDoc(resultRef, result);
    setState((prev) => ({ ...prev, score, completed: true }));

    return score;
  }, [
    state.round,
    state.completed,
    state.guessedLetters,
    state.wrongLetters,
    state.solveAttempts,
    state.solved,
    state.solvedByGuessing,
    state.usedHint,
    getElapsed,
    gameId,
    playerUid,
  ]);

  const giveUp = useCallback(async () => {
    if (!state.round || state.completed) return;

    const elapsedSeconds = getElapsed();

    // Submit with current state, not solved — no time bonus for giving up
    const score = calculateScore({
      phrase: state.round.phrase,
      guessedLetters: state.guessedLetters,
      wrongLetters: state.wrongLetters,
      solveAttempts: state.solveAttempts,
      solved: false,
      usedHint: state.usedHint,
    });

    const resultRef = doc(collection(db, "round-results"));
    const result: Omit<RoundResult, "id"> = {
      roundId: state.round.id,
      gameId,
      playerUid,
      guessedLetters: state.guessedLetters,
      wrongLetters: state.wrongLetters,
      solveAttempts: state.solveAttempts,
      solved: false,
      usedHint: state.usedHint,
      score,
      elapsedSeconds,
      timeBonus: 0,
      completedAt: serverTimestamp() as RoundResult["completedAt"],
    };

    await setDoc(resultRef, result);
    setState((prev) => ({ ...prev, score, completed: true }));

    return score;
  }, [
    state.round,
    state.completed,
    state.guessedLetters,
    state.wrongLetters,
    state.solveAttempts,
    state.usedHint,
    getElapsed,
    gameId,
    playerUid,
  ]);

  return {
    ...state,
    loading,
    getElapsed,
    guessLetter,
    attemptSolve,
    revealHint,
    submitResult,
    giveUp,
  };
};
