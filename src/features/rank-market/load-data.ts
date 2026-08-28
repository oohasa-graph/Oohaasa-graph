import "server-only";

import { getRankMarketData } from "@/features/rank-market/queries";
import { rankMarketFixture } from "@/test/fixtures/rank-market-fixture";

export async function loadRankMarketData({ generatedAt = new Date() } = {}) {
  if (process.env.DATA_FIXTURE_MODE === "1") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_FIXTURE_MODE is not allowed in production");
    }

    return rankMarketFixture;
  }

  return getRankMarketData({ days: 90, generatedAt });
}
