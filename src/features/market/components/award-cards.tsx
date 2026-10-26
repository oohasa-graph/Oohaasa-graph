import type { ZodiacCode } from "@/features/fortune/domain";
import { Mochi } from "@/features/market/components/mochi";
import { formatRank, messages, type Language, type MessageKey } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { weeklyAwards } from "@/features/market/metrics";
import { signName } from "@/features/market/signs";
import type { RankSeries } from "@/features/market/types";

type AwardKey = keyof ReturnType<typeof weeklyAwards>;

export function AwardCards({ lang, series, currentDate, today, onSelect }: {
  lang: Language; series: RankSeries; currentDate: string; today: RankSeries; onSelect: (sign: ZodiacCode) => void;
}) {
  const t = messages[lang], awards = weeklyAwards(series, currentDate);
  const cards: [AwardKey, MessageKey, MessageKey, (value: number) => string, string][] = [
    ["mvp", "mvp", "vsLastWeek", (value) => `▲${value.toFixed(1)}`, styles.up],
    ["cheer", "cheer", "vsLastWeek", (value) => `▼${value.toFixed(1)}`, styles.dn],
    ["king", "king", "ones3m", (value) => t.times(value), styles.up],
    ["steady", "chip", "avg3m", (value) => formatRank(lang, value.toFixed(1)), styles.up],
  ];
  return (
    <div className={styles.kpis}>
      {cards.map(([key, stamp, description, format, tone]) => {
        const award = awards[key];
        if (!award) {
          return (
            <div key={key} className={`${styles.kpi} ${styles.muted}`}>
              <span className={styles.hanko}>{t[stamp]}</span>
              <b>{t.noData}</b>
            </div>
          );
        }
        const { zodiacCode, value } = award;
        return (
          <button key={key} type="button" className={styles.kpi} onClick={() => onSelect(zodiacCode)}>
            <span className={styles.face}><Mochi sign={zodiacCode} rank={today.ranks[zodiacCode].at(-1) ?? null} size={62} /></span>
            <span className={styles.hanko}>{t[stamp]}</span>
            <b>{signName(lang, zodiacCode)}</b>
            <span>{t[description]}</span> <span className={`${tone} ${styles.num} ${styles.value}`}>{format(value)}</span>
          </button>
        );
      })}
    </div>
  );
}
