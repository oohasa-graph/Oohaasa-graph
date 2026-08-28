import type { ParsedFortune, ZodiacCode } from "@/features/fortune/domain";
import { ZODIAC_LABELS } from "@/features/rank-market/components/sign-picker";
import styles from "@/features/rank-market/rank-market.module.css";

export function RankRace({
  entries,
  selectedZodiac,
}: {
  entries: ParsedFortune[];
  selectedZodiac: ZodiacCode;
}) {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);

  return (
    <section className={styles.panel} aria-labelledby="rank-race-title">
      <div className={styles.panelHeader}>
        <p className={styles.kicker}>All 12 rank race</p>
        <h2 id="rank-race-title">Leaderboard momentum</h2>
      </div>
      <ol className={styles.raceList}>
        {sorted.map((entry) => (
          <li
            key={entry.zodiacCode}
            className={entry.zodiacCode === selectedZodiac ? styles.raceItemActive : styles.raceItem}
          >
            <span>#{entry.rank}</span>
            <strong>{ZODIAC_LABELS[entry.zodiacCode]}</strong>
            <div className={styles.raceTrack} aria-hidden="true">
              <span style={{ width: `${Math.max(8, (13 - entry.rank) * 7)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
