import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { RoundResult } from "../../../lib/types";

export const useRoundResults = (roundId: string | null) => {
  const [results, setResults] = useState<RoundResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    const resultsRef = collection(db, "round-results");
    const q = query(resultsRef, where("roundId", "==", roundId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as RoundResult,
      );
      data.sort((a, b) => b.score - a.score);
      setResults(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [roundId]);

  return { results, loading };
};
