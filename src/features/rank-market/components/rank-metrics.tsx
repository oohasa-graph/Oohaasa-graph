import type { ZodiacCode } from "@/features/fortune/domain";
import { getTopThreeStreak } from "@/features/rank-market/metrics";
import type { RankHistoryPoint, RankMovement } from "@/features/rank-market/types";
import { ZODIAC_LABELS } from "@/features/rank-market/components/sign-picker";
import styles from "@/features/rank-market/rank-market.module.css";

function movementText(movement: RankMovement | null): string {
  if (!movement) {
    return "Building history";
  }
  if (movement.direction === "same") {
    return "Same rank";
  }
  return `${movement.direction === "up" ? "Up" : "Down"} ${movement.places} places`;
}

export function RankMetrics({
  history,
  movement,
  biggestMover,
}: {
  history: RankHistoryPoint[];
  movement: RankMovement | null;
  biggestMover: ZodiacCode | null;
}) {
  const capturedCount = history.filter((point) => point.rank !== null).length;
  const topThreeStreak = getTopThreeStreak(history);

  return (
    <section className={styles.metricsGrid} aria-label="Rank metrics">
      <article className={styles.metricCard}>
        <span>Movement</span>
        <strong>{capturedCount < 2 ? "Building history" : movementText(movement)}</strong>
      </article>
      <article className={styles.metricCard}>
        <span>Top-three streak</span>
        <strong>{capturedCount < 2 ? "Building history" : `${topThreeStreak} editions`}</strong>
      </article>
      <article className={styles.metricCard}>
        <span>Biggest mover</span>
        <strong>{biggestMover ? ZODIAC_LABELS[biggestMover] : "Building history"}</strong>
      </article>
    </section>
  );
}
