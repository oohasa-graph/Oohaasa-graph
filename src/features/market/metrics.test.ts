import { describe, expect, it } from "vitest";
import { ZODIAC_CODES } from "@/features/fortune/domain";
import { buildSeries, shiftDate } from "@/features/market/series";
import {
  currentTopThreeStreak, dailyChange, hotStreaks, moodFor, moodLineIndex,
  comparisonLine, rangeStats, seriesUntil, sliceSeries, stampColor, topMovers, weeklyAwards,
} from "@/features/market/metrics";

const blank = (days = 17) => buildSeries("gogo", shiftDate("2026-10-26", 1 - days), "2026-10-26", []);

describe("null-safe market metrics", () => {
  it("reports observed statistics and expected coverage without treating gaps as ranks", () => {
    expect(rangeStats([1, null, 3, 5])).toMatchObject({
      average: 3, best: 1, worst: 5, ones: 1, topThree: 2, covered: 3, expected: 4,
    });
    expect(rangeStats([1, null, 3, 5]).volatility).toBeCloseTo(1.633, 3);
    expect(rangeStats([null, null])).toMatchObject({ average: null, best: null, worst: null, volatility: null, covered: 0 });
    expect(rangeStats([2]).volatility).toBeNull();
    expect(rangeStats([]).average).toBeNull();
  });

  it("requires two adjacent expected mornings for change, and breaks streaks at gaps", () => {
    expect(dailyChange([5, 2])).toBe(3);
    for (const values of [[5, null], [null, 4], [7], []]) expect(dailyChange(values)).toBeNull();
    expect(currentTopThreeStreak([4, 2, 1, 3])).toBe(3);
    expect(currentTopThreeStreak([2, null, 1])).toBe(1);
    expect(currentTopThreeStreak([1, 2, null])).toBe(0);
  });

  it("slices calendar days, not the last N samples, without losing nulls", () => {
    const series = blank();
    const week = sliceSeries(series, "1w", "2026-10-26");
    expect(week.dates[0]).toBe("2026-10-20");
    expect(week.ranks.libra).toEqual(Array(7).fill(null));
    expect(sliceSeries(series, "all", "2026-10-26")).toEqual(series);
  });

  it("ranks movers and current streaks deterministically, excluding gaps and flat changes", () => {
    const series = blank(2);
    series.ranks.aries = [5, 2];
    series.ranks.taurus = [6, 3];
    series.ranks.gemini = [1, 10];
    series.ranks.cancer = [2, 2];
    series.ranks.leo = [3, null];
    expect(topMovers(series, "gainers")).toEqual([
      { zodiacCode: "aries", change: 3, previousRank: 5, rank: 2 },
      { zodiacCode: "taurus", change: 3, previousRank: 6, rank: 3 },
    ]);
    expect(topMovers(series, "losers", 1)[0].zodiacCode).toBe("gemini");
    expect(hotStreaks(series, 3)).toEqual([
      { zodiacCode: "cancer", days: 2 }, { zodiacCode: "aries", days: 1 }, { zodiacCode: "taurus", days: 1 },
    ]);
    expect(topMovers(blank(), "gainers")).toEqual([]);
    expect(hotStreaks(blank())).toEqual([]);
  });

  it("awards five-morning improvement and 91-day rank performance with minimum coverage", () => {
    const series = blank(10);
    series.ranks.aries = [...Array(5).fill(10), ...Array(5).fill(2)];
    series.ranks.taurus = [...Array(5).fill(2), ...Array(5).fill(11)];
    series.ranks.gemini = [null, null, null, null, null, 1, 1, 1, 1, null];
    const awards = weeklyAwards(series, "2026-10-26");
    expect(awards.mvp).toEqual({ zodiacCode: "aries", value: 8 });
    expect(awards.cheer).toEqual({ zodiacCode: "taurus", value: 9 });
    expect(awards.king).toEqual({ zodiacCode: "gemini", value: 4 });
    expect(awards.steady?.zodiacCode).toBe("aries");
    expect(weeklyAwards(blank(), "2026-10-26")).toEqual({ mvp: null, cheer: null, king: null, steady: null });
    for (const code of ZODIAC_CODES) series.ranks[code] = Array(10).fill(4);
    expect(weeklyAwards(series, "2026-10-26")).toEqual({
      mvp: null, cheer: null, king: null, steady: { zodiacCode: "aries", value: 4 },
    });
  });

  it("maps ranks to moods and stamp colors, keeping no-data stamps transparent", () => {
    expect([1, 3, 9, 10, null].map(moodFor)).toEqual(["star", "happy", "calm", "sad", "calm"]);
    expect([1, 2, 6, 7, 11, 12, null].map(moodLineIndex)).toEqual([0, 1, 2, 3, 4, 5, 2]);
    expect(stampColor(1)).toBe("#ff6f91");
    expect(stampColor(null)).toBe("transparent");
    expect(stampColor(12)).toBe("hsla(215,70%,72%,1)");
  });

  it("views a series as of the latest edition", () => {
    const series = buildSeries("ohaasa", "2026-10-21", "2026-10-26", [
      { date: "2026-10-22", zodiacCode: "leo", rank: 2 }, { date: "2026-10-23", zodiacCode: "leo", rank: 5 },
    ]);
    const until = seriesUntil(series, "2026-10-23");
    expect(until.dates).toEqual(["2026-10-21", "2026-10-22", "2026-10-23"]);
    expect(until.ranks.leo).toEqual([null, 2, 5]);
    expect(seriesUntil(series, "2026-10-01").dates).toEqual([]);
  });

  const leo = (source: "ohaasa" | "gogo", ranks: Record<string, number>) => buildSeries(source, "2026-10-21", "2026-10-26",
    Object.entries(ranks).map(([date, rank]) => ({ date, zodiacCode: "leo" as const, rank })));
  const gogoAxis = buildSeries("gogo", "2026-10-21", "2026-10-26", []).dates;
  const ohaasaAxis = buildSeries("ohaasa", "2026-10-21", "2026-10-26", []).dates;

  it("runs Ohaasa's comparison line across weekends it never publishes, but breaks it at its missing mornings", () => {
    // Ohaasa: 10-21 rank 4, 10-22 missing, 10-23 rank 2, weekend not expected, 10-26 rank 5. Gogo's axis is daily.
    const line = comparisonLine(leo("ohaasa", { "2026-10-21": 4, "2026-10-23": 2, "2026-10-26": 5 }), "leo", gogoAxis);
    expect(line.values).toEqual([4, null, 2, null, null, 5]);
    expect(line.runs).toEqual([[0], [2, 5]]);
  });

  it("breaks Gogo's comparison line at its missing weekend even though Ohaasa's axis has no weekend slot", () => {
    const full = { "2026-10-21": 3, "2026-10-22": 4, "2026-10-23": 5, "2026-10-24": 8, "2026-10-25": 6, "2026-10-26": 7 };
    expect(comparisonLine(leo("gogo", full), "leo", ohaasaAxis)).toEqual({ values: [3, 4, 5, 7], runs: [[0, 1, 2, 3]] });
    const withGap = Object.fromEntries(Object.entries(full).filter(([date]) => date !== "2026-10-24"));
    expect(comparisonLine(leo("gogo", withGap), "leo", ohaasaAxis)).toEqual({ values: [3, 4, 5, 7], runs: [[0, 1, 2], [3]] });
    expect(comparisonLine(leo("gogo", full), "leo", [])).toEqual({ values: [], runs: [] });
    expect(comparisonLine(leo("gogo", {}), "leo", ohaasaAxis)).toEqual({ values: [null, null, null, null], runs: [] });
  });
});
