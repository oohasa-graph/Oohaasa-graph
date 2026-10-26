import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMarketData } from "@/features/market/load-data";
import { emptyMarketFixture, marketFixture } from "@/test/fixtures/market-fixture";
import { SOURCES } from "@/features/fortune/domain";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

describe("market fixtures", () => {
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
