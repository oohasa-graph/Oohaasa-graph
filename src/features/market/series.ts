import { ZODIAC_CODES, type Source, type ZodiacCode } from "@/features/fortune/domain";
import { isSourceExpected } from "@/features/ingestion/source-policy";
import type { RankSeries } from "@/features/market/types";

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function expectedMornings(source: Source, startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = shiftDate(date, 1)) {
    if (isSourceExpected(source, date)) dates.push(date);
  }
  return dates;
}

export function buildSeries(
  source: Source, startDate: string, endDate: string,
  points: { date: string; zodiacCode: ZodiacCode; rank: number }[],
): RankSeries {
  const dates = expectedMornings(source, startDate, endDate);
  const indices = new Map(dates.map((date, index) => [date, index]));
  const ranks = Object.fromEntries(ZODIAC_CODES.map((code) => [code, dates.map(() => null)])) as RankSeries["ranks"];
  for (const point of points) {
    const index = indices.get(point.date);
    if (index !== undefined) ranks[point.zodiacCode][index] = point.rank;
  }
  return { dates, ranks };
}
