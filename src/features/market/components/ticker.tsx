import { ZODIAC_CODES } from "@/features/fortune/domain";
import { changeClass, changeText } from "@/features/market/components/market-bits";
import { Mochi } from "@/features/market/components/mochi";
import { formatRank, type Language } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { dailyChange } from "@/features/market/metrics";
import { SIGN_META } from "@/features/market/signs";
import type { RankSeries } from "@/features/market/types";

// Decorative tape; the watchlist carries the same facts for assistive tech. Reduced motion stops it.
export function Ticker({ lang, today }: { lang: Language; today: RankSeries }) {
  const items = (copy: string) => ZODIAC_CODES.map((code) => {
    const rank = today.ranks[code].at(-1) ?? null, change = dailyChange(today.ranks[code]);
    return (
      <span key={`${copy}-${code}`} className={styles.tick}>
        <Mochi sign={code} rank={rank} size={22} /> {SIGN_META[code].ticker}
        <span className={styles.num}>{rank === null ? "−" : formatRank(lang, rank)}</span>
        <span className={`${styles.num} ${changeClass(change)}`}>{changeText(change)}</span>
      </span>
    );
  });
  return (
    <div className={styles.tape} aria-hidden="true">
      <div className={styles.tapeInner}>{items("a")}{items("b")}</div>
    </div>
  );
}
