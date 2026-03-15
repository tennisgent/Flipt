import { useState, useEffect, useCallback } from "react";
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
import { calculateScore, isLetterInPhrase } from "../utils/scoring";
import { playSound } from "../utils/sound";
import type { Round, RoundResult } from "../../../lib/types";

interface RoundState {
  round: Round | null;
  guessedLetters: string[];
  wrongLetters: string[];
  solveAttempts: string[];
  solved: boolean;
  usedHint: boolean;
  showHint: boolean;
  score: number;
  completed: boolean;
}

export const useRound = (gameId: string, playerUid: string) => {
  const [state, setState] = useState<RoundState>({
    round: null,
    guessedLetters: [],
    wrongLetters: [],
    solveAttempts: [],
    solved: false,
    usedHint: false,
    showHint: false,
    score: 0,
    completed: false,
  });
  const [loading, setLoading] = useState(true);

  // Subscribe to current round
  useEffect(() => {
    const roundsRef = collection(db, "rounds");
    const q = query(
      roundsRef,
      where("gameId", "==", gameId),
      where("status", "==", "active"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // There should only be one active round at a time
        const roundDoc = snapshot.docs[0];
        const round = { id: roundDoc.id, ...roundDoc.data() } as Round;
        setState((prev) => {
          // If the round changed, reset all local game state to prevent
          // stale guesses from a previous round bleeding through
          if (prev.round?.id !== round.id) {
            return {
              round,
              guessedLetters: [],
              wrongLetters: [],
              solveAttempts: [],
              solved: false,
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
  }, [gameId]);

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
        setState((prev) => ({
          ...prev,
          guessedLetters: [...prev.guessedLetters, lower],
        }));
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

    const score = calculateScore({
      phrase: state.round.phrase,
      guessedLetters: state.guessedLetters,
      wrongLetters: state.wrongLetters,
      solveAttempts: state.solveAttempts,
      solved: state.solved,
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
      solved: state.solved,
      usedHint: state.usedHint,
      score,
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
    state.usedHint,
    gameId,
    playerUid,
  ]);

  const giveUp = useCallback(async () => {
    if (!state.round || state.completed) return;

    // Submit with current state, not solved
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
    gameId,
    playerUid,
  ]);

  return {
    ...state,
    loading,
    guessLetter,
    attemptSolve,
    revealHint,
    submitResult,
    giveUp,
  };
};
