import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

interface PlayerProgress {
  playerUid: string;
  percent: number;
}

/**
 * Tracks and shares round progress between players.
 * - Writes the current player's progress to Firestore (debounced to every 5s,
 *   and only when the value has changed).
 * - Subscribes to other players' progress docs for live updates.
 */
export const useRoundProgress = (
  roundId: string | null,
  gameId: string,
  playerUid: string,
) => {
  const [otherProgress, setOtherProgress] = useState<PlayerProgress[]>([]);
  const lastWrittenPercent = useRef<number>(-1);
  const pendingPercent = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundIdRef = useRef(roundId);
  roundIdRef.current = roundId;

  // Write progress to Firestore, debounced
  const writeProgress = useCallback(
    (percent: number) => {
      if (!roundIdRef.current) return;

      pendingPercent.current = percent;

      // If unchanged from last write, skip
      if (percent === lastWrittenPercent.current) return;

      // If there's already a pending write, let it handle the latest value
      if (timerRef.current) return;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const toWrite = pendingPercent.current;
        if (toWrite === lastWrittenPercent.current) return;

        lastWrittenPercent.current = toWrite;
        const progressRef = doc(
          db,
          "round-progress",
          `${roundIdRef.current}_${playerUid}`,
        );
        setDoc(progressRef, {
          roundId: roundIdRef.current,
          gameId,
          playerUid,
          percent: toWrite,
        }).catch(() => {
          // Non-critical — don't block gameplay if progress write fails
        });
      }, 5000);
    },
    [gameId, playerUid],
  );

  // Flush any pending progress immediately (e.g. on solve/complete)
  const flushProgress = useCallback(
    (percent: number) => {
      if (!roundIdRef.current) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (percent === lastWrittenPercent.current) return;
      lastWrittenPercent.current = percent;
      const progressRef = doc(
        db,
        "round-progress",
        `${roundIdRef.current}_${playerUid}`,
      );
      setDoc(progressRef, {
        roundId: roundIdRef.current,
        gameId,
        playerUid,
        percent,
      }).catch(() => {});
    },
    [gameId, playerUid],
  );

  // Subscribe to all players' progress for this round
  useEffect(() => {
    if (!roundId) return;

    const q = query(
      collection(db, "round-progress"),
      where("roundId", "==", roundId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progress: PlayerProgress[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data();
        // Only include other players
        if (data.playerUid !== playerUid) {
          progress.push({
            playerUid: data.playerUid as string,
            percent: data.percent as number,
          });
        }
      });
      setOtherProgress(progress);
    });

    return unsubscribe;
  }, [roundId, playerUid]);

  // Cleanup timer on unmount or round change
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastWrittenPercent.current = -1;
    };
  }, [roundId]);

  return { otherProgress, writeProgress, flushProgress };
};
