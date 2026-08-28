import {
  ZODIAC_CODES,
  type ParsedEdition,
  type Source,
  type ZodiacCode,
} from "@/features/fortune/domain";
import type { PersistEditionMetadata } from "@/db/repository";

export function makeParsedEdition(input: {
  source: Source;
  date: string;
  libraRank?: number;
}): ParsedEdition {
  const libraRank = input.libraRank ?? 7;
  const ranks = new Map<ZodiacCode, number>(
    ZODIAC_CODES.map((code, index) => [code, index + 1]),
  );
  const displaced = ZODIAC_CODES[libraRank - 1];
  ranks.set(displaced, ranks.get("libra")!);
  ranks.set("libra", libraRank);

  return {
    source: input.source,
    editionDate: input.date,
    sourceDateLabel: input.date,
    attribution: input.source === "gogo" ? "Test Author" : null,
    fortunes: ZODIAC_CODES.map((zodiacCode) => ({
      zodiacCode,
      rank: ranks.get(zodiacCode)!,
      comment: `Invented fortune for ${zodiacCode}`,
      adviceLines: [`Invented advice for ${zodiacCode}`],
      luckyHint: input.source === "ohaasa" ? "Invented notebook" : null,
      luckyColor: input.source === "gogo" ? "blue" : null,
      luckyKey: input.source === "gogo" ? "small notebook" : null,
      scores: { money: null, love: null, work: null, health: null },
      winnerCategories: [],
    })),
  };
}

export function metadata(seed: string): PersistEditionMetadata {
  return {
    contentHash: `hash-${seed}`,
    parserVersion: 1,
    fetchedAt: new Date("2026-08-25T20:15:00Z"),
  };
}
