"use client";

import { useMemo, useState } from "react";

import { SOURCES, ZODIAC_CODES, type Source, type ZodiacCode } from "@/features/fortune/domain";
import { DataStatus } from "@/features/rank-market/components/data-status";
import { FortunePanel } from "@/features/rank-market/components/fortune-panel";
import { RankHero } from "@/features/rank-market/components/rank-hero";
import { RankMetrics } from "@/features/rank-market/components/rank-metrics";
import { RankRace } from "@/features/rank-market/components/rank-race";
import { RankTrend } from "@/features/rank-market/components/rank-trend";
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

export function RankMarket({
  initialData,
  currentDate,
}: {
  initialData: RankMarketData;
  currentDate: string;
}) {
  const [source, setSource] = useState<Source>(() => initialSource(initialData));
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacCode>(initialZodiac);
  const [trendRange, setTrendRange] = useState<7 | 30 | 90>(30);

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
        <div className={styles.sideStack}>
          <DataStatus
            source={source}
            editionDate={selectedSource.latest?.editionDate ?? null}
            currentDate={currentDate}
          />
          <RankMetrics
            history={selectedSource.history[selectedZodiac]}
            movement={selectedSource.movements[selectedZodiac]}
            biggestMover={selectedSource.biggestMover}
          />
          <FortunePanel source={source} fortune={selectedFortune} />
        </div>
        <div className={styles.sideStack}>
          <RankTrend
            points={selectedSource.history[selectedZodiac]}
            range={trendRange}
            onRangeChange={setTrendRange}
          />
          <RankRace entries={entries} selectedZodiac={selectedZodiac} />
        </div>
      </section>
    </main>
  );
}
