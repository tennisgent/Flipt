import { useNavigate } from "react-router-dom";
import type { Game } from "../../../lib/types";
import { removeGameSession } from "../../../shared/hooks/use-game-session";
import "./game-card.css";

interface GameCardProps {
  game: Game;
  onRemove: (code: string) => void;
}

export const GameCard = ({ game, onRemove }: GameCardProps) => {
  const navigate = useNavigate();
  const playerCount = Object.keys(game.players).length;

  const handleClick = () => {
    navigate(`/${game.code}`);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeGameSession(game.code);
    onRemove(game.code);
  };

  return (
    <div className="game-card" role="button" tabIndex={0} onClick={handleClick}>
      <div className="game-card__header">
        <span className="game-card__name">
          {game.name || game.code}
        </span>
        <div className="game-card__badges">
          {game.type === "daily" && (
            <span className="game-card__badge game-card__badge--daily">
              Daily
            </span>
          )}
          <span className={`game-card__status game-card__status--${game.status}`}>
            {game.status}
          </span>
        </div>
      </div>
      <div className="game-card__details">
        {game.name && <span className="game-card__code">{game.code}</span>}
        <span className="game-card__players">
          {playerCount} player{playerCount !== 1 ? "s" : ""}
        </span>
        {game.status !== "waiting" && (
          <span className="game-card__round">
            {game.type === "daily"
              ? (() => {
                  const rpd = game.roundsPerDay ?? 1;
                  const days = Math.ceil(game.totalRounds / rpd);
                  return rpd > 1
                    ? `${days} days · ${rpd}/day`
                    : `${days} days`;
                })()
              : `Round ${game.currentRound} of ${game.totalRounds}`}
          </span>
        )}
      </div>
      <button
        className="game-card__remove"
        onClick={handleRemove}
        aria-label="Remove game"
      >
        &times;
      </button>
    </div>
  );
};
