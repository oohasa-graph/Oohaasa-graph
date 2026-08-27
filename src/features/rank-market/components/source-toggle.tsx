import type { Source } from "@/features/fortune/domain";
import styles from "@/features/rank-market/rank-market.module.css";

const LABELS: Record<Source, string> = {
  ohaasa: "Ohaasa",
  gogo: "Gogo",
};

export function SourceToggle({
  selected,
  onSelect,
}: {
  selected: Source;
  onSelect: (source: Source) => void;
}) {
  return (
    <div className={styles.sourceToggle} aria-label="Fortune source">
      {(Object.keys(LABELS) as Source[]).map((source) => (
        <button
          key={source}
          type="button"
          className={source === selected ? styles.sourceButtonActive : styles.sourceButton}
          aria-pressed={source === selected}
          onClick={() => onSelect(source)}
        >
          {LABELS[source]}
        </button>
      ))}
    </div>
  );
}
