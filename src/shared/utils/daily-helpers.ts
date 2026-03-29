import { Timestamp } from "firebase/firestore";

/**
 * Returns the UTC offset (in minutes) for America/New_York at a given instant.
 * The local timezone cancels out because both strings are parsed identically.
 */
const getETOffsetMinutes = (date: Date): number => {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const etStr = date.toLocaleString("en-US", { timeZone: "America/New_York" });
  return Math.round((new Date(utcStr).getTime() - new Date(etStr).getTime()) / 60000);
};

/**
 * Returns ET date/time components for a given Date.
 */
const toEasternParts = (
  date: Date,
): { year: number; month: number; day: number; hour: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
};

/**
 * Returns the UTC Date for 3:00 AM ET on the "game day" that contains
 * the given date. A game day runs from 3 AM ET to 3 AM ET the next day.
 * If before 3 AM ET, the game day started the previous calendar day.
 */
export const getGameDayStart = (date: Date = new Date()): Date => {
  const et = toEasternParts(date);

  // Which ET calendar day does the game day fall on?
  const gameDayDate = new Date(
    Date.UTC(et.year, et.month - 1, et.day),
  );
  if (et.hour < 3) {
    gameDayDate.setUTCDate(gameDayDate.getUTCDate() - 1);
  }

  // Get the ET→UTC offset at noon on the game day (noon avoids DST edge)
  const noonUTC = new Date(
    Date.UTC(
      gameDayDate.getUTCFullYear(),
      gameDayDate.getUTCMonth(),
      gameDayDate.getUTCDate(),
      12,
    ),
  );
  const offsetMin = getETOffsetMinutes(noonUTC);

  // 3:00 AM ET in UTC = 3:00 + offset minutes
  return new Date(
    Date.UTC(
      gameDayDate.getUTCFullYear(),
      gameDayDate.getUTCMonth(),
      gameDayDate.getUTCDate(),
      3,
      offsetMin,
    ),
  );
};

/**
 * Returns the Firestore Timestamp for when round N becomes available.
 * Round 1 = baseDate, Round 2 = baseDate + 1 day, etc.
 */
export const getAvailableDateForRound = (
  roundNumber: number,
  baseDate: Date,
): Timestamp => {
  const ms = baseDate.getTime() + (roundNumber - 1) * 24 * 60 * 60 * 1000;
  return Timestamp.fromDate(new Date(ms));
};

/**
 * Returns the 1-based day number relative to the game's start date.
 */
export const getCurrentDayNumber = (startDate: Timestamp): number => {
  const diffMs = Date.now() - startDate.toDate().getTime();
  return Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
};

/**
 * Checks if a round is available based on its availableDate.
 * Classic rounds (no availableDate) are always available.
 */
export const isRoundAvailable = (availableDate?: Timestamp): boolean => {
  if (!availableDate) return true;
  return Date.now() >= availableDate.toDate().getTime();
};

/**
 * Finds the next locked round's unlock time for countdown display.
 * Returns null if all rounds are already available.
 */
export const getNextUnlockTime = (
  rounds: Array<{ availableDate?: Timestamp }>,
): Date | null => {
  const now = Date.now();
  let earliest: Date | null = null;

  for (const round of rounds) {
    if (!round.availableDate) continue;
    const date = round.availableDate.toDate();
    if (date.getTime() > now && (!earliest || date < earliest)) {
      earliest = date;
    }
  }

  return earliest;
};

/**
 * Formats a duration in milliseconds as a human-readable countdown string.
 */
export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return minutes <= 1 ? "1 min" : `${minutes} min`;
};
