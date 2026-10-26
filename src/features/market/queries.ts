import { and, asc, eq, lte, max, min } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { toParsedFortune } from "@/db/repository";
import { editions, fortuneEntries } from "@/db/schema";
import * as schema from "@/db/schema";
import { SOURCES, ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import { buildSeries, shiftDate } from "@/features/market/series";
import type { MarketData, MarketSourceData } from "@/features/market/types";
import { getJstDate } from "@/lib/time/jst";

type Options = {
  db?: PgDatabase<PgQueryResultHKT, typeof schema>;
  generatedAt?: Date;
  currentDate?: string;
};

export async function getMarketData(
  { db = getDb(), generatedAt = new Date(), currentDate = getJstDate(generatedAt) }: Options = {},
): Promise<MarketData> {
  const sources = await Promise.all(SOURCES.map(async (source): Promise<[typeof source, MarketSourceData]> => {
    const sourceFilter = and(eq(editions.source, source), lte(editions.editionDate, currentDate));
    const [bounds] = await db.select({ first: min(editions.editionDate), last: max(editions.editionDate) })
      .from(editions).where(sourceFilter);
    const baseline = shiftDate(currentDate, -90);
    const start = bounds.first && bounds.first < baseline ? bounds.first : baseline;
    // Keep archive prose out of the history query and the client payload.
    const [history, latestRows] = await Promise.all([
      db.select({ date: editions.editionDate, zodiacCode: fortuneEntries.zodiacCode, rank: fortuneEntries.rank })
        .from(editions).innerJoin(fortuneEntries, eq(fortuneEntries.editionId, editions.id))
        .where(sourceFilter).orderBy(asc(editions.editionDate)),
      bounds.last ? db.select({ entry: fortuneEntries }).from(editions)
        .innerJoin(fortuneEntries, eq(fortuneEntries.editionId, editions.id))
        .where(and(eq(editions.source, source), eq(editions.editionDate, bounds.last)))
        .orderBy(asc(fortuneEntries.rank)) : Promise.resolve([]),
    ]);
    const points = history.map((row) => {
      if (!ZODIAC_CODES.includes(row.zodiacCode as ZodiacCode)) throw new Error("Stored zodiac code is invalid");
      return { ...row, zodiacCode: row.zodiacCode as ZodiacCode };
    });
    return [source, {
      latest: bounds.last && latestRows.length ? {
        source, editionDate: bounds.last, entries: latestRows.map(({ entry }) => toParsedFortune(entry)),
      } : null,
      series: buildSeries(source, start, currentDate, points),
    }];
  }));
  return { generatedAt: generatedAt.toISOString(), currentDate, sources: Object.fromEntries(sources) as MarketData["sources"] };
}
