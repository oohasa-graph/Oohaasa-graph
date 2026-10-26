import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMarketData } from "@/features/market/load-data";
import { emptyMarketFixture, marketFixture, sparseMarketFixture } from "@/test/fixtures/market-fixture";
import { SOURCES } from "@/features/fortune/domain";

vi.mock("server-only", () => ({}));
vi.mock("@/features/market/queries", () => ({
  getMarketData: vi.fn(() => { throw new Error("Fixture mode must not query the database"); }),
}));
afterEach(() => vi.unstubAllEnvs());

describe("market fixtures", () => {
  it("offers a deterministic sparse preview without changing recorded ranks or allowing production use", async () => {
    vi.stubEnv("DATA_FIXTURE_MODE", "sparse");
    const data = await loadMarketData();
    expect(data).toBe(sparseMarketFixture);
    const { series } = data.sources.ohaasa;
    const dates = series.dates.filter((date, i) => date > "2026-09-26" && series.ranks.libra[i] !== null);
    expect(dates).toEqual(["2026-09-30", "2026-10-02", "2026-10-07", "2026-10-09", "2026-10-13", "2026-10-16", "2026-10-26"]);
    for (const source of SOURCES) {
      expect(data.sources[source].latest).toEqual(marketFixture.sources[source].latest);
      expect(data.sources[source].series.ranks.libra.at(-1)).not.toBeNull();
    }
    vi.stubEnv("NODE_ENV", "production");
    await expect(loadMarketData()).rejects.toThrow("not allowed in production");
  });
  it("returns invented deterministic fixtures only outside production", async () => {
    vi.stubEnv("DATA_FIXTURE_MODE", "1");
    expect(await loadMarketData()).toBe(marketFixture);
    for (const source of SOURCES) {
      const data = marketFixture.sources[source];
      expect(new Set(data.latest?.entries.map((entry) => entry.rank)).size).toBe(12);
      expect(data.latest?.entries.every((entry) => entry.comment.startsWith("Invented"))).toBe(true);
      const missing = source === "ohaasa" ? "2026-10-14" : "2026-10-20";
      expect(data.series.ranks.libra[data.series.dates.indexOf(missing)]).toBeNull();
      expect(emptyMarketFixture.sources[source].latest).toBeNull();
      expect(emptyMarketFixture.sources[source].series.ranks.libra.every((rank) => rank === null)).toBe(true);
    }
    vi.stubEnv("NODE_ENV", "production");
    await expect(loadMarketData()).rejects.toThrow("not allowed in production");
  });
});
