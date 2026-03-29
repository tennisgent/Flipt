import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  getGameDayStart,
  getAvailableDateForRound,
  getAvailableDateForDay,
  getCurrentDayNumber,
  isRoundAvailable,
  getNextUnlockTime,
  formatCountdown,
  getDayForRound,
  getTotalDays,
} from "./daily-helpers";

describe("getGameDayStart", () => {
  it("returns 3 AM ET (7 AM UTC during EDT) for an afternoon time", () => {
    // June 15 2026, 3 PM UTC = 11 AM ET (EDT, UTC-4)
    const date = new Date("2026-06-15T15:00:00Z");
    const start = getGameDayStart(date);
    // 3 AM EDT = 7 AM UTC
    expect(start.getUTCHours()).toBe(7);
    expect(start.getUTCDate()).toBe(15);
  });

  it("returns previous day's 3 AM ET when before 3 AM ET", () => {
    // June 15 2026, 5 AM UTC = 1 AM ET (EDT) → game day is June 14
    const date = new Date("2026-06-15T05:00:00Z");
    const start = getGameDayStart(date);
    expect(start.getUTCHours()).toBe(7); // 3 AM EDT = 7 AM UTC
    expect(start.getUTCDate()).toBe(14); // previous day
  });

  it("handles EST (winter) correctly", () => {
    // Jan 10 2026, 6 PM UTC = 1 PM EST (UTC-5)
    const date = new Date("2026-01-10T18:00:00Z");
    const start = getGameDayStart(date);
    // 3 AM EST = 8 AM UTC
    expect(start.getUTCHours()).toBe(8);
    expect(start.getUTCDate()).toBe(10);
  });

  it("handles before 3 AM in EST correctly", () => {
    // Jan 10 2026, 7 AM UTC = 2 AM EST → game day is Jan 9
    const date = new Date("2026-01-10T07:00:00Z");
    const start = getGameDayStart(date);
    expect(start.getUTCHours()).toBe(8); // 3 AM EST = 8 AM UTC
    expect(start.getUTCDate()).toBe(9);
  });

  it("at exactly 3 AM ET, returns today's boundary", () => {
    // June 15 2026, 7 AM UTC = 3 AM EDT → game day is June 15
    const date = new Date("2026-06-15T07:00:00Z");
    const start = getGameDayStart(date);
    expect(start.getUTCDate()).toBe(15);
  });
});

describe("getAvailableDateForRound", () => {
  it("round 1 gets the base date", () => {
    const base = new Date("2026-06-15T07:00:00Z");
    const ts = getAvailableDateForRound(1, base);
    expect(ts.toDate().getTime()).toBe(base.getTime());
  });

  it("round 2 gets base + 1 day", () => {
    const base = new Date("2026-06-15T07:00:00Z");
    const ts = getAvailableDateForRound(2, base);
    const expected = new Date("2026-06-16T07:00:00Z");
    expect(ts.toDate().getTime()).toBe(expected.getTime());
  });

  it("round 7 gets base + 6 days", () => {
    const base = new Date("2026-06-15T07:00:00Z");
    const ts = getAvailableDateForRound(7, base);
    const expected = new Date("2026-06-21T07:00:00Z");
    expect(ts.toDate().getTime()).toBe(expected.getTime());
  });
});

