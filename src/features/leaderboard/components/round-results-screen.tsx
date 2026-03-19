import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGameContext } from "../../game/components/game-layout";
import { useGame } from "../../lobby/hooks/use-game";
import { useRoundResults } from "../hooks/use-round-results";
import "./round-results-screen.css";

interface PlayerProgress {
  playerUid: string;
  percent: number;
}

export const RoundResultsScreen = () => {
  const { code, roundNum } = useParams<{ code: string; roundNum: string }>();
  const roundNumber = Number(roundNum);
  const { game, gameId } = useGameContext();
  const { user } = useAuthContext();
  const { advanceRound, finishGame } = useGame();
  const navigate = useNavigate();
  const playerUid = user?.uid || "";

  // Look up roundId from Firestore by gameId + roundNumber
  const [roundId, setRoundId] = useState<string | null>(null);
  useEffect(() => {
    const roundsRef = collection(db, "rounds");
    const q = query(
      roundsRef,
      where("gameId", "==", gameId),
      where("roundNumber", "==", roundNumber),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setRoundId(snapshot.docs[0].id);
      }
    });
    return unsubscribe;
  }, [gameId, roundNumber]);

  const { results, loading } = useRoundResults(roundId || "");
  const [progress, setProgress] = useState<PlayerProgress[]>([]);

  // Subscribe to in-progress players' progress
  useEffect(() => {
    if (!roundId) return;
    const q = query(
      collection(db, "round-progress"),
      where("roundId", "==", roundId),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: PlayerProgress[] = [];
      snapshot.docs.forEach((d) => {
        const doc = d.data();
        data.push({
          playerUid: doc.playerUid as string,
          percent: doc.percent as number,
        });
      });
      setProgress(data);
    });
    return unsubscribe;
  }, [roundId]);

  const isLastRound = roundNumber >= game.totalRounds;

  const handleContinue = useCallback(async () => {
    if (isLastRound) {
      await finishGame(gameId, game);
      navigate(`/${code}/final`, { replace: true });
    } else {
      // Collect used phrases for phrase exclusion
      const roundsRef = collection(db, "rounds");
      const q = query(roundsRef, where("gameId", "==", gameId));
      const snap = await getDocs(q);
      const usedPhrases = snap.docs.map((d) => d.data().phrase as string);

      await advanceRound(gameId, game, usedPhrases, roundNumber);
      navigate(`/${code}/${roundNumber + 1}`, { replace: true });
    }
  }, [isLastRound, finishGame, advanceRound, gameId, game, code, roundNumber, navigate]);

  const allPlayers = Object.entries(game.players);
  const totalPlayers = allPlayers.length;
  const allFinished = results.length >= totalPlayers;
  const myResult = results.find((r) => r.playerUid === playerUid);

  if (loading || !roundId) {
    return (
      <div className="round-results">
        <p className="round-results__loading">Waiting for results...</p>
      </div>
    );
  }

  const finishedUids = new Set(results.map((r) => r.playerUid));

  const playerEntries = allPlayers.map(([uid, player]) => {
    const result = results.find((r) => r.playerUid === uid);
    const prog = progress.find((p) => p.playerUid === uid);
    return {
      uid,
      displayName: player.displayName,
      isMe: uid === playerUid,
      finished: finishedUids.has(uid),
      result,
      percent: prog?.percent ?? 0,
    };
  });

  playerEntries.sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) {
      return (b.result?.score ?? 0) - (a.result?.score ?? 0);
    }
    return b.percent - a.percent;
  });

  return (
    <div className="round-results">
      <div className="round-results__card">
        <h2 className="round-results__title">
          Round {roundNumber} Results
        </h2>

        {myResult && (
          <div className="round-results__my-score">
            <span className="round-results__my-score-label">Your Score</span>
            <span className="round-results__my-score-value">
              {myResult.score >= 0 ? "+" : ""}
              {myResult.score}
            </span>
            <div className="round-results__my-details">
              {myResult.solved && (
                <span className="round-results__badge round-results__badge--solved">
                  Solved
                </span>
              )}
              {!myResult.usedHint && (
                <span className="round-results__badge round-results__badge--no-hint">
                  No Hint
                </span>
              )}
            </div>
          </div>
        )}

        <div className="round-results__list">
          <h3 className="round-results__list-title">
            {allFinished
              ? "Final Standings"
              : `Waiting for players... (${results.length}/${totalPlayers})`}
          </h3>
          <ol className="round-results__rankings">
            {playerEntries.map((entry, index) => (
              <li
                key={entry.uid}
                className={`round-results__rank ${entry.isMe ? "round-results__rank--me" : ""}`}
              >
                <span className="round-results__rank-position">
                  {index + 1}
                </span>
                <span className="round-results__rank-name">
                  {entry.displayName}
                  {entry.isMe && " (you)"}
                </span>
                {entry.finished && allFinished ? (
                  <>
                    <span className="round-results__rank-details">
                      {entry.result?.solved ? "Solved" : "Unsolved"}
                    </span>
                    <span className="round-results__rank-score">
                      {(entry.result?.score ?? 0) >= 0 ? "+" : ""}
                      {entry.result?.score ?? 0}
                    </span>
                  </>
                ) : entry.finished ? (
                  <span className="round-results__rank-progress">
                    <span
                      className="round-results__rank-progress-bar round-results__rank-progress-bar--done"
                      style={{ width: "100%" }}
                    />
                  </span>
                ) : (
                  <span className="round-results__rank-progress">
                    <span
                      className="round-results__rank-progress-bar"
                      style={{ width: `${entry.percent}%` }}
                    />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>

        {allFinished && (
          <button
            className="round-results__continue"
            onClick={handleContinue}
          >
            {isLastRound ? "See Final Results" : "Next Round"}
          </button>
        )}

        {!allFinished && (
          <p className="round-results__waiting-hint">
            Results will update live as players finish
          </p>
        )}
      </div>
    </div>
  );
};
