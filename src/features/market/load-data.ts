import "server-only";
import { getMarketData } from "@/features/market/queries";
import { marketFixture } from "@/test/fixtures/market-fixture";

export async function loadMarketData({ generatedAt = new Date() } = {}) {
  if (process.env.DATA_FIXTURE_MODE === "1") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_FIXTURE_MODE is not allowed in production");
    }
    return marketFixture;
  }
  return getMarketData({ generatedAt });
}
