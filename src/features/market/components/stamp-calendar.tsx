import { useEffect, useRef, type CSSProperties } from "react";
import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import { Mochi } from "@/features/market/components/mochi";
import { formatRank, messages, type Language } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { stampColor } from "@/features/market/metrics";
import { signName } from "@/features/market/signs";
import type { RankSeries } from "@/features/market/types";

const shortDate = (date: string) => `${+date.slice(5, 7)}/${+date.slice(8, 10)}`;

// One stamp per expected morning over the last three months. Only the stamp area scrolls sideways (arrow keys
// once focused); it opens on the newest morning and the sign column stays pinned.
export function StampCalendar({ lang, quarter, today, sign, onSelect }: {
  lang: Language; quarter: RankSeries; today: RankSeries; sign: ZodiacCode; onSelect: (sign: ZodiacCode) => void;
}) {
  const ref = useRef<HTMLDivElement>(null), days = quarter.dates.length, t = messages[lang];
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [days]);
  return (
    <>
      <div ref={ref} className={styles.stampScroller} data-testid="stamp-scroller" tabIndex={0} role="region" aria-label={t.stampcal}>
        <div className={styles.stamps} style={{ "--days": days } as CSSProperties}>
          <div className={styles.corner} />
          {quarter.dates.map((date, k) => (
            <div key={date} className={styles.day}>{(days - 1 - k) % 10 === 0 ? shortDate(date) : ""}</div>
          ))}
          {ZODIAC_CODES.map((code) => {
            const selected = code === sign;
            return (
              <div key={code} className={styles.stampRow} data-row={code}>
                <button type="button" className={styles.lab} aria-pressed={selected} onClick={() => onSelect(code)}>
                  <Mochi sign={code} rank={today.ranks[code].at(-1) ?? null} size={22} />{signName(lang, code)}
                </button>
                {quarter.ranks[code].map((rank, k) => (
                  <span
                    key={quarter.dates[k]} className={styles.stamp} data-stamp={quarter.dates[k]}
                    data-empty={rank === null || undefined} data-selected={selected || undefined}
                    style={{ background: stampColor(rank) }}
                    title={`${signName(lang, code)} · ${quarter.dates[k]} · ${rank === null ? "−" : formatRank(lang, rank)}`}
                  >
                    {rank === 1 ? "★" : ""}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.scale}>
        <span><i style={{ background: stampColor(1) }} />★{formatRank(lang, 1)}</span>
        <span><i style={{ background: stampColor(3) }} />{t.top}</span>
        <span><i style={{ background: stampColor(6) }} />{t.middle}</span>
        <span><i style={{ background: stampColor(12) }} />{t.bottom}</span>
        <span><i data-empty="" />{t.noData}</span>
      </div>
    </>
  );
}
