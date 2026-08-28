import { RankMarket } from "@/features/rank-market/rank-market";
import { loadRankMarketData } from "@/features/rank-market/load-data";
import { getJstDate } from "@/lib/time/jst";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const data = await loadRankMarketData({ generatedAt: now });

  return <RankMarket initialData={data} currentDate={getJstDate(now)} />;
}
