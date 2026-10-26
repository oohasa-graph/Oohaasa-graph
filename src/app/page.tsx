import { cookies } from "next/headers";

import { MainView } from "@/features/market/components/main-view";
import { LANGUAGE_COOKIE, parseLanguage } from "@/features/market/language";
import { loadMarketData } from "@/features/market/load-data";
import { parseMarketParams, type SearchParams } from "@/features/market/market-params";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const lang = parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  const data = await loadMarketData();

  return <MainView data={data} initial={parseMarketParams(params)} lang={lang} />;
}
