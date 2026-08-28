import { describe, expect, it } from "vitest";

import type { ZodiacCode } from "@/features/fortune/domain";
import {
  buildCalendarHistory,
  getBiggestMover,
  getMovement,
  getTopThreeStreak,
} from "@/features/rank-market/metrics";

describe("rank-market metrics", () => {
  it("computes movement against the previous captured edition of the same source", () => {
    expect(getMovement({ currentRank: 2, previousRank: 7 })).toEqual({
      places: 5,
      direction: "up",
    });
    expect(getMovement({ currentRank: 7, previousRank: 2 })).toEqual({
      places: 5,
      direction: "down",
    });
    expect(getMovement({ currentRank: 3, previousRank: 3 })).toEqual({
      places: 0,
      direction: "same",
    });
  });

  it("keeps Ohaasa missing calendar dates as null gaps", () => {
    expect(
      buildCalendarHistory("2026-08-14", "2026-08-17", [
        { date: "2026-08-14", rank: 3 },
        { date: "2026-08-17", rank: 1 },
      ]),
    ).toEqual([
      { date: "2026-08-14", rank: 3 },
      { date: "2026-08-15", rank: null },
      { date: "2026-08-16", rank: null },
      { date: "2026-08-17", rank: 1 },
    ]);
  });

  it("computes current top-three streak from captured history", () => {
    expect(
      getTopThreeStreak([
        { date: "2026-08-23", rank: 2 },
        { date: "2026-08-24", rank: null },
        { date: "2026-08-25", rank: 3 },
        { date: "2026-08-26", rank: 1 },
      ]),
    ).toBe(3);
  });

  it("selects the largest absolute mover with deterministic zodiac tie-break", () => {
    expect(
      getBiggestMover({
        aries: { places: 2, direction: "up" },
        taurus: { places: 5, direction: "down" },
        gemini: { places: 5, direction: "up" },
      } as Partial<Record<ZodiacCode, ReturnType<typeof getMovement>>>),
    ).toBe("gemini");
  });
});
