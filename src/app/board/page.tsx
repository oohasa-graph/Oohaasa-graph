import type { Metadata } from "next";
import { cookies } from "next/headers";

import { BoardView } from "@/features/market/components/board-view";
import { LANGUAGE_COOKIE, parseLanguage } from "@/features/market/language";
import { loadMarketData } from "@/features/market/load-data";
import { parseMarketParams, type SearchParams } from "@/features/market/market-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "星座ランキング市場 · Rank Market" };

export default async function BoardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const lang = parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  const data = await loadMarketData();

  return <BoardView data={data} initial={parseMarketParams(params)} lang={lang} />;
}
