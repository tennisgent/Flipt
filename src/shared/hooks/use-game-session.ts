const STORAGE_KEY = "flipt-active-game";

interface GameSession {
  gameId: string;
}

export const saveGameSession = (gameId: string): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ gameId }));
};

export const loadGameSession = (): GameSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSession;
    if (parsed.gameId) return parsed;
    return null;
  } catch {
    return null;
  }
};

export const clearGameSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
