import { describe, expect, it } from "vitest";
import {
  dateLabel, densityStroke, lastValueIndex, linePaths, pickTicks, runPaths, scaleRank, valueRuns, xForIndex,
} from "@/features/market/chart-geometry";

const days = (start: string, count: number) =>
  Array.from({ length: count }, (_, i) => new Date(Date.parse(start) + i * 86_400_000).toISOString().slice(0, 10));

describe("chart geometry", () => {
  it("breaks lines at gaps and keeps isolated mornings as single points", () => {
    const paths = linePaths([1, 2, null, 3, null, null, 4, 5], (i) => i, (v) => v);
    expect(paths).toEqual(["M0,1L1,2", "M3,3", "M6,4L7,5"]);
    expect(linePaths([null, null], (i) => i, (v) => v)).toEqual([]);
    expect(linePaths([], (i) => i, (v) => v)).toEqual([]);
  });

  it("groups observed mornings into runs separated by gaps", () => {
    expect(valueRuns([1, 2, null, 3, null, null, 4, 5])).toEqual([[0, 1], [3], [6, 7]]);
    expect(valueRuns([null])).toEqual([]);
  });

  it("rounds coordinates to one decimal so paths stay compact", () => {
    expect(linePaths([1, 2], (i) => i / 3, (v) => v * 1.25)).toEqual(["M0,1.3L0.3,2.5"]);
  });

  it("picks evenly spread unique tick indices", () => {
    expect(pickTicks(60, 5)).toEqual([0, 15, 30, 44, 59]);
    expect(pickTicks(1, 5)).toEqual([0]);
    expect(pickTicks(3, 6)).toEqual([0, 1, 2]);
    expect(pickTicks(0, 5)).toEqual([]);
  });

  it("draws given runs as given, so a caller decides where a line may continue", () => {
    expect(runPaths([[0, 2], [4]], [1, null, 3, null, 5], (i) => i, (v) => v)).toEqual(["M0,1L2,3", "M4,5"]);
    expect(runPaths([], [], (i) => i, (v) => v)).toEqual([]);
  });

  it("finds the last observed morning, ignoring a missing last morning", () => {
    expect(lastValueIndex([3, 5, null])).toBe(1);
    expect(lastValueIndex([null, null])).toBe(-1);
    expect(lastValueIndex([])).toBe(-1);
  });

  it("keeps day labels on short ranges across New Year and uses year/month only for long spans", () => {
    const week = days("2026-12-28", 7), month = days("2026-12-10", 30), quarter = days("2026-11-01", 91);
    expect(pickTicks(week.length, 6).map((i) => dateLabel(week[i], week))).toEqual(["12/28", "12/29", "12/30", "1/1", "1/2", "1/3"]);
    expect(dateLabel(month[0], month)).toBe("12/10");
    expect(dateLabel(quarter.at(-1)!, quarter)).toBe("1/30");
    const years = days("2025-06-01", 513);
    expect(dateLabel(years[0], years)).toBe("2025/6");
    expect(dateLabel(years.at(-1)!, years)).toBe("2026/10");
    const sameYear = days("2026-01-05", 300);
    expect(dateLabel(sameYear[0], sameYear)).toBe("1/5");
    expect(dateLabel("2026-10-26", [])).toBe("10/26");
  });

  it("thins lines as mornings get denser, within bounds", () => {
    expect(densityStroke(910, 30, 5, 2)).toBe(5);
    expect(densityStroke(232, 91, 5, 2)).toBe(2);
    expect(densityStroke(910, 121, 5, 2)).toBe(3.8);
    expect(densityStroke(910, 2000, 2.4, 1)).toBe(1);
    expect(densityStroke(300, 1, 5, 2)).toBe(5);
    expect(densityStroke(300, 0, 5, 2)).toBe(5);
  });

  it("puts rank 1 at the top and centers a single morning", () => {
    expect(scaleRank(1, 10, 110)).toBe(10);
    expect(scaleRank(12, 10, 110)).toBe(120);
    expect(xForIndex(0, 1, 30, 100)).toBe(80);
    expect(xForIndex(2, 3, 30, 100)).toBe(130);
    expect(Number.isFinite(xForIndex(0, 0, 30, 100))).toBe(true);
  });
});
