import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { Game } from "../../../lib/types";
import {
  loadGameSessions,
  removeGameSession,
} from "../../../shared/hooks/use-game-session";

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  waiting: 1,
  finished: 2,
};

export const useGameList = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubscribesRef = useRef<Unsubscribe[]>([]);

  useEffect(() => {
    const codes = loadGameSessions();
    if (codes.length === 0) {
      setLoading(false);
      return;
    }

    const gameMap = new Map<string, Game>();
    let resolved = 0;

    const updateGames = () => {
      const sorted = [...gameMap.values()].sort((a, b) => {
        const orderA = STATUS_ORDER[a.status] ?? 3;
        const orderB = STATUS_ORDER[b.status] ?? 3;
        if (orderA !== orderB) return orderA - orderB;
        // Within same status, most recently updated first
        return b.updatedAt?.seconds - a.updatedAt?.seconds || 0;
      });
      setGames(sorted);
    };

    const unsubs: Unsubscribe[] = codes.map((code) => {
      const q = query(
        collection(db, "games"),
        where("code", "==", code.toUpperCase()),
      );
      return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // Game no longer exists — clean up
          gameMap.delete(code);
          removeGameSession(code);
        } else {
          const doc = snapshot.docs[0];
          gameMap.set(code, { id: doc.id, ...doc.data() } as Game);
        }
        resolved++;
        if (resolved >= codes.length) {
          setLoading(false);
        }
        updateGames();
      });
    });

    unsubscribesRef.current = unsubs;

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  return { games, loading };
};
