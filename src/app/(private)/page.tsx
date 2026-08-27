import { RankMarket } from "@/features/rank-market/rank-market";
import { getRankMarketData } from "@/features/rank-market/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getRankMarketData({ days: 90 });

  return <RankMarket initialData={data} />;
}
