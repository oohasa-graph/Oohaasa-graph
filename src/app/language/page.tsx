import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LanguageView } from "@/features/market/components/language-view";
import { LANGUAGE_COOKIE, parseLanguage, sanitizeReturnPath } from "@/features/market/language";
import type { SearchParams } from "@/features/market/market-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Language · Rank Market" };

export default async function LanguagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { return: returnParam } = await searchParams;
  const lang = parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  const returnPath = sanitizeReturnPath(Array.isArray(returnParam) ? returnParam[0] : returnParam);

  return <LanguageView lang={lang} returnPath={returnPath} />;
}
