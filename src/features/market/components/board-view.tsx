"use client";

import Link from "next/link";
import { AwardCards } from "@/features/market/components/award-cards";
import { Controls } from "@/features/market/components/controls";
import { SectionHeading, staleLabel, todaySeries } from "@/features/market/components/market-bits";
import { RankRace } from "@/features/market/components/rank-race";
import { StampCalendar } from "@/features/market/components/stamp-calendar";
import { TopBar } from "@/features/market/components/top-bar";
import { flavor, messages, type Language } from "@/features/market/i18n";
import { marketQuery, type MarketState } from "@/features/market/market-params";
import styles from "@/features/market/market.module.css";
import { sliceSeries } from "@/features/market/metrics";
import type { MarketData } from "@/features/market/types";
import { useMarketState } from "@/features/market/use-market-state";

export function BoardView({ data, initial, lang }: { data: MarketData; initial: MarketState; lang: Language }) {
  const [state, update] = useMarketState(initial);
  const t = messages[lang], sourceData = data.sources[state.source], today = todaySeries(sourceData);
  const query = marketQuery(state), stale = staleLabel(lang, data, state.source);
  const closeDate = sourceData.latest?.editionDate;
  const select = (sign: MarketState["sign"]) => update({ sign });

  return (
    <div className={styles.page}>
      <TopBar lang={lang} current="board" returnPath={`/board${query}`} />
      <main className={styles.wrap}>
        <header className={styles.top}>
          <Link className={styles.back} href={`/${query}`}>{t.back}</Link>
          <div className={styles.brand}>
            <h1><span aria-hidden="true">☆ </span>{t.brandC}</h1>
            <small>
              <span aria-hidden="true">{flavor(lang, "brandC")}</span>
              {closeDate && ` · ${+closeDate.slice(5, 7)}/${+closeDate.slice(8, 10)} ${t.close}`}
              {stale && <> · <span className={styles.stale}>{stale}</span></>}
            </small>
          </div>
          <Controls lang={lang} state={state} onChange={update} />
        </header>
        <AwardCards lang={lang} series={sourceData.series} currentDate={data.currentDate} today={today} onSelect={select} />
        <section className={`${styles.card} ${styles.race}`}>
          <SectionHeading lang={lang} k="race" note={t.raceHint} />
          <RankRace lang={lang} range={sliceSeries(sourceData.series, state.range, data.currentDate)} today={today} sign={state.sign} onSelect={select} />
        </section>
        <section className={styles.card}>
          <SectionHeading lang={lang} k="stampcal" note={t.calHint} />
          <StampCalendar lang={lang} quarter={sliceSeries(sourceData.series, "3m", data.currentDate)} today={today} sign={state.sign} onSelect={select} />
        </section>
      </main>
    </div>
  );
}
