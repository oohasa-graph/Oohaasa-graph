const round = (value: number) => Math.round(value * 10) / 10;

export function scaleRank(rank: number, top: number, height: number): number {
  return top + ((rank - 1) / 11) * height;
}

export function xForIndex(index: number, count: number, left: number, width: number): number {
  return count <= 1 ? left + width / 2 : left + (index * width) / (count - 1);
}

// Index runs of observed mornings; a missing morning ends a run instead of being bridged.
export function valueRuns(values: (number | null)[]): number[][] {
  const runs: number[][] = [];
  values.forEach((value, i) => {
    if (value === null) return;
    if (i > 0 && values[i - 1] !== null) runs.at(-1)!.push(i);
    else runs.push([i]);
  });
  return runs;
}

// One "M…L…" path per run; an isolated morning gives a lone "M x,y" (callers draw it as a dot).
export function runPaths(
  runs: number[][], values: (number | null)[], x: (i: number) => number, y: (v: number) => number,
): string[] {
  return runs.map((run) => run.map((i, k) => `${k ? "L" : "M"}${round(x(i))},${round(y(values[i]!))}`).join(""));
}

export function linePaths(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string[] {
  return runPaths(valueRuns(values), values, x, y);
}

export function lastValueIndex(values: (number | null)[]): number {
  return values.findLastIndex((value) => value !== null);
}

export function pickTicks(count: number, ticks: number): number[] {
  if (count <= 0) return [];
  if (count === 1 || ticks <= 1) return [0];
  return [...new Set(Array.from({ length: ticks }, (_, k) => Math.round((k * (count - 1)) / (ticks - 1))))];
}

// Day labels unless the axis spans more than about four months; a short range across New Year keeps its days.
export function dateLabel(date: string, dates: string[]): string {
  const [year, month, day] = date.split("-");
  const span = dates.length ? (Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / 86_400_000 : 0;
  return span <= 120 || dates[0].slice(0, 4) === dates.at(-1)!.slice(0, 4) ? `${+month}/${+day}` : `${year}/${+month}`;
}

// Line width from the pixels between neighbouring mornings, so dense ranges stay readable; every point is still drawn.
export function densityStroke(plotWidth: number, count: number, max: number, min: number): number {
  const spacing = count > 1 ? plotWidth / (count - 1) : plotWidth;
  return round(Math.min(max, Math.max(min, spacing / 2)));
}
