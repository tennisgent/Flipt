import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { isRoundAvailable } from "../../../shared/utils/daily-helpers";
import type { Round, RoundResult } from "../../../lib/types";

export interface DailyRoundInfo {
  round: Round;
  result: RoundResult | null;
  available: boolean;
}

export const useDailyRounds = (
  gameId: string,
  playerUid: string,
): { rounds: DailyRoundInfo[]; loading: boolean } => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);

  // Subscribe to all rounds for this game
  useEffect(() => {
    if (!gameId) return;
    const q = query(
      collection(db, "rounds"),
      where("gameId", "==", gameId),
      orderBy("roundNumber", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setRounds(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Round),
      );
      setLoadingRounds(false);
    });
    return unsub;
  }, [gameId]);

  // Subscribe to this player's results for this game
  useEffect(() => {
    if (!gameId || !playerUid) return;
    const q = query(
      collection(db, "round-results"),
      where("gameId", "==", gameId),
      where("playerUid", "==", playerUid),
    );
    const unsub = onSnapshot(q, (snap) => {
      setResults(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoundResult),
      );
      setLoadingResults(false);
    });
    return unsub;
  }, [gameId, playerUid]);

  // Combine rounds with results and availability
  const combined: DailyRoundInfo[] = rounds.map((round) => ({
    round,
    result: results.find((r) => r.roundId === round.id) ?? null,
    available: isRoundAvailable(round.availableDate),
  }));

  return { rounds: combined, loading: loadingRounds || loadingResults };
};
