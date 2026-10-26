"use client";

import Link from "next/link";
import { useRef } from "react";
import { dateLabel, linePaths, pickTicks, runPaths, scaleRank, valueRuns, xForIndex } from "@/features/market/chart-geometry";
import { formatRank, messages, type Language } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { useElementWidth } from "@/features/market/use-element-width";

const INK = "#4b3a34", GRID = "#f0e2d6", LABEL = "#9a8479";
export const RANK_TICKS = [1, 3, 6, 9, 12];

// Selected sign on the selected show, plus the same sign on the other show as a faint dotted line.
export function RankChart({ lang, dates, values, other, color, pastel, href }: {
  lang: Language; dates: string[]; values: (number | null)[]; other: { values: (number | null)[]; runs: number[][] };
  color: string; pastel: string; href: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 760), height = width >= 720 ? 280 : 220;
  const padL = 42, padR = 14, padT = 24, padB = 24, plotH = height - padT - padB, n = dates.length;
  const x = (i: number) => xForIndex(i, n, padL, width - padL - padR), y = (v: number) => scaleRank(v, padT, plotH);
  const dots = n <= 31 ? values.flatMap((v, i) => (v === null ? [] : [i]))
    : valueRuns(values).filter((run) => run.length === 1).map(([i]) => i);
  const hint = messages[lang].hint, empty = values.every((v) => v === null) && other.runs.length === 0;
  return (
    <Link className={styles.chartlink} href={href} aria-label={hint}>
      <div ref={ref}>
        <svg className={styles.chart} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} fontSize="11" aria-hidden="true">
          {RANK_TICKS.map((rank) => (
            <g key={rank}>
              <line x1={padL} x2={width - padR} y1={y(rank)} y2={y(rank)} stroke={GRID} strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
              <text x={padL - 8} y={y(rank) + 4} textAnchor="end" fill={LABEL}>{formatRank(lang, rank)}</text>
            </g>
          ))}
          {pickTicks(n, 6).map((i) => (
            <text key={i} x={x(i)} y={height - 4} textAnchor="middle" fill={LABEL}>{dateLabel(dates[i], dates)}</text>
          ))}
          {/* "h0" keeps a lone morning visible as a round dot on the dotted line. */}
          <g data-series="other">
            {runPaths(other.runs, other.values, x, y).map((d) => (
              <path key={d} d={`${d}h0`} fill="none" stroke="#d8c6ba" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </g>
          <g data-series="selected">
            {valueRuns(values).filter((run) => run.length > 1).map((run) => (
              <path key={run[0]} fill={pastel} opacity=".45"
                d={`M${x(run[0])},${padT + plotH}${run.map((i) => `L${x(i)},${y(values[i]!)}`).join("")}L${x(run.at(-1)!)},${padT + plotH}Z`} />
            ))}
            {linePaths(values, x, y).filter((d) => d.includes("L")).map((d) => (
              <path key={d} data-line="" d={d} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {dots.map((i) => <circle key={i} cx={x(i)} cy={y(values[i]!)} r="4" fill="#fff" stroke={color} strokeWidth="2.4" />)}
            {values.flatMap((v, i) => (v === 1 ? [
              <text key={i} x={x(i)} y={y(1) - 10} textAnchor="middle" fontSize="18" fill="#ffc21a" stroke={INK} strokeWidth="1">★</text>,
            ] : []))}
          </g>
          {empty && (
            <text x={width / 2} y={padT + plotH / 2} textAnchor="middle" fontSize="14" fill={LABEL}>{messages[lang].noData}</text>
          )}
        </svg>
      </div>
      <span className={styles.hint} aria-hidden="true">{hint}</span>
    </Link>
  );
}
