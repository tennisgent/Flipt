import { useState, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { generateGameCode } from "../../game/utils/game-code";
import { getRandomPhrase } from "../../game/utils/phrases";
import {
  getGameDayStart,
  getAvailableDateForDay,
} from "../../../shared/utils/daily-helpers";
import type { Difficulty, Game, GamePlayer } from "../../../lib/types";

export const useGame = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(
    async (
      hostUid: string,
      displayName: string,
      totalRounds: number = 3,
      difficulty: Difficulty = "medium",
      gameName: string = "",
    ): Promise<{ gameId: string; code: string }> => {
      setLoading(true);
      setError(null);
      try {
        const code = generateGameCode();
        const gameRef = doc(collection(db, "games"));

        const hostPlayer: GamePlayer = {
          uid: hostUid,
          displayName,
          totalScore: 0,
          roundsCompleted: 0,
        };

        const game: Omit<Game, "id"> = {
          code,
          name: gameName,
          hostUid,
          status: "waiting",
          difficulty,
          players: { [hostUid]: hostPlayer },
          currentRound: 0,
          totalRounds,
          createdAt: serverTimestamp() as Game["createdAt"],
          updatedAt: serverTimestamp() as Game["updatedAt"],
        };

        await setDoc(gameRef, game);

        return { gameId: gameRef.id, code };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create game";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createDailyGame = useCallback(
    async (
      hostUid: string,
      displayName: string,
      totalDays: number,
      roundsPerDay: number,
      difficulty: Difficulty,
      gameName: string = "",
    ): Promise<{ gameId: string; code: string }> => {
      setLoading(true);
      setError(null);
      try {
        const code = generateGameCode();
        const gameRef = doc(collection(db, "games"));
        const startDate = getGameDayStart(new Date());
        const totalRounds = totalDays * roundsPerDay;

        const hostPlayer: GamePlayer = {
          uid: hostUid,
          displayName,
          totalScore: 0,
          roundsCompleted: 0,
        };

        // Fetch all phrases upfront
        const usedPhrases: string[] = [];
        const phrases: Array<{ text: string; category: string }> = [];
        for (let i = 1; i <= totalRounds; i++) {
          const phrase = await getRandomPhrase(
            usedPhrases,
            difficulty,
            i,
            totalRounds,
          );
          usedPhrases.push(phrase.text);
          phrases.push(phrase);
        }

        // Batch write game + all rounds
        const batch = writeBatch(db);

        batch.set(gameRef, {
          code,
          name: gameName,
          hostUid,
          status: "active",
          type: "daily",
          difficulty,
          players: { [hostUid]: hostPlayer },
          currentRound: 1,
          totalRounds,
          roundsPerDay,
          startDate: Timestamp.fromDate(startDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (let i = 0; i < totalRounds; i++) {
          const dayNumber = Math.floor(i / roundsPerDay) + 1;
          const roundRef = doc(collection(db, "rounds"));
          batch.set(roundRef, {
            gameId: gameRef.id,
            roundNumber: i + 1,
            dayNumber,
            phrase: phrases[i].text,
            category: phrases[i].category,
            status: "active",
            availableDate: getAvailableDateForDay(dayNumber, startDate),
            createdAt: serverTimestamp(),
          });
        }

        await batch.commit();
        return { gameId: gameRef.id, code };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create daily game";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updatePlayerScoreForRound = useCallback(
    async (
      gameId: string,
      roundId: string,
      playerUid: string,
    ): Promise<void> => {
      const gameRef = doc(db, "games", gameId);
      const freshSnap = await getDoc(gameRef);
      const freshGame = freshSnap.data() as Omit<Game, "id"> | undefined;
      if (!freshGame) return;

      const player = freshGame.players[playerUid];
      if (!player) return;

      // Find this player's result for this round
      const resultsRef = collection(db, "round-results");
      const resultsQuery = query(
        resultsRef,
        where("roundId", "==", roundId),
        where("playerUid", "==", playerUid),
      );
      const resultsSnap = await getDocs(resultsQuery);
      if (resultsSnap.empty) return;

      const result = resultsSnap.docs[0].data();
      const roundNumber = result.roundNumber as number | undefined;

      // Idempotent: only update if this round hasn't been counted yet
      if (player.roundsCompleted >= (roundNumber ?? player.roundsCompleted + 1)) {
        return;
      }

      await updateDoc(gameRef, {
        [`players.${playerUid}.totalScore`]:
          player.totalScore + (result.score as number),
        [`players.${playerUid}.roundsCompleted`]:
          player.roundsCompleted + 1,
        updatedAt: serverTimestamp(),
      });
    },
    [],
  );

  const joinGame = useCallback(
    async (
      code: string,
      playerUid: string,
      displayName: string,
    ): Promise<string> => {
      setLoading(true);
      setError(null);
      try {
        const gamesRef = collection(db, "games");
        const q = query(
          gamesRef,
          where("code", "==", code.toUpperCase()),
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          throw new Error("Game not found. Check the code and try again.");
        }

        const gameDoc = snapshot.docs[0];
        const gameData = gameDoc.data() as Omit<Game, "id">;

        // Allow joining if waiting, or if it's an active daily game
        const canJoin =
          gameData.status === "waiting" ||
          (gameData.status === "active" && gameData.type === "daily");

        if (!canJoin) {
          throw new Error("Game not found. Check the code and try again.");
        }

        if (gameData.players[playerUid]) {
          return gameDoc.id;
        }

        const newPlayer: GamePlayer = {
          uid: playerUid,
          displayName,
          totalScore: 0,
          roundsCompleted: 0,
        };

        await updateDoc(gameDoc.ref, {
          [`players.${playerUid}`]: newPlayer,
          updatedAt: serverTimestamp(),
        });

        return gameDoc.id;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to join game";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const startGame = useCallback(
    async (gameId: string, difficulty: Difficulty, totalRounds: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const gameRef = doc(db, "games", gameId);
      // Create the first round
      const phrase = await getRandomPhrase([], difficulty, 1, totalRounds);
      const roundRef = doc(collection(db, "rounds"));
      await setDoc(roundRef, {
        gameId,
        roundNumber: 1,
        phrase: phrase.text,
        category: phrase.category,
        status: "active",
        createdAt: serverTimestamp(),
      });

      await updateDoc(gameRef, {
        status: "active",
        difficulty,
        totalRounds,
        currentRound: 1,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start game";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribeToGame = useCallback(
    (gameId: string, callback: (game: Game) => void): Unsubscribe => {
      const gameRef = doc(db, "games", gameId);
      return onSnapshot(gameRef, (snapshot) => {
        if (snapshot.exists()) {
          callback({ id: snapshot.id, ...snapshot.data() } as Game);
        }
      });
    },
    [],
  );

  const lookupGameByCode = useCallback(
    async (code: string): Promise<Game | null> => {
      const gamesRef = collection(db, "games");
      const q = query(
        gamesRef,
        where("code", "==", code.toUpperCase()),
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const gameDoc = snapshot.docs[0];
      return { id: gameDoc.id, ...gameDoc.data() } as Game;
    },
    [],
  );

  const subscribeToGameByCode = useCallback(
    (code: string, callback: (game: Game | null) => void): Unsubscribe => {
      const gamesRef = collection(db, "games");
      const q = query(
        gamesRef,
        where("code", "==", code.toUpperCase()),
      );
      return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          callback(null);
        } else {
          const gameDoc = snapshot.docs[0];
          callback({ id: gameDoc.id, ...gameDoc.data() } as Game);
        }
      });
    },
    [],
  );

  const advanceRound = useCallback(
    async (gameId: string, game: Game, usedPhrases: string[], fromRound: number): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const gameRef = doc(db, "games", gameId);

        // Re-read the game to check if another player already advanced past
        // the round this player just finished. Use fromRound (the player's
        // actual completed round) rather than game.currentRound, which may
        // have been updated by the snapshot listener.
        const freshSnap = await getDoc(gameRef);
        const freshGame = freshSnap.data() as Omit<Game, "id"> | undefined;
        if (!freshGame || freshGame.currentRound > fromRound) {
          // Already advanced by another player — nothing to do
          return;
        }

        const nextRound = fromRound + 1;

        if (nextRound > game.totalRounds) {
          // Game is finished
          await updateDoc(gameRef, {
            status: "finished",
            updatedAt: serverTimestamp(),
          });
          return;
        }

        // Mark current round as completed
        const roundsRef = collection(db, "rounds");
        const currentRoundQuery = query(
          roundsRef,
          where("gameId", "==", gameId),
          where("roundNumber", "==", fromRound),
        );
        const currentRoundSnap = await getDocs(currentRoundQuery);
        if (!currentRoundSnap.empty) {
          await updateDoc(currentRoundSnap.docs[0].ref, {
            status: "completed",
          });
        }

        // Create next round
        const phrase = await getRandomPhrase(
          usedPhrases,
          game.difficulty,
          nextRound,
          game.totalRounds,
        );
        const roundRef = doc(collection(db, "rounds"));
        await setDoc(roundRef, {
          gameId,
          roundNumber: nextRound,
          phrase: phrase.text,
          category: phrase.category,
          status: "active",
          createdAt: serverTimestamp(),
        });

        // Update player scores from round results
        const resultsRef = collection(db, "round-results");
        const resultsQuery = query(
          resultsRef,
          where("gameId", "==", gameId),
          where("roundId", "==", currentRoundSnap.docs[0]?.id),
        );
        const resultsSnap = await getDocs(resultsQuery);

        const playerUpdates: Record<string, unknown> = {};
        resultsSnap.docs.forEach((resultDoc) => {
          const result = resultDoc.data();
          const uid = result.playerUid as string;
          const currentPlayer = game.players[uid];
          if (currentPlayer) {
            playerUpdates[`players.${uid}.totalScore`] =
              currentPlayer.totalScore + (result.score as number);
            playerUpdates[`players.${uid}.roundsCompleted`] =
              currentPlayer.roundsCompleted + 1;
          }
        });

        await updateDoc(gameRef, {
          currentRound: nextRound,
          ...playerUpdates,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to advance round";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const finishGame = useCallback(
    async (gameId: string, game: Game): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const gameRef = doc(db, "games", gameId);

        // Check if already finished by another player
        const freshSnap = await getDoc(gameRef);
        const freshGame = freshSnap.data() as Omit<Game, "id"> | undefined;
        if (!freshGame || freshGame.status === "finished") {
          return;
        }

        // Update final scores from last round
        const roundsRef = collection(db, "rounds");
        const lastRoundQuery = query(
          roundsRef,
          where("gameId", "==", gameId),
          where("roundNumber", "==", game.currentRound),
        );
        const lastRoundSnap = await getDocs(lastRoundQuery);

        if (!lastRoundSnap.empty) {
          await updateDoc(lastRoundSnap.docs[0].ref, {
            status: "completed",
          });

          const resultsRef = collection(db, "round-results");
          const resultsQuery = query(
            resultsRef,
            where("roundId", "==", lastRoundSnap.docs[0].id),
          );
          const resultsSnap = await getDocs(resultsQuery);

          const playerUpdates: Record<string, unknown> = {};
          resultsSnap.docs.forEach((resultDoc) => {
            const result = resultDoc.data();
            const uid = result.playerUid as string;
            const currentPlayer = game.players[uid];
            if (currentPlayer) {
              playerUpdates[`players.${uid}.totalScore`] =
                currentPlayer.totalScore + (result.score as number);
              playerUpdates[`players.${uid}.roundsCompleted`] =
                currentPlayer.roundsCompleted + 1;
            }
          });

          await updateDoc(gameRef, {
            status: "finished",
            ...playerUpdates,
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(gameRef, {
            status: "finished",
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to finish game";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    createGame,
    createDailyGame,
    joinGame,
    startGame,
    advanceRound,
    finishGame,
    updatePlayerScoreForRound,
    subscribeToGame,
    lookupGameByCode,
    subscribeToGameByCode,
    loading,
    error,
  };
};
