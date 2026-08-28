import { RankMarket } from "@/features/rank-market/rank-market";
import { loadRankMarketData } from "@/features/rank-market/load-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadRankMarketData();

  return <RankMarket initialData={data} />;
}
