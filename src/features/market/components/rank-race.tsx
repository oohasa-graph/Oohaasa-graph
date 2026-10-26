import { useRef } from "react";
import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import {
  dateLabel, densityStroke, lastValueIndex, pickTicks, runPaths, scaleRank, valueRuns, xForIndex,
} from "@/features/market/chart-geometry";
import { Mochi } from "@/features/market/components/mochi";
import { RANK_TICKS } from "@/features/market/components/rank-chart";
import { formatRank, messages, type Language } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { lineColor, signName } from "@/features/market/signs";
import type { RankSeries } from "@/features/market/types";
import { useElementWidth } from "@/features/market/use-element-width";

const GRID = "#f0e2d6", LABEL = "#9a8479";

// All twelve signs as crossing lines; the selected sign is drawn last, thick, with its mochi at the line end.
export function RankRace({ lang, range, today, sign, onSelect }: {
  lang: Language; range: RankSeries; today: RankSeries; sign: ZodiacCode; onSelect: (sign: ZodiacCode) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 1000), narrow = width < 720, height = narrow ? 340 : 380;
  const padL = 36, padR = 54, padT = 18, padB = 24, n = range.dates.length, plotW = width - padL - padR;
  const x = (i: number) => xForIndex(i, n, padL, plotW), y = (v: number) => scaleRank(v, padT, height - padT - padB);
  // Thin dense lines, but keep isolated mornings visible as explicit markers at every density.
  const thick = densityStroke(plotW, n, 5, 2), thin = densityStroke(plotW, n, 2.4, 1);
  const order = [...ZODIAC_CODES.filter((code) => code !== sign), sign];
  return (
    <>
      <div ref={ref}>
        <svg className={styles.chart} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} fontSize="11" aria-hidden="true">
          {RANK_TICKS.map((rank) => (
            <g key={rank}>
              <line x1={padL} x2={width - padR} y1={y(rank)} y2={y(rank)} stroke={GRID} strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
              <text x={padL - 8} y={y(rank) + 4} textAnchor="end" fill={LABEL}>{formatRank(lang, rank)}</text>
            </g>
          ))}
          {pickTicks(n, narrow ? 4 : 7).map((i) => (
            <text key={i} x={x(i)} y={height - 4} textAnchor="middle" fill={LABEL}>{dateLabel(range.dates[i], range.dates)}</text>
          ))}
          {order.map((code) => {
            const selected = code === sign, values = range.ranks[code], runs = valueRuns(values);
            const dots = selected && n <= 31 ? runs.flat() : runs.filter((run) => run.length === 1).flat();
            return (
              <g key={code} data-series={code}>
                {runPaths(runs.filter((run) => run.length > 1), values, x, y).map((d) => (
                  <path
                    key={d} d={d} fill="none" stroke={lineColor(code)} strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={selected ? thick : thin} opacity={selected ? 1 : 0.35}
                  />
                ))}
                {dots.map((i) => (
                  <circle key={i} cx={x(i)} cy={y(values[i]!)} r={selected ? 4 : 3}
                    fill={selected ? "#fff" : lineColor(code)} stroke={selected ? lineColor(code) : "#fff"}
                    strokeWidth={selected ? 2.4 : 1} opacity={selected ? 1 : 0.8} />
                ))}
              </g>
            );
          })}
          {order.map((code) => {
            // The face sits on the sign's last drawn morning; a missing last morning never gets a rank.
            const last = lastValueIndex(range.ranks[code]), rank = range.ranks[code][last];
            if (last < 0 || rank == null) return null;
            const size = code === sign ? 34 : narrow ? 20 : 24;
            return (
              <g
                key={code} className={styles.face} data-face={code} transform={`translate(${x(last) + 6} ${y(rank) - size * 0.55})`}
                onClick={() => onSelect(code)}
              >
                <Mochi sign={code} rank={rank} size={size} />
              </g>
            );
          })}
        </svg>
      </div>
      <div className={styles.chips} role="group" aria-label={messages[lang].race}>
        {ZODIAC_CODES.map((code) => (
          <button key={code} type="button" aria-pressed={code === sign} onClick={() => onSelect(code)}>
            <Mochi sign={code} rank={today.ranks[code].at(-1) ?? null} size={22} />{signName(lang, code)}
          </button>
        ))}
      </div>
    </>
  );
}
