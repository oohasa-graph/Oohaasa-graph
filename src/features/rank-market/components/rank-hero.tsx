import type { ParsedFortune, Source } from "@/features/fortune/domain";
import { ZODIAC_LABELS } from "@/features/rank-market/components/sign-picker";
import styles from "@/features/rank-market/rank-market.module.css";

const SOURCE_LABELS: Record<Source, string> = {
  ohaasa: "Ohaasa",
  gogo: "Gogo",
};

export function RankHero({
  source,
  fortune,
  editionDate,
}: {
  source: Source;
  fortune: ParsedFortune | null;
  editionDate: string | null;
}) {
  if (!fortune) {
    return (
      <section className={styles.hero}>
        <p className={styles.kicker}>What rank am I today?</p>
        <h1>No current rank</h1>
        <p>Waiting for a complete {SOURCE_LABELS[source]} edition.</p>
      </section>
    );
  }

  return (
    <section className={styles.hero}>
      <p className={styles.kicker}>What rank am I today?</p>
      <h1>
        {ZODIAC_LABELS[fortune.zodiacCode]} #{fortune.rank} / 12
      </h1>
      <div className={styles.heroMeta}>
        <span>Viewing {SOURCE_LABELS[source]}</span>
        <span>{editionDate}</span>
        <span>{ZODIAC_LABELS[fortune.zodiacCode]} · you</span>
      </div>
      <p className={styles.heroComment}>{fortune.comment}</p>
    </section>
  );
}
