"use client";

import { useMemo, useState } from "react";

import { SOURCES, ZODIAC_CODES, type Source, type ZodiacCode } from "@/features/fortune/domain";
import { RankHero } from "@/features/rank-market/components/rank-hero";
import { RankRace } from "@/features/rank-market/components/rank-race";
import { SignPicker } from "@/features/rank-market/components/sign-picker";
import { SourceToggle } from "@/features/rank-market/components/source-toggle";
import type { RankMarketData } from "@/features/rank-market/types";
import styles from "@/features/rank-market/rank-market.module.css";

const STORAGE_KEY = "selected-zodiac";
const SOURCE_LABELS: Record<Source, string> = {
  ohaasa: "Ohaasa",
  gogo: "Gogo",
};

function isZodiacCode(value: string | null): value is ZodiacCode {
  return ZODIAC_CODES.includes(value as ZodiacCode);
}

function initialZodiac(): ZodiacCode {
  if (typeof window === "undefined") {
    return "libra";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isZodiacCode(stored) ? stored : "libra";
}

function initialSource(data: RankMarketData): Source {
  return SOURCES.find((source) => data.sources[source].latest !== null) ?? "ohaasa";
}

export function RankMarket({ initialData }: { initialData: RankMarketData }) {
  const [source, setSource] = useState<Source>(() => initialSource(initialData));
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacCode>(initialZodiac);

  const selectedSource = initialData.sources[source];
  const entries = useMemo(
    () => selectedSource.latest?.entries ?? [],
    [selectedSource.latest?.entries],
  );
  const selectedFortune = useMemo(
    () => entries.find((entry) => entry.zodiacCode === selectedZodiac) ?? null,
    [entries, selectedZodiac],
  );

  function selectZodiac(zodiacCode: ZodiacCode) {
    setSelectedZodiac(zodiacCode);
    window.localStorage.setItem(STORAGE_KEY, zodiacCode);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.livePill}>Live private prototype</p>
          <h1>Fortune rank market</h1>
        </div>
        <p className={styles.generated}>Generated {initialData.generatedAt}</p>
      </header>

      <section className={styles.controls}>
        <SourceToggle selected={source} onSelect={setSource} />
        <SignPicker selected={selectedZodiac} onSelect={selectZodiac} />
      </section>

      <RankHero
        source={source}
        fortune={selectedFortune}
        editionDate={selectedSource.latest?.editionDate ?? null}
      />

      <section className={styles.comparisonGrid} aria-label="Source comparison">
        {SOURCES.map((sourceCode) => {
          const sourceData = initialData.sources[sourceCode];
          const fortune = sourceData.latest?.entries.find(
            (entry) => entry.zodiacCode === selectedZodiac,
          );
          return (
            <article key={sourceCode} className={styles.comparisonCard}>
              <span>{SOURCE_LABELS[sourceCode]}</span>
              <strong>{fortune ? `#${fortune.rank} / 12` : "No edition"}</strong>
              <small>{sourceData.latest?.editionDate ?? "Waiting"}</small>
            </article>
          );
        })}
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.panel}>
          <p className={styles.kicker}>Selected market</p>
          <h2>Selected signal</h2>
          <p>{selectedFortune?.comment ?? "No complete edition yet."}</p>
          <dl className={styles.metaList}>
            <div>
              <dt>Lucky hint</dt>
              <dd>{selectedFortune?.luckyHint ?? selectedFortune?.luckyKey ?? "—"}</dd>
            </div>
            <div>
              <dt>Lucky color</dt>
              <dd>{selectedFortune?.luckyColor ?? "—"}</dd>
            </div>
          </dl>
        </article>
        <RankRace entries={entries} selectedZodiac={selectedZodiac} />
      </section>
    </main>
  );
}
