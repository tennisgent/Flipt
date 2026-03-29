import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGameContext } from "./game-layout";
import { useDailyRounds } from "../hooks/use-daily-rounds";
import { useGame } from "../../lobby/hooks/use-game";
import {
  getNextUnlockTime,
  formatCountdown,
  getTotalDays,
} from "../../../shared/utils/daily-helpers";
import type { DailyRoundInfo } from "../hooks/use-daily-rounds";
import "./daily-round-list.css";

interface DayGroup {
  dayNumber: number;
  rounds: DailyRoundInfo[];
  available: boolean;
  allPlayed: boolean;
  somePlayed: boolean;
  totalScore: number;
}

const groupByDay = (
  rounds: DailyRoundInfo[],
  roundsPerDay: number,
): DayGroup[] => {
  const totalDays = getTotalDays(rounds.length, roundsPerDay);
  const groups: DayGroup[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const dayRounds = rounds.filter(
      (r) => (r.round.dayNumber ?? r.round.roundNumber) === d,
    );
    const played = dayRounds.filter((r) => r.result !== null);
    groups.push({
      dayNumber: d,
      rounds: dayRounds,
      available: dayRounds.length > 0 && dayRounds[0].available,
      allPlayed: played.length === dayRounds.length && dayRounds.length > 0,
      somePlayed: played.length > 0 && played.length < dayRounds.length,
      totalScore: played.reduce((sum, r) => sum + (r.result?.score ?? 0), 0),
    });
  }

  return groups;
};

export const DailyRoundList = () => {
  const { code } = useParams<{ code: string }>();
  const { game, gameId } = useGameContext();
  const { user } = useAuthContext();
  const { finishGame } = useGame();
  const navigate = useNavigate();
  const { rounds, loading } = useDailyRounds(gameId, user?.uid ?? "");
  const [countdown, setCountdown] = useState("");

  const roundsPerDay = game.roundsPerDay ?? 1;

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
  const days = groupByDay(rounds, roundsPerDay);
  const numDays = getTotalDays(game.totalRounds, roundsPerDay);

  const handleEndGame = async () => {
    await finishGame(gameId, game);
    navigate(`/${code}/final`, { replace: true });
  };

  const handleDayClick = (day: DayGroup) => {
    if (roundsPerDay === 1) {
      // Single round per day — go directly to game or results
      const round = day.rounds[0];
      if (!round) return;
      if (day.allPlayed) {
        navigate(`/${code}/${round.round.roundNumber}/results`);
      } else {
        navigate(`/${code}/${round.round.roundNumber}`);
      }
    } else {
      // Multiple rounds per day — show day detail
      navigate(`/${code}/day/${day.dayNumber}`);
    }
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
          {numDays} day{numDays !== 1 && "s"}
          {roundsPerDay > 1 && ` · ${roundsPerDay} rounds/day`}
          {" · "}
          {players.length} player{players.length !== 1 && "s"}
        </p>
        <p className="daily-round-list__code">
          Share code: <strong>{code}</strong>
        </p>
      </div>

      <div className="daily-round-list__rounds">
        {days.map((day) => {
          const locked = !day.available;

          let statusText = "";
          if (!locked) {
            if (day.allPlayed) {
              statusText = `${day.totalScore >= 0 ? "+" : ""}${day.totalScore} pts`;
            } else if (day.somePlayed) {
              const played = day.rounds.filter((r) => r.result !== null).length;
              statusText = `${played}/${day.rounds.length} done`;
            } else {
              statusText = "Play";
            }
          }

          return (
            <button
              key={day.dayNumber}
              className={`daily-round-list__round ${
                locked
                  ? "daily-round-list__round--locked"
                  : day.allPlayed
                    ? "daily-round-list__round--completed"
                    : "daily-round-list__round--available"
              }`}
              disabled={locked}
              onClick={() => handleDayClick(day)}
            >
              <span className="daily-round-list__round-number">
                Day {day.dayNumber}
              </span>
              <span className="daily-round-list__round-category">
                {locked
                  ? "Locked"
                  : roundsPerDay === 1
                    ? day.rounds[0]?.round.category ?? ""
                    : day.somePlayed
                      ? `${day.rounds.filter((r) => r.result !== null).length}/${day.rounds.length} rounds`
                      : `${day.rounds.length} rounds`}
              </span>
              <span className="daily-round-list__round-status">
                {statusText}
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
