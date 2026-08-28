"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RankHistoryPoint } from "@/features/rank-market/types";
import styles from "@/features/rank-market/rank-market.module.css";

const RANGES = [7, 30, 90] as const;

export function RankTrend({
  points,
  range,
  onRangeChange,
}: {
  points: RankHistoryPoint[];
  range: (typeof RANGES)[number];
  onRangeChange: (range: (typeof RANGES)[number]) => void;
}) {
  const visiblePoints = points.slice(-range);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <p className={styles.kicker}>Rank history</p>
        <h2>Trend tape</h2>
      </div>
      <div className={styles.rangeControls} aria-label="Trend range">
        {RANGES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={range === value}
            onClick={() => onRangeChange(value)}
          >
            {value} days
          </button>
        ))}
      </div>
      <div
        className={styles.chartFrame}
        aria-label="Rank history"
        data-connect-nulls="false"
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={visiblePoints} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis
              reversed
              domain={[1, 12]}
              ticks={[1, 3, 6, 9, 12]}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [value ? `#${value}` : "No edition", "Rank"]}
              labelFormatter={(label) => `Date ${label}`}
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 12,
                color: "#e2e8f0",
              }}
            />
            <Line
              type="monotone"
              dataKey="rank"
              stroke="#67e8f9"
              strokeWidth={3}
              dot={{ fill: "#67e8f9", r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
