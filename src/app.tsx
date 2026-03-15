import { useState, useCallback, useEffect } from "react";
import {
  AuthProvider,
  useAuthContext,
} from "./features/auth/components/auth-provider";
import { LoginScreen } from "./features/auth/components/login-screen";
import { HomeScreen } from "./features/lobby/components/home-screen";
import { WaitingRoom } from "./features/lobby/components/waiting-room";
import { GameBoard } from "./features/game/components/game-board";
import { RoundResultsScreen } from "./features/leaderboard/components/round-results-screen";
import { GameOverScreen } from "./features/leaderboard/components/game-over-screen";
import { useGame } from "./features/lobby/hooks/use-game";
import {
  saveGameSession,
  loadGameSession,
  clearGameSession,
} from "./shared/hooks/use-game-session";
import type { Game } from "./lib/types";
import "./styles/theme.css";

type Screen =
  | { type: "home" }
  | { type: "waiting"; gameId: string }
  | { type: "playing"; gameId: string; roundNumber: number }
  | { type: "round-results"; gameId: string; roundId: string }
  | { type: "game-over"; gameId: string };

const AppContent = () => {
  const { user, loading } = useAuthContext();
  const { advanceRound, finishGame, subscribeToGame } = useGame();
  const [screen, setScreen] = useState<Screen>(() => {
    const session = loadGameSession();
    if (session) {
      return { type: "waiting", gameId: session.gameId };
    }
    return { type: "home" };
  });
  const [game, setGame] = useState<Game | null>(null);
  const [usedPhrases, setUsedPhrases] = useState<string[]>([]);

  // Subscribe to game updates whenever we're in a game
  useEffect(() => {
    const gameId =
      screen.type !== "home" ? (screen as { gameId: string }).gameId : null;
    if (!gameId) {
      setGame(null);
      return;
    }
    const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
      if (!updatedGame) {
        // Game was deleted or doesn't exist anymore
        clearGameSession();
        setScreen({ type: "home" });
        setGame(null);
        return;
      }
      setGame(updatedGame);

      // Auto-navigate to the right screen on reconnect
      if (screen.type === "waiting") {
        if (updatedGame.status === "active") {
          setScreen({
            type: "playing",
            gameId,
            roundNumber: updatedGame.currentRound,
          });
        } else if (updatedGame.status === "finished") {
          setScreen({ type: "game-over", gameId });
        }
      }
    });
    return unsubscribe;
  }, [screen, subscribeToGame]);

  const handleGameJoined = useCallback((gameId: string) => {
    saveGameSession(gameId);
    setScreen({ type: "waiting", gameId });
    setUsedPhrases([]);
  }, []);

  const handleGameStart = useCallback(() => {
    if (screen.type === "waiting") {
      setScreen({ type: "playing", gameId: screen.gameId, roundNumber: 1 });
    }
  }, [screen]);

  const handleRoundComplete = useCallback(
    (_score: number, roundId: string, phrase: string) => {
      if (screen.type === "playing") {
        setUsedPhrases((prev) => [...prev, phrase]);
        setScreen({
          type: "round-results",
          gameId: screen.gameId,
          roundId,
        });
      }
    },
    [screen],
  );

  const handleContinue = useCallback(async () => {
    if (screen.type !== "round-results" || !game) return;

    const isLastRound = game.currentRound >= game.totalRounds;

    if (isLastRound) {
      await finishGame(screen.gameId, game);
      clearGameSession();
      setScreen({ type: "game-over", gameId: screen.gameId });
    } else {
      await advanceRound(screen.gameId, game, usedPhrases);
      setScreen({
        type: "playing",
        gameId: screen.gameId,
        roundNumber: game.currentRound + 1,
      });
    }
  }, [screen, game, advanceRound, finishGame, usedPhrases]);

  const handleLeave = useCallback(() => {
    clearGameSession();
    setScreen({ type: "home" });
    setGame(null);
    setUsedPhrases([]);
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <h1 className="app-loading__logo">FLIPT</h1>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  switch (screen.type) {
    case "home":
      return <HomeScreen onGameJoined={handleGameJoined} />;
    case "waiting":
      return (
        <WaitingRoom
          gameId={screen.gameId}
          onGameStart={handleGameStart}
          onLeave={handleLeave}
        />
      );
    case "playing":
      return (
        <GameBoard
          gameId={screen.gameId}
          roundNumber={screen.roundNumber}
          onRoundComplete={handleRoundComplete}
        />
      );
    case "round-results":
      return game ? (
        <RoundResultsScreen
          game={game}
          roundId={screen.roundId}
          playerUid={user.uid}
          onContinue={handleContinue}
          isLastRound={game.currentRound >= game.totalRounds}
        />
      ) : null;
    case "game-over":
      return game ? (
        <GameOverScreen
          game={game}
          playerUid={user.uid}
          onPlayAgain={handleLeave}
        />
      ) : null;
  }
};

export const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
