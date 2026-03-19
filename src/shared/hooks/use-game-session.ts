const STORAGE_KEY = "flipt-games";

export const addGameSession = (code: string): void => {
  const codes = loadGameSessions();
  const upper = code.toUpperCase();
  if (!codes.includes(upper)) {
    codes.unshift(upper);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  }
};

export const removeGameSession = (code: string): void => {
  const codes = loadGameSessions().filter(
    (c) => c !== code.toUpperCase(),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
};

export const loadGameSessions = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as string[];
    return [];
  } catch {
    return [];
  }
};
