import type { Source } from "@/features/fortune/domain";
import styles from "@/features/rank-market/rank-market.module.css";

const SOURCE_LABELS: Record<Source, string> = {
  ohaasa: "Ohaasa",
  gogo: "Gogo",
};

export function DataStatus({
  source,
  editionDate,
  currentDate,
}: {
  source: Source;
  editionDate: string | null;
  currentDate: string;
}) {
  if (!editionDate) {
    return (
      <div className={styles.statusCard}>
        <strong>Waiting for {SOURCE_LABELS[source]}</strong>
        <span>No complete edition stored</span>
      </div>
    );
  }

  const stale = editionDate < currentDate;

  return (
    <div className={styles.statusCard}>
      <strong>Edition {editionDate}</strong>
      <span className={stale ? styles.staleBadge : styles.currentBadge}>
        {stale ? "Stale source date" : "Current source date"}
      </span>
    </div>
  );
}
