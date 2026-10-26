import type { Metadata } from "next";
import { Gowun_Dodum, Jua, Zen_Maru_Gothic } from "next/font/google";
import { cookies } from "next/headers";

import { LANGUAGE_COOKIE, parseLanguage } from "@/features/market/language";
import "./globals.css";

// CJK fonts are large and split by unicode-range, so none of them is preloaded.
const maru = Zen_Maru_Gothic({ weight: ["500", "700", "900"], preload: false, variable: "--font-maru" });
const koHeading = Jua({ weight: "400", preload: false, variable: "--font-ko-heading" });
const koBody = Gowun_Dodum({ weight: "400", preload: false, variable: "--font-ko-body" });

export const metadata: Metadata = {
  title: "うらない証券取引所 · Rank Market",
  description: "Ohaasa and Gogo zodiac rankings over time, as a cute little stock market.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  return (
    <html lang={lang} className={`${maru.variable} ${koHeading.variable} ${koBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
