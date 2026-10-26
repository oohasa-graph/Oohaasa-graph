import type { ZodiacCode } from "@/features/fortune/domain";
import { ChangePill, SectionHeading } from "@/features/market/components/market-bits";
import { Mochi } from "@/features/market/components/mochi";
import { formatRank, messages, type Language } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { hotStreaks, topMovers } from "@/features/market/metrics";
import { signName } from "@/features/market/signs";
import type { RankSeries } from "@/features/market/types";

export function Movers({ lang, today, onSelect }: { lang: Language; today: RankSeries; onSelect: (sign: ZodiacCode) => void }) {
  const t = messages[lang], rank = (code: ZodiacCode) => today.ranks[code].at(-1) ?? null;
  const who = (code: ZodiacCode, extra?: React.ReactNode) => (
    <span className={styles.who}><Mochi sign={code} rank={rank(code)} size={28} />{signName(lang, code)}{extra}</span>
  );
  const movers = (direction: "gainers" | "losers") => {
    const list = topMovers(today, direction);
    return list.length ? list.map(({ zodiacCode, change, previousRank, rank: current }) => (
      <button key={zodiacCode} type="button" className={styles.mover} onClick={() => onSelect(zodiacCode)}>
        {who(zodiacCode, <small className={styles.num}>{formatRank(lang, previousRank)}→{formatRank(lang, current)}</small>)}
        <ChangePill change={change} />
      </button>
    )) : <p className={styles.empty}>{t.noData}</p>;
  };
  const streaks = hotStreaks(today);
  return (
    <div className={styles.abottom}>
      <section className={styles.card}><SectionHeading lang={lang} k="gainers" />{movers("gainers")}</section>
      <section className={styles.card}><SectionHeading lang={lang} k="losers" />{movers("losers")}</section>
      <section className={styles.card}>
        <SectionHeading lang={lang} k="streaks" />
        {streaks.length ? streaks.map(({ zodiacCode, days }) => (
          <button key={zodiacCode} type="button" className={styles.mover} onClick={() => onSelect(zodiacCode)}>
            {who(zodiacCode)}
            <span className={`${styles.up} ${styles.num} ${styles.streak}`}>{t.streakDays(days)}</span>
          </button>
        )) : <p className={`${styles.empty} ${styles.flat}`}>{t.noStreak}</p>}
      </section>
    </div>
  );
}
