import { Routes, Route, Navigate } from "react-router-dom";
import {
  AuthProvider,
  useAuthContext,
} from "./features/auth/components/auth-provider";
import { LoginScreen } from "./features/auth/components/login-screen";
import { HomeScreen } from "./features/lobby/components/home-screen";
import { GameLayout } from "./features/game/components/game-layout";
import { GameIndex } from "./features/game/components/game-index";
import { GameBoard } from "./features/game/components/game-board";
import { DayRoundsList } from "./features/game/components/day-rounds-list";
import { RoundResultsScreen } from "./features/leaderboard/components/round-results-screen";
import { GameOverScreen } from "./features/leaderboard/components/game-over-screen";
import "./styles/theme.css";

const AppContent = () => {
  const { user, loading } = useAuthContext();

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

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/:code" element={<GameLayout />}>
        <Route index element={<GameIndex />} />
        <Route path="day/:dayNum" element={<DayRoundsList />} />
        <Route path=":roundNum" element={<GameBoard />} />
        <Route path=":roundNum/results" element={<RoundResultsScreen />} />
        <Route path="final" element={<GameOverScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
