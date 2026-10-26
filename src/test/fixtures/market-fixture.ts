import { SOURCES, ZODIAC_CODES, type Source } from "@/features/fortune/domain";
import { buildSeries, expectedMornings, shiftDate } from "@/features/market/series";
import type { MarketData, MarketSourceData } from "@/features/market/types";
import { makeParsedEdition } from "@/test/factories";

const currentDate = "2026-10-26";
const start = shiftDate(currentDate, -120);

// Same seeded walk as the approved prototype. All prose is invented by the test factory.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function fixtureSource(source: Source): MarketSourceData {
  const random = mulberry32(source === "ohaasa" ? 7 : 42);
  const latent = ZODIAC_CODES.map(() => (random() - 0.5) * 4);
  const missing = source === "ohaasa" ? ["2026-10-14", "2026-10-15"] : ["2026-10-20"];
  const points = expectedMornings(source, start, currentDate).flatMap((date) => {
    const scores = latent.map((value, i) => {
      latent[i] = value * 0.85 + (random() - 0.5) * 2.2;
      return { zodiacCode: ZODIAC_CODES[i], score: latent[i] + (random() - 0.5) * 2.6 };
    });
    return missing.includes(date) ? [] : scores.sort((a, b) => b.score - a.score)
      .map(({ zodiacCode }, i) => ({ date, zodiacCode, rank: i + 1 }));
  });
  const series = buildSeries(source, start, currentDate, points);
  const entries = makeParsedEdition({ source, date: currentDate }).fortunes.map((fortune) => ({
    ...fortune, rank: series.ranks[fortune.zodiacCode].at(-1)!,
  }));
  return { series, latest: { source, editionDate: currentDate, entries } };
}

export const marketFixture: MarketData = {
  currentDate, generatedAt: "2026-10-26T03:00:00.000Z",
  sources: { ohaasa: fixtureSource("ohaasa"), gogo: fixtureSource("gogo") },
};
export const emptyMarketFixture: MarketData = {
  ...marketFixture,
  sources: Object.fromEntries(SOURCES.map((source) => [source, {
    latest: null, series: buildSeries(source, start, currentDate, []),
  }])) as MarketData["sources"],
};
