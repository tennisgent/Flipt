import { useEffect, useState } from "react";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGame } from "../hooks/use-game";
import { formatGameCode } from "../../game/utils/game-code";
import type { Difficulty, Game } from "../../../lib/types";
import "./waiting-room.css";

interface WaitingRoomProps {
  gameId: string;
  onGameStart: () => void;
  onLeave: () => void;
}

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  description: string;
}[] = [
  { value: "easy", label: "Easy", description: "Shorter, common phrases" },
  { value: "medium", label: "Medium", description: "A balanced challenge" },
  { value: "hard", label: "Hard", description: "Long, tricky phrases" },
  {
    value: "ramping",
    label: "Ramping",
    description: "Starts easy, ends hard",
  },
];

export const WaitingRoom = ({
  gameId,
  onGameStart,
  onLeave,
}: WaitingRoomProps) => {
  const { user } = useAuthContext();
  const { startGame, subscribeToGame, loading } = useGame();
  const [game, setGame] = useState<Game | null>(null);
  const [copied, setCopied] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
      setGame(updatedGame);
      if (updatedGame.status === "active") {
        onGameStart();
      }
    });
    return unsubscribe;
  }, [gameId, subscribeToGame, onGameStart]);

  const handleCopyCode = async () => {
    if (!game) return;
    await navigator.clipboard.writeText(formatGameCode(game.code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    if (!game) return;
    startGame(gameId, difficulty, game.totalRounds);
  };

  if (!game) {
    return (
      <div className="waiting-room">
        <div className="waiting-room__card">
          <p className="waiting-room__loading">Loading...</p>
        </div>
      </div>
    );
  }

  const players = Object.values(game.players);
  const isHost = user?.uid === game.hostUid;

  return (
    <div className="waiting-room">
      <div className="waiting-room__card">
        <h2 className="waiting-room__title">Waiting for Players</h2>

        <div className="waiting-room__code-section">
          <p className="waiting-room__code-label">Share this code:</p>
          <button
            className="waiting-room__code"
            onClick={handleCopyCode}
            title="Click to copy"
          >
            {formatGameCode(game.code)}
          </button>
          {copied && (
            <span className="waiting-room__copied">Copied!</span>
          )}
        </div>

        <div className="waiting-room__players">
          <h3 className="waiting-room__players-title">
            Players ({players.length})
          </h3>
          <ul className="waiting-room__player-list">
            {players.map((player) => (
              <li key={player.uid} className="waiting-room__player">
                <span className="waiting-room__player-name">
                  {player.displayName}
                </span>
                {player.uid === game.hostUid && (
                  <span className="waiting-room__host-badge">Host</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className="waiting-room__difficulty">
            <h3 className="waiting-room__difficulty-title">Difficulty</h3>
            <div className="waiting-room__difficulty-options">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`waiting-room__difficulty-option ${
                    difficulty === opt.value
                      ? "waiting-room__difficulty-option--active"
                      : ""
                  }`}
                  onClick={() => setDifficulty(opt.value)}
                >
                  <span className="waiting-room__difficulty-label">
                    {opt.label}
                  </span>
                  <span className="waiting-room__difficulty-desc">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="waiting-room__actions">
          {isHost && (
            <button
              className="waiting-room__button waiting-room__button--start"
              onClick={handleStart}
              disabled={players.length < 1 || loading}
            >
              {loading
                ? "Starting..."
                : players.length < 2
                  ? "Start Solo"
                  : "Start Game"}
            </button>
          )}
          <button
            className="waiting-room__button waiting-room__button--leave"
            onClick={onLeave}
          >
            Leave
          </button>
        </div>

        {isHost && players.length < 2 && (
          <p className="waiting-room__hint">
            Waiting for others, or start solo to test
          </p>
        )}
      </div>
    </div>
  );
};
