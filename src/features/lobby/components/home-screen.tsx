import { useState, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGame } from "../hooks/use-game";
import { useGameList } from "../hooks/use-game-list";
import { parseGameCode } from "../../game/utils/game-code";
import { addGameSession } from "../../../shared/hooks/use-game-session";
import { GameCard } from "./game-card";
import "./home-screen.css";

export const HomeScreen = () => {
  const { user } = useAuthContext();
  const { createGame, loading, error } = useGame();
  const { games, loading: gamesLoading } = useGameList();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"menu" | "join" | "create">("menu");
  const [joinCode, setJoinCode] = useState("");
  const [gameName, setGameName] = useState("");
  const [removedCodes, setRemovedCodes] = useState<Set<string>>(
    () => new Set(),
  );

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { code } = await createGame(
      user.uid,
      user.displayName || "Player",
      3,
      "medium",
      gameName.trim(),
    );
    addGameSession(code);
    navigate(`/${code}`);
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const code = parseGameCode(joinCode);
    if (code.length < 4) return;
    navigate(`/${code}`);
  };

  const handleRemove = useCallback((code: string) => {
    setRemovedCodes((prev) => new Set(prev).add(code));
  }, []);

  const visibleGames = games.filter((g) => !removedCodes.has(g.code));

  return (
    <div className="home-screen">
      <div className="home-screen__card">
        <h1 className="home-screen__logo">FLIPT</h1>
        <p className="home-screen__greeting">
          Hey, {user?.displayName || "Player"}!
        </p>

        {mode === "menu" && (
          <div className="home-screen__actions">
            <button
              className="home-screen__button home-screen__button--primary"
              onClick={() => setMode("create")}
              disabled={loading}
            >
              Create Game
            </button>
            <button
              className="home-screen__button home-screen__button--secondary"
              onClick={() => setMode("join")}
              disabled={loading}
            >
              Join Game
            </button>
          </div>
        )}

        {mode === "create" && (
          <form className="home-screen__create-form" onSubmit={handleCreate}>
            <input
              className="home-screen__input"
              type="text"
              placeholder="Game name (optional)"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              maxLength={30}
              autoFocus
              disabled={loading}
            />
            <div className="home-screen__create-actions">
              <button
                className="home-screen__button home-screen__button--primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create"}
              </button>
              <button
                className="home-screen__button home-screen__button--ghost"
                type="button"
                onClick={() => {
                  setMode("menu");
                  setGameName("");
                }}
              >
                Back
              </button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form className="home-screen__join-form" onSubmit={handleJoin}>
            <input
              className="home-screen__input"
              type="text"
              placeholder="Enter game code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={10}
              autoFocus
              disabled={loading}
            />
            <div className="home-screen__join-actions">
              <button
                className="home-screen__button home-screen__button--primary"
                type="submit"
                disabled={parseGameCode(joinCode).length < 4 || loading}
              >
                {loading ? "Joining..." : "Join"}
              </button>
              <button
                className="home-screen__button home-screen__button--ghost"
                type="button"
                onClick={() => setMode("menu")}
              >
                Back
              </button>
            </div>
          </form>
        )}

        {error && <p className="home-screen__error">{error}</p>}
      </div>

      {visibleGames.length > 0 && (
        <div className="home-screen__games">
          <h2 className="home-screen__games-title">Your Games</h2>
          <div className="home-screen__games-list">
            {visibleGames.map((game) => (
              <GameCard
                key={game.code}
                game={game}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
      )}

      {!gamesLoading && visibleGames.length === 0 && games.length === 0 && (
        <p className="home-screen__empty">
          No games yet — create or join one!
        </p>
      )}
    </div>
  );
};
