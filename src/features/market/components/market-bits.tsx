import { flavor, formatRank, messages, type Language, type MessageKey } from "@/features/market/i18n";
import type { MarketState } from "@/features/market/market-params";
import styles from "@/features/market/market.module.css";
import { seriesUntil } from "@/features/market/metrics";
import type { MarketData, MarketSourceData } from "@/features/market/types";

// "Today" is the newest stored edition; a stale label says when that is not this morning.
export function todaySeries({ latest, series }: MarketSourceData) {
  return latest ? seriesUntil(series, latest.editionDate) : series;
}

export function staleLabel(lang: Language, data: MarketData, source: MarketState["source"]): string | null {
  const latest = data.sources[source].latest;
  return latest && latest.editionDate !== data.currentDate ? messages[lang].stale(latest.editionDate) : null;
}

export function SectionHeading({ lang, k, note }: { lang: Language; k: MessageKey; note?: string }) {
  return (
    <h2>
      {messages[lang][k]}{" "}
      <small>
        <span aria-hidden="true">{flavor(lang, k)}</span>
        {note && ` · ${note}`}
      </small>
    </h2>
  );
}

export function changeClass(change: number | null): string {
  return change === null || change === 0 ? styles.flat : change > 0 ? styles.up : styles.dn;
}

export function changeText(change: number | null): string {
  if (change === null || change === 0) return "−";
  return `${change > 0 ? "▲" : "▼"}${Math.abs(change)}`;
}

export function ChangePill({ change, suffix }: { change: number | null; suffix?: string }) {
  return (
    <span className={`${styles.chgpill} ${styles.num} ${changeClass(change)}`}>
      {changeText(change)}{suffix && ` ${suffix}`}
    </span>
  );
}

// Round rank sticker; gold, silver, and bronze for 1–3.
export function RankBadge({ lang, rank }: { lang: Language; rank: number | null }) {
  if (rank === null) return <span className={`${styles.badge} ${styles.flat}`}>−</span>;
  return (
    <span className={`${styles.badge} ${styles.num}`} data-medal={rank <= 3 ? rank : undefined}>
      <RankText lang={lang} rank={rank} />
    </span>
  );
}

export function RankText({ lang, rank }: { lang: Language; rank: number | string }) {
  const text = formatRank(lang, rank);
  return lang === "en" ? <><small>#</small>{rank}</> : <>{rank}<small>{text.slice(String(rank).length)}</small></>;
}
