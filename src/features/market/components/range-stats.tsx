import { formatRank, messages, type Language } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { rangeStats } from "@/features/market/metrics";

// Stats count only mornings with data; the coverage line says how many expected mornings that was.
export function RangeStats({ lang, values }: { lang: Language; values: (number | null)[] }) {
  const t = messages[lang], stats = rangeStats(values);
  const items = [
    [t.avg, stats.average === null ? "−" : formatRank(lang, stats.average.toFixed(1))],
    [t.best, stats.best === null ? "−" : `${formatRank(lang, stats.best)} / ${formatRank(lang, stats.worst!)}`],
    [t.ones, t.times(stats.ones)],
    [t.swing, stats.volatility === null ? "−" : stats.volatility.toFixed(1)],
  ];
  return (
    <>
      <div className={styles.stats}>
        {items.map(([label, value]) => (
          <div key={label} className={styles.stat}>
            <span className={styles.hanko}>{label}</span>
            <b className={styles.num}>{value}</b>
          </div>
        ))}
      </div>
      <p className={styles.coverage}>{t.coverage(stats.covered, stats.expected)}</p>
    </>
  );
}
