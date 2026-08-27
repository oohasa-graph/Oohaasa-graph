import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import type { RankHistoryPoint, RankMarketData, RankMovement } from "@/features/rank-market/types";
import { makeParsedEdition } from "@/test/factories";

const emptyHistory = () =>
  Object.fromEntries(ZODIAC_CODES.map((code) => [code, []])) as unknown as Record<
    ZodiacCode,
    RankHistoryPoint[]
  >;

const emptyMovements = () =>
  Object.fromEntries(ZODIAC_CODES.map((code) => [code, null])) as Record<
    ZodiacCode,
    RankMovement | null
  >;

const ohaasaEdition = makeParsedEdition({
  source: "ohaasa",
  date: "2026-08-26",
  libraRank: 9,
});
const gogoEdition = makeParsedEdition({
  source: "gogo",
  date: "2026-08-26",
  libraRank: 1,
});

export const ohaasaFortune = ohaasaEdition.fortunes.find(
  (item) => item.zodiacCode === "libra",
)!;
export const gogoFortune = gogoEdition.fortunes.find(
  (item) => item.zodiacCode === "libra",
)!;
export const historyWithWeekendGap = [
  { date: "2026-08-14", rank: 3 },
  { date: "2026-08-15", rank: null },
  { date: "2026-08-16", rank: null },
  { date: "2026-08-17", rank: 1 },
] satisfies RankHistoryPoint[];

export const dashboardFixture: RankMarketData = {
  generatedAt: "2026-08-26T05:15:00+09:00",
  sources: {
    ohaasa: {
      latest: {
        source: "ohaasa",
        editionDate: "2026-08-26",
        entries: ohaasaEdition.fortunes,
      },
      history: emptyHistory(),
      movements: emptyMovements(),
      biggestMover: "taurus",
    },
    gogo: {
      latest: {
        source: "gogo",
        editionDate: "2026-08-26",
        entries: gogoEdition.fortunes,
      },
      history: emptyHistory(),
      movements: emptyMovements(),
      biggestMover: "aquarius",
    },
  },
};
