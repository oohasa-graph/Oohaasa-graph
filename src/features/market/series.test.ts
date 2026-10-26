import { describe, expect, it } from "vitest";
import { buildSeries, expectedMornings } from "@/features/market/series";

describe("expected morning axis", () => {
  it("excludes Ohaasa weekends and Japanese holidays, but not Gogo days", () => {
    expect(expectedMornings("ohaasa", "2026-10-23", "2026-10-27")).toEqual([
      "2026-10-23", "2026-10-26", "2026-10-27",
    ]);
    expect(expectedMornings("gogo", "2026-10-23", "2026-10-27")).toHaveLength(5);
    expect(expectedMornings("ohaasa", "2026-11-02", "2026-11-04")).toEqual([
      "2026-11-02", "2026-11-04",
    ]);
  });

  it("keeps missing expected mornings null and ignores non-expected points", () => {
    const series = buildSeries("ohaasa", "2026-10-23", "2026-10-27", [
      { date: "2026-10-23", zodiacCode: "libra", rank: 2 },
      { date: "2026-10-24", zodiacCode: "libra", rank: 1 },
      { date: "2026-10-27", zodiacCode: "libra", rank: 5 },
    ]);
    expect(series.dates).toEqual(["2026-10-23", "2026-10-26", "2026-10-27"]);
    expect(series.ranks.libra).toEqual([2, null, 5]);
    expect(series.ranks.aries).toEqual([null, null, null]);
    expect(expectedMornings("gogo", "2026-10-27", "2026-10-26")).toEqual([]);
  });
});
