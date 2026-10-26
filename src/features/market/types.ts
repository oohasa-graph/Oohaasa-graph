import type { ParsedFortune, Source, ZodiacCode } from "@/features/fortune/domain";

export const MARKET_RANGES = ["1w", "1m", "3m", "all"] as const;
export type MarketRange = (typeof MARKET_RANGES)[number];
export const RANGE_DAYS = { "1w": 7, "1m": 30, "3m": 91 } as const;

export type RankSeries = {
  dates: string[];
  ranks: Record<ZodiacCode, (number | null)[]>;
};
export type MarketEdition = { source: Source; editionDate: string; entries: ParsedFortune[] };
export type MarketSourceData = { latest: MarketEdition | null; series: RankSeries };
export type MarketData = {
  generatedAt: string;
  currentDate: string;
  sources: Record<Source, MarketSourceData>;
};
