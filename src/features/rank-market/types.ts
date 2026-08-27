import type { ParsedFortune, Source, ZodiacCode } from "@/features/fortune/domain";

export type SourceEditionView = {
  source: Source;
  editionDate: string;
  entries: ParsedFortune[];
};

export type RankMovement = {
  places: number;
  direction: "up" | "down" | "same";
};

export type RankHistoryPoint = { date: string; rank: number | null };

export type RankMarketData = {
  generatedAt: string;
  sources: Record<
    Source,
    {
      latest: SourceEditionView | null;
      history: Record<ZodiacCode, RankHistoryPoint[]>;
      movements: Record<ZodiacCode, RankMovement | null>;
      biggestMover: ZodiacCode | null;
    }
  >;
};
