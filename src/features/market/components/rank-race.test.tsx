import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { xForIndex } from "@/features/market/chart-geometry";
import { RankRace } from "@/features/market/components/rank-race";
import { sliceSeries } from "@/features/market/metrics";
import { buildSeries } from "@/features/market/series";
import type { RankSeries } from "@/features/market/types";
import { marketFixture } from "@/test/fixtures/market-fixture";

// jsdom has no ResizeObserver; this one reports a fixed container width as soon as it observes.
function stubWidth(width: number) {
  vi.stubGlobal("ResizeObserver", class {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe() { this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    disconnect() {}
  });
}

const race = (range: RankSeries, sign: "libra" | "leo" = "libra") =>
  render(<RankRace lang="ja" range={range} today={range} sign={sign} onSelect={() => {}} />).container;
const dateTicks = (container: HTMLElement) => [...container.querySelectorAll("svg text")]
  .map((node) => node.textContent ?? "").filter((text) => /^\d+\/\d+$/.test(text));
const lineWidths = (container: HTMLElement, code: string) => [...container.querySelectorAll(`[data-series='${code}'] path`)]
  .map((path) => [path.getAttribute("d")!.includes("L"), path.getAttribute("stroke-width")]);

describe("RankRace", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("puts each face on the sign's last drawn morning and never invents a rank for a missing last morning", () => {
    // 10-26 is missing for everyone; taurus has no morning at all.
    const range = buildSeries("gogo", "2026-10-24", "2026-10-26", [
      { date: "2026-10-24", zodiacCode: "leo", rank: 2 }, { date: "2026-10-25", zodiacCode: "leo", rank: 5 },
      { date: "2026-10-24", zodiacCode: "aries", rank: 1 },
    ]);
    const container = race(range, "leo");
    const face = (code: string) => container.querySelector(`[data-face='${code}']`);
    // Fallback width 1000: plot from x=36, 1000 - 36 - 54 wide.
    expect(face("leo")!.getAttribute("transform")).toMatch(new RegExp(`^translate\\(${xForIndex(1, 3, 36, 910) + 6} `));
    expect(face("leo")!.querySelector("svg")).toHaveAttribute("data-mood", "calm");
    expect(face("aries")!.getAttribute("transform")).toMatch(new RegExp(`^translate\\(${xForIndex(0, 3, 36, 910) + 6} `));
    expect(face("aries")!.querySelector("svg")).toHaveAttribute("data-mood", "star");
    expect(face("taurus")).toBeNull();
  });

  it("uses fewer date ticks and thinner lines when the chart is narrow and dense", () => {
    const all = sliceSeries(marketFixture.sources.gogo.series, "all", marketFixture.currentDate);
    const wide = race(all);
    expect(dateTicks(wide)).toHaveLength(7);
    expect(lineWidths(wide, "libra")).toContainEqual([true, "3.8"]);
    cleanup();

    stubWidth(360);
    const narrow = race(all);
    expect(dateTicks(narrow)).toHaveLength(4);
    // 121 mornings across 270 px: the selected line hits its 2 px floor and the others thin to 1.1 px.
    expect(new Set(lineWidths(narrow, "libra").map(([, width]) => width))).toEqual(new Set(["2"]));
    expect(new Set(lineWidths(narrow, "leo").map(([, width]) => width))).toEqual(new Set(["1.1"]));
    // Gogo's missing 10-20 still splits every line; nothing is bridged.
    expect(lineWidths(narrow, "libra")).toHaveLength(2);
  });

  it("keeps a lone morning at full width so dense ranges never hide it", () => {
    stubWidth(360);
    const range = buildSeries("gogo", "2026-06-28", "2026-10-26", [{ date: "2026-10-01", zodiacCode: "leo", rank: 3 }]);
    const container = race(range, "leo");
    expect(lineWidths(container, "leo")).toEqual([[false, "5"]]);
    expect(container.querySelector("[data-face='leo']")).not.toBeNull();
  });

  it("keeps full-width lines on a short range", () => {
    const week = sliceSeries(marketFixture.sources.gogo.series, "1w", marketFixture.currentDate);
    expect(new Set(lineWidths(race(week), "libra").map(([, width]) => width))).toEqual(new Set(["5"]));
  });
});
