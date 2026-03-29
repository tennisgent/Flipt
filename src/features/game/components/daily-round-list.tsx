import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGameContext } from "./game-layout";
import { useDailyRounds } from "../hooks/use-daily-rounds";
import { useGame } from "../../lobby/hooks/use-game";
import {
  getNextUnlockTime,
  formatCountdown,
} from "../../../shared/utils/daily-helpers";
import "./daily-round-list.css";

export const DailyRoundList = () => {
  const { code } = useParams<{ code: string }>();
  const { game, gameId } = useGameContext();
  const { user } = useAuthContext();
  const { finishGame } = useGame();
  const navigate = useNavigate();
  const { rounds, loading } = useDailyRounds(gameId, user?.uid ?? "");
  const [countdown, setCountdown] = useState("");

  const nextUnlock = getNextUnlockTime(
    rounds.map((r) => r.round),
  );

  // Update countdown every minute
  useEffect(() => {
    if (!nextUnlock) {
      setCountdown("");
      return;
    }
    const update = () => {
      const ms = nextUnlock.getTime() - Date.now();
      setCountdown(ms > 0 ? formatCountdown(ms) : "");
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [nextUnlock]);

  const isHost = user?.uid === game.hostUid;
  const allDaysElapsed = !nextUnlock && rounds.length > 0;
  const players = Object.values(game.players);

  const handleEndGame = async () => {
    await finishGame(gameId, game);
    navigate(`/${code}/final`, { replace: true });
  };

  if (loading) {
    return (
      <div className="daily-round-list">
        <p className="daily-round-list__loading">Loading rounds...</p>
      </div>
    );
  }

  return (
    <div className="daily-round-list">
      <div className="daily-round-list__header">
        <h2 className="daily-round-list__title">Daily Challenge</h2>
        <p className="daily-round-list__subtitle">
          {game.totalRounds} rounds &middot; {players.length} player
          {players.length !== 1 && "s"}
        </p>
        <p className="daily-round-list__code">
          Share code: <strong>{code}</strong>
        </p>
      </div>

      <div className="daily-round-list__rounds">
        {rounds.map(({ round, result, available }) => {
          const played = result !== null;
          const locked = !available;

          return (
            <button
              key={round.id}
              className={`daily-round-list__round ${
                locked
                  ? "daily-round-list__round--locked"
                  : played
                    ? "daily-round-list__round--completed"
                    : "daily-round-list__round--available"
              }`}
              disabled={locked}
              onClick={() => {
                if (played) {
                  navigate(`/${code}/${round.roundNumber}/results`);
                } else {
                  navigate(`/${code}/${round.roundNumber}`);
                }
              }}
            >
              <span className="daily-round-list__round-number">
                Day {round.roundNumber}
              </span>
              <span className="daily-round-list__round-category">
                {locked ? "Locked" : round.category}
              </span>
              <span className="daily-round-list__round-status">
                {locked
                  ? ""
                  : played
                    ? `${result.score >= 0 ? "+" : ""}${result.score} pts`
                    : "Play"}
              </span>
            </button>
          );
        })}
      </div>

      {countdown && (
        <p className="daily-round-list__countdown">
          Next round unlocks in <strong>{countdown}</strong>
        </p>
      )}

      {players.length > 1 && (
        <div className="daily-round-list__standings">
          <h3 className="daily-round-list__standings-title">Standings</h3>
          <ol className="daily-round-list__standings-list">
            {[...players]
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((p) => (
                <li key={p.uid} className="daily-round-list__standings-row">
                  <span>{p.displayName}</span>
                  <span>
                    {p.totalScore} pts &middot; {p.roundsCompleted}/
                    {game.totalRounds}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      )}

      {isHost && allDaysElapsed && game.status !== "finished" && (
        <button
          className="daily-round-list__end-game"
          onClick={handleEndGame}
        >
          End Game
        </button>
      )}
    </div>
  );
};
