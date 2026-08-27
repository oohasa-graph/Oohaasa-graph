import { and, asc, desc, eq, gte } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import { editions, fortuneEntries } from "@/db/schema";
import * as schema from "@/db/schema";
import { SOURCES, ZODIAC_CODES, type ParsedFortune, type Source, type ZodiacCode } from "@/features/fortune/domain";
import { buildCalendarHistory, getBiggestMover, getMovement } from "@/features/rank-market/metrics";
import type { RankHistoryPoint, RankMarketData, RankMovement, SourceEditionView } from "@/features/rank-market/types";

type RankMarketDb<TQueryResult extends PgQueryResultHKT = PgQueryResultHKT> = PgDatabase<
  TQueryResult,
  typeof schema
>;

type Row = {
  source: Source;
  editionDate: string;
  zodiacCode: string;
  rank: number;
  comment: string;
  adviceLines: string[];
  luckyHint: string | null;
  luckyColor: string | null;
  luckyKey: string | null;
  moneyScore: number | null;
  loveScore: number | null;
  workScore: number | null;
  healthScore: number | null;
  winnerCategories: ParsedFortune["winnerCategories"];
};

type Options<TQueryResult extends PgQueryResultHKT = PgQueryResultHKT> = {
  days: number;
  db?: RankMarketDb<TQueryResult>;
  generatedAt?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startDateFor(endDate: string, days: number): string {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return isoDate(new Date(end.getTime() - (days - 1) * DAY_MS));
}

function emptyHistory(): Record<ZodiacCode, RankHistoryPoint[]> {
  return Object.fromEntries(ZODIAC_CODES.map((code) => [code, []])) as unknown as Record<
    ZodiacCode,
    RankHistoryPoint[]
  >;
}

function emptyMovements(): Record<ZodiacCode, RankMovement | null> {
  return Object.fromEntries(ZODIAC_CODES.map((code) => [code, null])) as Record<
    ZodiacCode,
    RankMovement | null
  >;
}

function toZodiacCode(value: string): ZodiacCode {
  if (ZODIAC_CODES.includes(value as ZodiacCode)) {
    return value as ZodiacCode;
  }

  throw new Error("Stored zodiac code is invalid");
}

function toFortune(row: Row): ParsedFortune {
  return {
    zodiacCode: toZodiacCode(row.zodiacCode),
    rank: row.rank,
    comment: row.comment,
    adviceLines: row.adviceLines,
    luckyHint: row.luckyHint,
    luckyColor: row.luckyColor,
    luckyKey: row.luckyKey,
    scores: {
      money: row.moneyScore,
      love: row.loveScore,
      work: row.workScore,
      health: row.healthScore,
    },
    winnerCategories: row.winnerCategories,
  };
}

async function getRecentRows<TQueryResult extends PgQueryResultHKT>(
  db: RankMarketDb<TQueryResult>,
  source: Source,
  startDate: string,
): Promise<Row[]> {
  return db
    .select({
      source: editions.source,
      editionDate: editions.editionDate,
      zodiacCode: fortuneEntries.zodiacCode,
      rank: fortuneEntries.rank,
      comment: fortuneEntries.comment,
      adviceLines: fortuneEntries.adviceLines,
      luckyHint: fortuneEntries.luckyHint,
      luckyColor: fortuneEntries.luckyColor,
      luckyKey: fortuneEntries.luckyKey,
      moneyScore: fortuneEntries.moneyScore,
      loveScore: fortuneEntries.loveScore,
      workScore: fortuneEntries.workScore,
      healthScore: fortuneEntries.healthScore,
      winnerCategories: fortuneEntries.winnerCategories,
    })
    .from(editions)
    .innerJoin(fortuneEntries, eq(fortuneEntries.editionId, editions.id))
    .where(and(eq(editions.source, source), gte(editions.editionDate, startDate)))
    .orderBy(asc(editions.source), asc(editions.editionDate), asc(fortuneEntries.rank));
}

async function getLatestDate<TQueryResult extends PgQueryResultHKT>(
  db: RankMarketDb<TQueryResult>,
  source: Source,
): Promise<string | null> {
  const [latest] = await db
    .select({ editionDate: editions.editionDate })
    .from(editions)
    .where(eq(editions.source, source))
    .orderBy(desc(editions.editionDate))
    .limit(1);

  return latest?.editionDate ?? null;
}

function buildSourceView(rows: Row[], source: Source, startDate: string, endDate: string) {
  const byDate = new Map<string, ParsedFortune[]>();
  for (const row of rows) {
    const entries = byDate.get(row.editionDate) ?? [];
    entries.push(toFortune(row));
    byDate.set(row.editionDate, entries);
  }

  const dates = [...byDate.keys()].sort();
  const latestDate = dates.at(-1) ?? null;
  const previousDate = dates.at(-2) ?? null;
  const latestEntries = latestDate ? [...(byDate.get(latestDate) ?? [])].sort((a, b) => a.rank - b.rank) : [];
  const previousEntries = previousDate ? byDate.get(previousDate) ?? [] : [];
  const latest: SourceEditionView | null = latestDate
    ? { source, editionDate: latestDate, entries: latestEntries }
    : null;

  const history = emptyHistory();
  const movements = emptyMovements();
  for (const zodiacCode of ZODIAC_CODES) {
    const captured = dates
      .map((date) => ({
        date,
        rank: byDate.get(date)?.find((entry) => entry.zodiacCode === zodiacCode)?.rank ?? null,
      }))
      .filter((point) => point.rank !== null);
    history[zodiacCode] = buildCalendarHistory(startDate, endDate, captured);

    const currentRank = latestEntries.find((entry) => entry.zodiacCode === zodiacCode)?.rank;
    const previousRank = previousEntries.find((entry) => entry.zodiacCode === zodiacCode)?.rank;
    movements[zodiacCode] =
      currentRank && previousRank ? getMovement({ currentRank, previousRank }) : null;
  }

  return {
    latest,
    history,
    movements,
    biggestMover: getBiggestMover(movements),
  };
}

export async function getRankMarketData<TQueryResult extends PgQueryResultHKT = PgQueryResultHKT>({
  days,
  db = getDb() as RankMarketDb<TQueryResult>,
  generatedAt = new Date(),
}: Options<TQueryResult>): Promise<RankMarketData> {
  const boundedDays = Math.max(1, Math.min(90, Math.floor(days)));
  const output = {
    generatedAt: generatedAt.toISOString(),
    sources: {},
  } as RankMarketData;

  for (const source of SOURCES) {
    const latestDate = await getLatestDate(db, source);
    if (!latestDate) {
      output.sources[source] = {
        latest: null,
        history: emptyHistory(),
        movements: emptyMovements(),
        biggestMover: null,
      };
      continue;
    }

    const startDate = startDateFor(latestDate, boundedDays);
    const rows = await getRecentRows(db, source, startDate);
    output.sources[source] = buildSourceView(rows, source, startDate, latestDate);
  }

  return output;
}
