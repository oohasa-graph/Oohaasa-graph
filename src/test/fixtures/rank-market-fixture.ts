import type { RankMarketData } from "@/features/rank-market/types";
import { dashboardFixture, historyWithWeekendGap } from "@/test/fixtures/dashboard-data";

export const rankMarketFixture: RankMarketData = structuredClone(dashboardFixture);

rankMarketFixture.sources.ohaasa.history.libra = historyWithWeekendGap;
rankMarketFixture.sources.ohaasa.movements.libra = { places: 5, direction: "up" };
rankMarketFixture.sources.gogo.history.libra = historyWithWeekendGap;
rankMarketFixture.sources.gogo.movements.libra = { places: 3, direction: "up" };
