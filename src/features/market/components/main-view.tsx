"use client";

import { useEffect, useState } from "react";
import { SOURCES } from "@/features/fortune/domain";
import { Controls } from "@/features/market/components/controls";
import { ChangePill, RankText, SectionHeading, staleLabel, todaySeries } from "@/features/market/components/market-bits";
import { Mochi } from "@/features/market/components/mochi";
import { Movers } from "@/features/market/components/movers";
import { FortuneCard } from "@/features/market/components/fortune-card";
import { RangeStats } from "@/features/market/components/range-stats";
import { RankChart } from "@/features/market/components/rank-chart";
import { Ticker } from "@/features/market/components/ticker";
import { TopBar } from "@/features/market/components/top-bar";
import { Watchlist } from "@/features/market/components/watchlist";
import { flavor, messages, moodLine, sourceName, type Language } from "@/features/market/i18n";
import { marketQuery, type MarketState } from "@/features/market/market-params";
import styles from "@/features/market/market.module.css";
import { comparisonLine, dailyChange, moodLineIndex, sliceSeries } from "@/features/market/metrics";
import { SIGN_META, lineColor, pastelColor, signName } from "@/features/market/signs";
import type { MarketData } from "@/features/market/types";
import { useMarketState } from "@/features/market/use-market-state";

const JST_TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });

// Rendered only after mount, so server and client HTML agree.
function useJstClock(): string {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(`${JST_TIME.format(new Date())} JST`);
    const first = window.setTimeout(tick, 0), timer = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  return clock;
}

export function MainView({ data, initial, lang }: { data: MarketData; initial: MarketState; lang: Language }) {
  const [state, update] = useMarketState(initial);
  const clock = useJstClock();
  const t = messages[lang], { sign, source } = state, other = SOURCES.find((value) => value !== source)!;
  const sourceData = data.sources[source], today = todaySeries(sourceData);
  const range = sliceSeries(sourceData.series, state.range, data.currentDate);
  const rank = today.ranks[sign].at(-1) ?? null, stale = staleLabel(lang, data, source);
  const entry = sourceData.latest?.entries.find((fortune) => fortune.zodiacCode === sign) ?? null;
  const altName = lang === "en" ? signName("ja", sign) : signName("en", sign);
  const query = marketQuery(state);

  return (
    <div className={styles.page}>
      <TopBar lang={lang} current="main" returnPath={`/${query}`} />
      <Ticker lang={lang} today={today} />
      <main className={styles.wrap}>
        <header className={styles.top}>
          <div className={styles.brand}>
            <h1><span aria-hidden="true">☆ </span>{t.brandA}</h1>
            <small>
              <span aria-hidden="true">{flavor(lang, "brandA")}</span> · <span className={styles.num}>{clock}</span>
              {stale && <> · <span className={styles.stale}>{stale}</span></>}
            </small>
          </div>
          <Controls lang={lang} state={state} onChange={update} />
        </header>
        <div className={styles.agrid}>
          <section className={styles.card}>
            <SectionHeading lang={lang} k="watch" />
            <Watchlist lang={lang} state={state} today={today} range={range} onSelect={(value) => update({ sign: value })} />
          </section>
          <div className={styles.stack}>
            <section className={styles.card}>
              <SectionHeading lang={lang} k="chart" />
              <div className={styles.hero}>
                <Mochi sign={sign} rank={rank} size={92} />
                <div>
                  <h3 className={styles.heroName}>{SIGN_META[sign].glyph} {signName(lang, sign)} <small>{altName}</small></h3>
                  <div className={`${styles.bigrank} ${styles.num}`}>
                    {rank === null ? "−" : <RankText lang={lang} rank={rank} />}{" "}
                    <ChangePill change={dailyChange(today.ranks[sign])} suffix={t.vsYesterday} />
                  </div>
                </div>
                <p className={styles.bubble}>{moodLine(lang, moodLineIndex(rank))}</p>
              </div>
              <RankChart
                lang={lang} dates={range.dates} values={range.ranks[sign]}
                other={comparisonLine(data.sources[other].series, sign, range.dates)}
                color={lineColor(sign)} pastel={pastelColor(sign)} href={`/board${query}`}
              />
              <p className={styles.legend}>
                <span>━ {sourceName(lang, source)}</span>
                <span>··· {sourceName(lang, other)} ({t.sameSign})</span>
                <span>{t.starDay}</span>
                <span>{t.higher}</span>
              </p>
              <RangeStats lang={lang} values={range.ranks[sign]} />
            </section>
            <FortuneCard lang={lang} source={source} sign={sign} entry={entry} />
          </div>
        </div>
        <Movers lang={lang} today={today} onSelect={(value) => update({ sign: value })} />
      </main>
    </div>
  );
}
