import "server-only";
import { getMarketData } from "@/features/market/queries";
import { marketFixture, sparseMarketFixture } from "@/test/fixtures/market-fixture";

export async function loadMarketData({ generatedAt = new Date() } = {}) {
  const fixtureMode = process.env.DATA_FIXTURE_MODE;
  if (fixtureMode === "1" || fixtureMode === "sparse") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_FIXTURE_MODE is not allowed in production");
    }
    return fixtureMode === "sparse" ? sparseMarketFixture : marketFixture;
  }
  return getMarketData({ generatedAt });
}
