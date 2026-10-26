import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import { shiftDate } from "@/features/market/series";
import { RANGE_DAYS, type MarketRange, type RankSeries } from "@/features/market/types";

export function sliceSeries(series: RankSeries, range: MarketRange, currentDate: string): RankSeries {
  if (range === "all") return series;
  const cutoff = shiftDate(currentDate, -RANGE_DAYS[range]);
  const indices = series.dates.flatMap((date, i) => date > cutoff && date <= currentDate ? [i] : []);
  return {
    dates: indices.map((i) => series.dates[i]),
    ranks: Object.fromEntries(ZODIAC_CODES.map((code) => [code, indices.map((i) => series.ranks[code][i])])) as RankSeries["ranks"],
  };
}

// "Today" in the views means the newest stored edition, so a stale morning does not blank every rank.
export function seriesUntil(series: RankSeries, date: string): RankSeries {
  const count = series.dates.filter((value) => value <= date).length;
  return {
    dates: series.dates.slice(0, count),
    ranks: Object.fromEntries(ZODIAC_CODES.map((code) => [code, series.ranks[code].slice(0, count)])) as RankSeries["ranks"],
  };
}

// Another show's ranks placed on this show's axis, with runs that follow the other show's own expected mornings:
// its missing morning ends a run even where this axis has no slot for it, and a day it never publishes does not.
export function comparisonLine(series: RankSeries, zodiacCode: ZodiacCode, dates: string[]) {
  const slots = new Map(dates.map((date, i) => [date, i]));
  const values: (number | null)[] = dates.map(() => null), runs: number[][] = [];
  let open = false;
  series.dates.forEach((date, k) => {
    if (!dates.length || date < dates[0] || date > dates.at(-1)!) return;
    const rank = series.ranks[zodiacCode][k], slot = slots.get(date);
    if (rank === null) {
      open = false;
    } else if (slot !== undefined) {
      values[slot] = rank;
      if (open) runs.at(-1)!.push(slot);
      else runs.push([slot]);
      open = true;
    }
  });
  return { values, runs };
}

export function rangeStats(values: (number | null)[]) {
  const ranks = values.filter((value) => value !== null);
  const covered = ranks.length;
  const average = covered ? ranks.reduce((sum, rank) => sum + rank, 0) / covered : null;
  return {
    average, best: covered ? Math.min(...ranks) : null, worst: covered ? Math.max(...ranks) : null,
    ones: ranks.filter((rank) => rank === 1).length, topThree: ranks.filter((rank) => rank <= 3).length,
    volatility: covered >= 2 ? Math.sqrt(ranks.reduce((sum, rank) => sum + (rank - average!) ** 2, 0) / covered) : null,
    covered, expected: values.length,
  };
}

export function dailyChange(values: (number | null)[]): number | null {
  const previous = values.at(-2), last = values.at(-1);
  return previous == null || last == null ? null : previous - last;
}

export function currentTopThreeStreak(values: (number | null)[]): number {
  let days = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] === null || values[i]! > 3) break;
    days++;
  }
  return days;
}

export function topMovers(series: RankSeries, direction: "gainers" | "losers", limit = 4) {
  return ZODIAC_CODES.flatMap((zodiacCode) => {
    const ranks = series.ranks[zodiacCode], change = dailyChange(ranks);
    return change !== null && (direction === "gainers" ? change > 0 : change < 0)
      ? [{ zodiacCode, change, previousRank: ranks.at(-2)!, rank: ranks.at(-1)! }] : [];
  }).sort((a, b) => direction === "gainers" ? b.change - a.change : a.change - b.change).slice(0, limit);
}

export function hotStreaks(series: RankSeries, limit = 4) {
  return ZODIAC_CODES.map((zodiacCode) => ({ zodiacCode, days: currentTopThreeStreak(series.ranks[zodiacCode]) }))
    .filter(({ days }) => days > 0).sort((a, b) => b.days - a.days).slice(0, limit);
}

type Award = { zodiacCode: ZodiacCode; value: number };
function pickAward(candidates: Award[], order: "highest" | "lowest" = "highest"): Award | null {
  return candidates.sort((a, b) => order === "highest" ? b.value - a.value : a.value - b.value)[0] ?? null;
}

export function weeklyAwards(series: RankSeries, currentDate: string): Record<"mvp" | "cheer" | "king" | "steady", Award | null> {
  const quarter = sliceSeries(series, "3m", currentDate);
  const stats = ZODIAC_CODES.map((zodiacCode) => {
    const ranks = quarter.ranks[zodiacCode];
    const previous = rangeStats(ranks.slice(-10, -5)).average;
    const current = rangeStats(ranks.slice(-5)).average;
    return { zodiacCode, ...rangeStats(ranks), change: previous !== null && current !== null ? previous - current : null };
  });
  return {
    mvp: pickAward(stats.flatMap(({ zodiacCode, change }) => change !== null && change > 0 ? [{ zodiacCode, value: change }] : [])),
    cheer: pickAward(stats.flatMap(({ zodiacCode, change }) => change !== null && change < 0 ? [{ zodiacCode, value: -change }] : [])),
    king: pickAward(stats.flatMap(({ zodiacCode, ones }) => ones > 0 ? [{ zodiacCode, value: ones }] : [])),
    steady: pickAward(stats.flatMap(({ zodiacCode, covered, average }) => covered >= 5 && average !== null
      ? [{ zodiacCode, value: average }] : []), "lowest"),
  };
}

export function moodFor(rank: number | null): "star" | "happy" | "calm" | "sad" {
  return rank === 1 ? "star" : rank !== null && rank <= 3 ? "happy" : rank !== null && rank >= 10 ? "sad" : "calm";
}

export function moodLineIndex(rank: number | null): 0 | 1 | 2 | 3 | 4 | 5 {
  return rank === 1 ? 0 : rank !== null && rank <= 3 ? 1 : rank === null || rank <= 6 ? 2 : rank <= 9 ? 3 : rank <= 11 ? 4 : 5;
}

export function stampColor(rank: number | null): string {
  if (rank === null) return "transparent";
  if (rank === 1) return "#ff6f91";
  const t = (rank - 1) / 11;
  return t < 0.5 ? `hsla(345,95%,74%,${(1 - 2 * t) * 0.9 + 0.1})` : `hsla(215,70%,72%,${(t - 0.5) * 2 * 0.9 + 0.1})`;
}
