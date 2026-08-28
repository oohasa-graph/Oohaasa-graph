import type { ParsedFortune, Source } from "@/features/fortune/domain";
import styles from "@/features/rank-market/rank-market.module.css";

const SCORE_LABELS = ["money", "love", "work", "health"] as const;

export function FortunePanel({
  source,
  fortune,
}: {
  source: Source;
  fortune: ParsedFortune | null;
}) {
  if (!fortune) {
    return (
      <article className={styles.panel}>
        <p className={styles.kicker}>Fortune details</p>
        <h2>No complete fortune yet</h2>
        <p>Waiting for a complete source edition before showing details.</p>
      </article>
    );
  }

  return (
    <article className={styles.panel}>
      <p className={styles.kicker}>Fortune details</p>
      <h2>Source-specific signal</h2>
      <p>{fortune.comment}</p>
      {fortune.adviceLines.length > 0 ? (
        <ul className={styles.adviceList} aria-label="Advice lines">
          {fortune.adviceLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <dl className={styles.metaList}>
        {source === "ohaasa" ? (
          <div>
            <dt>Lucky hint</dt>
            <dd>{fortune.luckyHint}</dd>
          </div>
        ) : null}
        {source === "gogo" ? (
          <>
            <div>
              <dt>Lucky color</dt>
              <dd>{fortune.luckyColor}</dd>
            </div>
            <div>
              <dt>Lucky key</dt>
              <dd>{fortune.luckyKey}</dd>
            </div>
          </>
        ) : null}
      </dl>
      {source === "gogo" ? (
        <div className={styles.scoreGrid} aria-label="Category scores">
          {SCORE_LABELS.map((score) => (
            <span key={score}>
              {score}: {fortune.scores[score] ?? "—"}
            </span>
          ))}
        </div>
      ) : null}
      {fortune.winnerCategories.length > 0 ? (
        <p className={styles.winnerLabels}>
          Winner labels: {fortune.winnerCategories.join(", ")}
        </p>
      ) : null}
    </article>
  );
}