describe("getCurrentDayNumber", () => {
  it("returns 1 on the start date", () => {
    const start = Timestamp.fromDate(new Date(Date.now() - 1000));
    expect(getCurrentDayNumber(start)).toBe(1);
  });

  it("returns 2 after 24 hours", () => {
    const start = Timestamp.fromDate(
      new Date(Date.now() - 25 * 60 * 60 * 1000),
    );
    expect(getCurrentDayNumber(start)).toBe(2);
  });

  it("never returns less than 1", () => {
    const future = Timestamp.fromDate(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    expect(getCurrentDayNumber(future)).toBe(1);
  });
});

describe("isRoundAvailable", () => {
  it("returns true when no availableDate (classic round)", () => {
    expect(isRoundAvailable(undefined)).toBe(true);
  });

  it("returns true when availableDate is in the past", () => {
    const past = Timestamp.fromDate(
      new Date(Date.now() - 60 * 60 * 1000),
    );
    expect(isRoundAvailable(past)).toBe(true);
  });

  it("returns false when availableDate is in the future", () => {
    const future = Timestamp.fromDate(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    expect(isRoundAvailable(future)).toBe(false);
  });
});

describe("getNextUnlockTime", () => {
  it("returns null when all rounds are available", () => {
    const rounds = [
      { availableDate: Timestamp.fromDate(new Date(Date.now() - 1000)) },
      { availableDate: Timestamp.fromDate(new Date(Date.now() - 2000)) },
    ];
    expect(getNextUnlockTime(rounds)).toBeNull();
  });

  it("returns the earliest future date", () => {
    const future1 = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const future2 = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const rounds = [
      { availableDate: Timestamp.fromDate(new Date(Date.now() - 1000)) },
      { availableDate: Timestamp.fromDate(future1) },
      { availableDate: Timestamp.fromDate(future2) },
    ];
    const result = getNextUnlockTime(rounds);
    expect(result?.getTime()).toBe(future1.getTime());
  });
});

describe("getAvailableDateForDay", () => {
  it("day 1 gets the base date", () => {
    const base = new Date("2026-06-15T07:00:00Z");
    const ts = getAvailableDateForDay(1, base);
    expect(ts.toDate().getTime()).toBe(base.getTime());
  });

  it("day 3 gets base + 2 days", () => {
    const base = new Date("2026-06-15T07:00:00Z");
    const ts = getAvailableDateForDay(3, base);
    const expected = new Date("2026-06-17T07:00:00Z");
    expect(ts.toDate().getTime()).toBe(expected.getTime());
  });
});

describe("getDayForRound", () => {
  it("maps rounds to days with 1 round per day", () => {
    expect(getDayForRound(1, 1)).toBe(1);
    expect(getDayForRound(2, 1)).toBe(2);
    expect(getDayForRound(5, 1)).toBe(5);
  });

  it("maps rounds to days with 2 rounds per day", () => {
    expect(getDayForRound(1, 2)).toBe(1);
    expect(getDayForRound(2, 2)).toBe(1);
    expect(getDayForRound(3, 2)).toBe(2);
    expect(getDayForRound(4, 2)).toBe(2);
    expect(getDayForRound(5, 2)).toBe(3);
  });

  it("maps rounds to days with 3 rounds per day", () => {
    expect(getDayForRound(1, 3)).toBe(1);
    expect(getDayForRound(3, 3)).toBe(1);
    expect(getDayForRound(4, 3)).toBe(2);
    expect(getDayForRound(6, 3)).toBe(2);
    expect(getDayForRound(7, 3)).toBe(3);
  });
});

describe("getTotalDays", () => {
  it("returns totalRounds when roundsPerDay is 1", () => {
    expect(getTotalDays(7, 1)).toBe(7);
  });

  it("divides evenly for 2 rounds per day", () => {
    expect(getTotalDays(6, 2)).toBe(3);
    expect(getTotalDays(10, 2)).toBe(5);
  });

  it("rounds up for uneven division", () => {
    expect(getTotalDays(7, 3)).toBe(3);
    expect(getTotalDays(5, 2)).toBe(3);
  });
});

describe("formatCountdown", () => {
  it("formats days", () => {
    expect(formatCountdown(2 * 24 * 60 * 60 * 1000)).toBe("2 days");
    expect(formatCountdown(1 * 24 * 60 * 60 * 1000)).toBe("1 day");
  });

  it("formats hours and minutes", () => {
    expect(formatCountdown(3 * 60 * 60 * 1000 + 30 * 60 * 1000)).toBe(
      "3h 30m",
    );
    expect(formatCountdown(5 * 60 * 60 * 1000)).toBe("5h");
  });

  it("formats minutes only", () => {
    expect(formatCountdown(15 * 60 * 1000)).toBe("15 min");
    expect(formatCountdown(30 * 1000)).toBe("1 min");
  });

  it("returns now for zero or negative", () => {
    expect(formatCountdown(0)).toBe("now");
    expect(formatCountdown(-1000)).toBe("now");
  });
});
