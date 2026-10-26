import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MainView } from "@/features/market/components/main-view";
import type { MarketState } from "@/features/market/market-params";
import type { MarketData } from "@/features/market/types";
import { emptyMarketFixture, marketFixture } from "@/test/fixtures/market-fixture";

const initial: MarketState = { sign: "libra", source: "ohaasa", range: "1m" };

function withGogoDetails(data: MarketData): MarketData {
  const gogo = data.sources.gogo;
  return {
    ...data,
    sources: {
      ...data.sources,
      gogo: {
        ...gogo,
        latest: gogo.latest && {
          ...gogo.latest,
          entries: gogo.latest.entries.map((entry) => entry.zodiacCode === "libra"
            ? { ...entry, scores: { money: 3, love: 5, work: 1, health: null }, winnerCategories: ["love" as const] }
            : entry),
        },
      },
    },
  };
}

describe("MainView", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));
  afterEach(cleanup);

  it("shows the Japanese trading-terminal sections", () => {
    render(<MainView data={marketFixture} initial={initial} lang="ja" />);
    for (const name of ["うらない証券取引所", "今日の銘柄", "順位チャート", "急上昇 ↗", "急降下 ↘", "連続トップ3", "今日の運勢"]) {
      expect(screen.getByRole("heading", { name })).toBeVisible();
    }
    expect(screen.getByText("TODAY'S BOARD")).toBeInTheDocument();
  });

  it("selects a sign from the watchlist and mirrors it in the URL", async () => {
    const user = userEvent.setup();
    render(<MainView data={marketFixture} initial={initial} lang="ja" />);
    expect(screen.getByRole("heading", { level: 3, name: /てんびん座/ })).toBeInTheDocument();
    await user.click(within(screen.getByRole("table")).getByRole("button", { name: "しし座" }));
    expect(screen.getByRole("heading", { level: 3, name: /しし座/ })).toBeInTheDocument();
    expect(window.location.search).toContain("sign=leo");
    expect(within(screen.getByRole("table")).getByRole("button", { name: "しし座" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "タップで市場ボードへ ↗" })).toHaveAttribute("href", "/board?sign=leo&source=ohaasa&range=1m");
  });

  it("links the chart to the board with the current state, and the top bar to the language page", () => {
    render(<MainView data={marketFixture} initial={initial} lang="ja" />);
    expect(screen.getByRole("link", { name: "タップで市場ボードへ ↗" })).toHaveAttribute("href", "/board?sign=libra&source=ohaasa&range=1m");
    expect(screen.getByRole("link", { name: "あ/A 日本語 ▾" }))
      .toHaveAttribute("href", `/language?return=${encodeURIComponent("/?sign=libra&source=ohaasa&range=1m")}`);
  });

  it("switches source and range without losing the sign", async () => {
    const user = userEvent.setup();
    render(<MainView data={marketFixture} initial={{ ...initial, sign: "leo" }} lang="ja" />);
    await user.click(screen.getByRole("button", { name: "ゴーゴー" }));
    await user.click(screen.getByRole("button", { name: "3か月" }));
    expect(screen.getByRole("button", { name: "3か月" })).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).toBe("?sign=leo&source=gogo&range=3m");
    expect(screen.getByRole("link", { name: "タップで市場ボードへ ↗" })).toHaveAttribute("href", "/board?sign=leo&source=gogo&range=3m");
  });

  it("uses English copy and #-ranks", () => {
    const { container } = render(<MainView data={marketFixture} initial={initial} lang="en" />);
    expect(screen.getByRole("heading", { name: "Today's board" })).toBeVisible();
    expect(screen.getByText("今日の銘柄")).toBeInTheDocument();
    expect(container.querySelector("table [data-medal='1']")?.textContent).toBe("#1");
  });

  it("keeps fortune text untranslated and marked as Japanese", () => {
    render(<MainView data={withGogoDetails(marketFixture)} initial={{ ...initial, source: "gogo" }} lang="en" />);
    const fortune = screen.getByRole("heading", { name: "Today's fortune" }).closest("section")!;
    expect(within(fortune).getByText("Invented fortune for libra")).toHaveAttribute("lang", "ja");
    expect(within(fortune).getByText("blue")).toBeInTheDocument();
    expect(within(fortune).getByText("small notebook")).toBeInTheDocument();
    expect(within(fortune).getByLabelText("Money 3/5")).toBeInTheDocument();
    expect(within(fortune).getByLabelText("Health −")).toBeInTheDocument();
    expect(within(fortune).getByText("Love #1")).toBeInTheDocument();
  });

  it("shows coverage and breaks the chart line at missing mornings", () => {
    const { container } = render(<MainView data={marketFixture} initial={initial} lang="ja" />);
    // Ohaasa is missing 2026-10-14 and 2026-10-15 inside the one-month window.
    expect(screen.getByText(/^\d+\/\d+朝$/)).toBeInTheDocument();
    const selected = container.querySelectorAll("[data-series='selected'] path[data-line]");
    expect(selected.length).toBeGreaterThanOrEqual(2);
  });

  it("breaks the other show's dotted line only at that show's own missing mornings", () => {
    const otherPaths = (container: HTMLElement) => container.querySelectorAll("[data-series='other'] path").length;
    // Gogo chart: Ohaasa's weekends and the 10-12 holiday are not gaps; its missing 10-14 and 10-15 are.
    const gogo = render(<MainView data={marketFixture} initial={{ ...initial, source: "gogo" }} lang="ja" />);
    expect(otherPaths(gogo.container)).toBe(2);
    gogo.unmount();
    // Ohaasa chart: Gogo is missing 10-20.
    const ohaasa = render(<MainView data={marketFixture} initial={initial} lang="ja" />);
    expect(otherPaths(ohaasa.container)).toBe(2);
  });

  it("labels stale data with its JST date", () => {
    render(<MainView data={{ ...marketFixture, currentDate: "2026-10-27" }} initial={initial} lang="ja" />);
    expect(screen.getByText("2026-10-26（JST）のデータ")).toBeInTheDocument();
  });

  it("renders the empty market without NaN, Infinity, or empty paths", () => {
    const { container } = render(<MainView data={emptyMarketFixture} initial={initial} lang="ja" />);
    expect(screen.getAllByText("まだデータがありません").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    for (const path of container.querySelectorAll("path")) expect(path.getAttribute("d")).toBeTruthy();
  });

  it("renders a single stored edition as points, not as empty lines", () => {
    const one = { ...emptyMarketFixture, sources: { ...emptyMarketFixture.sources, ohaasa: marketFixture.sources.ohaasa } };
    const lone = {
      ...one.sources.ohaasa,
      series: { ...one.sources.ohaasa.series, ranks: Object.fromEntries(Object.entries(one.sources.ohaasa.series.ranks)
        .map(([code, ranks]) => [code, ranks.map((rank, i) => i === ranks.length - 1 ? rank : null)])) as MarketData["sources"]["ohaasa"]["series"]["ranks"] },
    };
    const { container } = render(<MainView data={{ ...one, sources: { ...one.sources, ohaasa: lone } }} initial={initial} lang="ja" />);
    expect(container.querySelector("[data-series='selected'] circle")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });
});
