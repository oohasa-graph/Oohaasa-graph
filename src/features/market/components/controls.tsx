import { SOURCES } from "@/features/fortune/domain";
import { messages, rangeLabel, sourceName, type Language } from "@/features/market/i18n";
import type { MarketState } from "@/features/market/market-params";
import styles from "@/features/market/market.module.css";
import { MARKET_RANGES } from "@/features/market/types";

export function Controls({ lang, state, onChange }: {
  lang: Language; state: MarketState; onChange: (patch: Partial<MarketState>) => void;
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.pills} role="group" aria-label={messages[lang].source}>
        {SOURCES.map((source) => (
          <button key={source} type="button" aria-pressed={state.source === source} onClick={() => onChange({ source })}>
            {sourceName(lang, source)}
          </button>
        ))}
      </div>
      <div className={styles.pills} role="group" aria-label={messages[lang].range}>
        {MARKET_RANGES.map((range) => (
          <button key={range} type="button" aria-pressed={state.range === range} onClick={() => onChange({ range })}>
            {rangeLabel(lang, range)}
          </button>
        ))}
      </div>
    </div>
  );
}
