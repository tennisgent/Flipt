import { useState, type FormEvent } from "react";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGame } from "../hooks/use-game";
import { parseGameCode } from "../../game/utils/game-code";
import "./home-screen.css";

interface HomeScreenProps {
  onGameJoined: (gameId: string) => void;
}

export const HomeScreen = ({ onGameJoined }: HomeScreenProps) => {
  const { user } = useAuthContext();
  const { createGame, joinGame, loading, error } = useGame();
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [joinCode, setJoinCode] = useState("");

  const handleCreate = async () => {
    if (!user) return;
    const gameId = await createGame(
      user.uid,
      user.displayName || "Player",
    );
    onGameJoined(gameId);
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const code = parseGameCode(joinCode);
    if (code.length < 4) return;
    const gameId = await joinGame(
      code,
      user.uid,
      user.displayName || "Player",
    );
    onGameJoined(gameId);
  };

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
              onClick={handleCreate}
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

        {mode === "join" && (
          <form className="home-screen__join-form" onSubmit={handleJoin}>
            <input
              className="home-screen__input"
              type="text"
              placeholder="Enter game code (e.g. FLIPT-AB3D)"
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
    </div>
  );
};
