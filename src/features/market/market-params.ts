import { SOURCES, ZODIAC_CODES, type Source, type ZodiacCode } from "@/features/fortune/domain";
import { MARKET_RANGES, type MarketRange } from "@/features/market/types";

export type MarketState = { sign: ZodiacCode; source: Source; range: MarketRange };
export type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const pick = <T extends string>(options: readonly T[], value: string | string[] | undefined, fallback: T): T =>
  options.find((option) => option === first(value)) ?? fallback;

// Unknown, missing, or repeated values never fail: the first value is used and anything unknown gets the default.
export function parseMarketParams(params: SearchParams): MarketState {
  return {
    sign: pick(ZODIAC_CODES, params.sign, "libra"),
    source: pick(SOURCES, params.source, "ohaasa"),
    range: pick(MARKET_RANGES, params.range, "1m"),
  };
}

export function marketQuery({ sign, source, range }: MarketState): string {
  return `?sign=${sign}&source=${source}&range=${range}`;
}

// Same shape as a page's `searchParams`: repeated keys become arrays.
export function searchToParams(search: string): SearchParams {
  const query = new URLSearchParams(search);
  return Object.fromEntries([...new Set(query.keys())].map((key) => {
    const values = query.getAll(key);
    return [key, values.length === 1 ? values[0] : values];
  }));
}
