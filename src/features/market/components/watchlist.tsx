import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import { linePaths, scaleRank, valueRuns, xForIndex } from "@/features/market/chart-geometry";
import { ChangePill, RankBadge } from "@/features/market/components/market-bits";
import { Mochi } from "@/features/market/components/mochi";
import { messages, rangeLabel, type Language } from "@/features/market/i18n";
import type { MarketState } from "@/features/market/market-params";
import styles from "@/features/market/market.module.css";
import { dailyChange, rangeStats } from "@/features/market/metrics";
import { lineColor, signName } from "@/features/market/signs";
import type { RankSeries } from "@/features/market/types";

export function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const x = (i: number) => xForIndex(i, values.length, 3, 78), y = (v: number) => scaleRank(v, 4, 18);
  return (
    <svg className={styles.spark} viewBox="0 0 84 26" aria-hidden="true">
      {linePaths(values, x, y).map((d) => (
        <path key={d} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {valueRuns(values).filter((run) => run.length === 1).map(([i]) => (
        <circle key={i} cx={x(i)} cy={y(values[i]!)} r="1.8" fill={color} />
      ))}
    </svg>
  );
}

export function Watchlist({ lang, state, today, range, onSelect }: {
  lang: Language; state: MarketState; today: RankSeries; range: RankSeries; onSelect: (sign: ZodiacCode) => void;
}) {
  const t = messages[lang];
  const latest = (code: ZodiacCode) => today.ranks[code].at(-1) ?? null;
  const order = [...ZODIAC_CODES].sort((a, b) => (latest(a) ?? 99) - (latest(b) ?? 99));
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">{t.thSign}</th>
          <th scope="col">{t.thRank}</th>
          <th scope="col">{t.thChg}</th>
          <th scope="col">{rangeLabel(lang, state.range)}</th>
          <th scope="col" className={styles.hiLo}>{t.thHiLo}</th>
        </tr>
      </thead>
      <tbody>
        {order.map((code) => {
          const selected = code === state.sign, stats = rangeStats(range.ranks[code]);
          return (
            <tr key={code} data-selected={selected} onClick={() => onSelect(code)}>
              <td>
                <button type="button" className={styles.rowButton} aria-pressed={selected}>
                  <Mochi sign={code} rank={latest(code)} size={30} />{signName(lang, code)}
                </button>
              </td>
              <td><RankBadge lang={lang} rank={latest(code)} /></td>
              <td><ChangePill change={dailyChange(today.ranks[code])} /></td>
              <td className={styles.sparkCell}><Sparkline values={range.ranks[code]} color={lineColor(code)} /></td>
              <td className={`${styles.hiLo} ${styles.num}`}>
                {stats.best === null ? "−" : <><span className={styles.up}>{stats.best}</span> / <span className={styles.dn}>{stats.worst}</span></>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
