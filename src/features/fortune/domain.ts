export const SOURCES = ["ohaasa", "gogo"] as const;
export type Source = (typeof SOURCES)[number];

export const ZODIAC_CODES = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;
export type ZodiacCode = (typeof ZODIAC_CODES)[number];

export type WinnerCategory = "overall" | "money" | "love" | "work" | "health";
export type FortuneScores = Record<"money" | "love" | "work" | "health", number | null>;

export type ParsedFortune = {
  zodiacCode: ZodiacCode;
  rank: number;
  comment: string;
  adviceLines: string[];
  luckyHint: string | null;
  luckyColor: string | null;
  luckyKey: string | null;
  scores: FortuneScores;
  winnerCategories: WinnerCategory[];
};

export type ParsedEdition = {
  source: Source;
  editionDate: string;
  sourceDateLabel: string;
  attribution: string | null;
  fortunes: ParsedFortune[];
};

export type IngestionAttempt = "primary" | "retry_1" | "retry_2" | "final" | "manual";
export type IngestionStatus =
  | "success" | "already_complete" | "not_expected"
  | "stale" | "invalid" | "fetch_error";
