import { useState, useEffect, useRef } from "react";
import { Outlet, useParams, useNavigate, useOutletContext, Link } from "react-router-dom";
import { useAuthContext } from "../../auth/components/auth-provider";
import { useGame } from "../../lobby/hooks/use-game";
import { addGameSession } from "../../../shared/hooks/use-game-session";
import type { Game } from "../../../lib/types";
import "./game-layout.css";

interface GameContext {
  game: Game;
  gameId: string;
}

export const useGameContext = () => useOutletContext<GameContext>();

export const GameLayout = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuthContext();
  const { subscribeToGameByCode, joinGame } = useGame();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const joinAttempted = useRef(false);

  useEffect(() => {
    if (!code) return;
    joinAttempted.current = false;

    const unsubscribe = subscribeToGameByCode(code, (updatedGame) => {
      setLoading(false);
      if (!updatedGame) {
        setError("Game not found");
        return;
      }
      setGame(updatedGame);
      addGameSession(code);

      // Auto-join if not already a player and game is still waiting
      if (
        user &&
        !updatedGame.players[user.uid] &&
        updatedGame.status === "waiting" &&
        !joinAttempted.current
      ) {
        joinAttempted.current = true;
        joinGame(code, user.uid, user.displayName || "Player").catch(
          () => {
            setError("Failed to join game");
          },
        );
      }
    });

    return unsubscribe;
  }, [code, user, subscribeToGameByCode, joinGame]);

  if (loading) {
    return (
      <div className="app-loading">
        <h1 className="app-loading__logo">FLIPT</h1>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="app-loading">
        <h1 className="app-loading__logo">FLIPT</h1>
        <p>{error || "Game not found"}</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  return (
    <>
      <nav className="game-layout__nav">
        <Link to="/" className="game-layout__home">
          FLIPT
        </Link>
        <span className="game-layout__code">{game.code}</span>
      </nav>
      <Outlet context={{ game, gameId: game.id } satisfies GameContext} />
    </>
  );
};
