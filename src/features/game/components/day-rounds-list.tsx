import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGameContext } from "./game-layout";
import { useDailyRounds } from "../hooks/use-daily-rounds";
import "./day-rounds-list.css";

export const DayRoundsList = () => {
  const { code, dayNum } = useParams<{ code: string; dayNum: string }>();
  const dayNumber = Number(dayNum);
  const { game, gameId } = useGameContext();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { rounds, loading } = useDailyRounds(gameId, user?.uid ?? "");

  const dayRounds = rounds.filter(
    (r) => (r.round.dayNumber ?? r.round.roundNumber) === dayNumber,
  );

  if (loading) {
    return (
      <div className="day-rounds-list">
        <p className="day-rounds-list__loading">Loading rounds...</p>
      </div>
    );
  }

  const roundsPerDay = game.roundsPerDay ?? 1;

  return (
    <div className="day-rounds-list">
      <div className="day-rounds-list__header">
        <h2 className="day-rounds-list__title">Day {dayNumber}</h2>
        <p className="day-rounds-list__subtitle">
          {dayRounds.length} round{dayRounds.length !== 1 && "s"}
        </p>
      </div>

      <div className="day-rounds-list__rounds">
        {dayRounds.map((info, index) => {
          const { round, result } = info;
          const played = result !== null;
          const roundLabel =
            roundsPerDay > 1 ? `Round ${index + 1}` : `Round ${round.roundNumber}`;

          return (
            <button
              key={round.id}
              className={`day-rounds-list__round ${
                played
                  ? "day-rounds-list__round--completed"
                  : "day-rounds-list__round--available"
              }`}
              onClick={() => {
                if (played) {
                  navigate(`/${code}/${round.roundNumber}/results`);
                } else {
                  navigate(`/${code}/${round.roundNumber}`);
                }
              }}
            >
              <span className="day-rounds-list__round-number">{roundLabel}</span>
              <span className="day-rounds-list__round-category">
                {round.category}
              </span>
              <span className="day-rounds-list__round-status">
                {played
                  ? `${result.score >= 0 ? "+" : ""}${result.score} pts`
                  : "Play"}
              </span>
            </button>
          );
        })}
      </div>

      <button
        className="day-rounds-list__back"
        onClick={() => navigate(`/${code}`)}
      >
        Back to Days
      </button>
    </div>
  );
};
