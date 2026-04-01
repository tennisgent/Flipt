import { useEffect, useState, useRef } from "react";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import type { Game } from "../../../lib/types";
import { loadGameSessions, removeGameSession } from "../../../shared/hooks/use-game-session";

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  waiting: 1,
  finished: 2,
};

const sortGames = (games: Game[]): Game[] =>
  [...games].sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] ?? 3;
    const orderB = STATUS_ORDER[b.status] ?? 3;
    if (orderA !== orderB) return orderA - orderB;
    return b.updatedAt?.seconds - a.updatedAt?.seconds || 0;
  });

export const useGameList = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const gameMapRef = useRef(new Map<string, Game>());
  const unsubscribesRef = useRef<Unsubscribe[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const gameMap = gameMapRef.current;
    gameMap.clear();
    const unsubs: Unsubscribe[] = [];

    const updateGames = () => {
      setGames(sortGames([...gameMap.values()]));
    };

    // Source 1: Firestore query for games with this user in playerUids
    let firestoreResolved = false;
    const firestoreQuery = query(
      collection(db, "games"),
      where("playerUids", "array-contains", uid),
    );
    unsubs.push(
      onSnapshot(firestoreQuery, (snapshot) => {
        snapshot.docs.forEach((doc) => {
          gameMap.set(doc.id, { id: doc.id, ...doc.data() } as Game);
        });
        // Remove games that were deleted
        const firestoreIds = new Set(snapshot.docs.map((d) => d.id));
        for (const [id] of gameMap) {
          if (!firestoreIds.has(id) && !localCodeIds.has(id)) {
            gameMap.delete(id);
          }
        }
        firestoreResolved = true;
        if (localResolved) setLoading(false);
        updateGames();
      }),
    );

    // Source 2: localStorage codes (backward compat for games without playerUids)
    const localCodes = loadGameSessions();
    const localCodeIds = new Set<string>();
    let localResolved = localCodes.length === 0;
    let localCount = 0;

    if (localCodes.length === 0 && !firestoreResolved) {
      // Nothing from localStorage, just wait for Firestore
    } else {
      localCodes.forEach((code) => {
        const q = query(
          collection(db, "games"),
          where("code", "==", code.toUpperCase()),
        );
        unsubs.push(
          onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
              removeGameSession(code);
            } else {
              const gameDoc = snapshot.docs[0];
              const gameData = gameDoc.data() as Omit<Game, "id">;
              localCodeIds.add(gameDoc.id);
              // Only add if not already tracked by Firestore query
              if (!gameMap.has(gameDoc.id)) {
                gameMap.set(gameDoc.id, { id: gameDoc.id, ...gameData } as Game);
              }
              // Backfill playerUids for older games missing it
              if (
                gameData.players[uid] &&
                (!gameData.playerUids || !gameData.playerUids.includes(uid))
              ) {
                updateDoc(doc(db, "games", gameDoc.id), {
                  playerUids: arrayUnion(uid),
                });
              }
            }
            localCount++;
            if (localCount >= localCodes.length) {
              localResolved = true;
              if (firestoreResolved) setLoading(false);
            }
            updateGames();
          }),
        );
      });
    }

    unsubscribesRef.current = unsubs;

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  return { games, loading };
};
