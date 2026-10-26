import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BoardView } from "@/features/market/components/board-view";
import { messages, rangeLabel, type Language } from "@/features/market/i18n";
import type { MarketState } from "@/features/market/market-params";
import { expectedMornings } from "@/features/market/series";
import { emptyMarketFixture, marketFixture } from "@/test/fixtures/market-fixture";

const initial: MarketState = { sign: "libra", source: "ohaasa", range: "1m" };

describe("BoardView", () => {
  beforeEach(() => window.history.replaceState(null, "", "/board"));
  afterEach(cleanup);

  it("shows the weekly awards with hanko labels", () => {
    render(<BoardView data={marketFixture} initial={initial} lang="ja" />);
    for (const label of ["今週のMVP", "がんばれ賞", "1位王", "安定株"]) expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByRole("heading", { name: "星座ランキング市場" })).toBeVisible();
    expect(screen.getByRole("heading", { name: /順位レース/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: /スタンプカレンダー/ })).toBeVisible();
  });

  it("selects a sign from the legend chips and keeps it in the URL", async () => {
    const user = userEvent.setup();
    render(<BoardView data={marketFixture} initial={initial} lang="ja" />);
    const legend = screen.getByRole("group", { name: "順位レース" });
    await user.click(within(legend).getByRole("button", { name: "しし座" }));
    expect(within(legend).getByRole("button", { name: "しし座" })).toHaveAttribute("aria-pressed", "true");
    expect(within(legend).getByRole("button", { name: "てんびん座" })).toHaveAttribute("aria-pressed", "false");
    expect(window.location.search).toContain("sign=leo");
    expect(screen.getByRole("link", { name: "← メインへ" })).toHaveAttribute("href", "/?sign=leo&source=ohaasa&range=1m");
  });

  it("draws one stamp per expected morning over three months, with empty stamps for gaps", () => {
    const { container } = render(<BoardView data={marketFixture} initial={initial} lang="ja" />);
    const stamps = container.querySelectorAll("[data-row='libra'] [data-stamp]");
    expect(stamps).toHaveLength(expectedMornings("ohaasa", "2026-07-28", "2026-10-26").length);
    const gap = container.querySelector("[data-row='libra'] [data-stamp='2026-10-14']")!;
    expect(gap).toHaveAttribute("data-empty");
    expect(gap.getAttribute("title")).toBe("てんびん座 · 2026-10-14 · −");
    const last = container.querySelector("[data-row='libra'] [data-stamp='2026-10-26']")!;
    expect(last).not.toHaveAttribute("data-empty");
    expect(last.getAttribute("title")).toMatch(/^てんびん座 · 2026-10-26 · \d+位$/);
  });

  it("keeps the stamp calendar at three months even when the range is one week", () => {
    const { container } = render(<BoardView data={marketFixture} initial={{ ...initial, source: "gogo", range: "1w" }} lang="en" />);
    expect(container.querySelectorAll("[data-row='libra'] [data-stamp]")).toHaveLength(91);
    expect(container.querySelector("[data-row='libra'] [data-stamp='2026-10-20']")).toHaveAttribute("data-empty");
  });

  it("makes the stamp scroll area a keyboard-focusable region with a localized name", () => {
    render(<BoardView data={marketFixture} initial={initial} lang="ja" />);
    expect(screen.getByRole("region", { name: "スタンプカレンダー" })).toHaveAttribute("tabindex", "0");
    cleanup();
    render(<BoardView data={marketFixture} initial={initial} lang="ko" />);
    expect(screen.getByRole("region", { name: "스탬프 캘린더" })).toHaveAttribute("tabindex", "0");
  });

  it.each<Language>(["ja", "en", "ko"])("labels the changing race period and fixed calendar period in %s", async (lang) => {
    const user = userEvent.setup(), t = messages[lang];
    render(<BoardView data={marketFixture} initial={initial} lang={lang} />);
    const raceHeading = () => screen.getByRole("heading", { name: (name) => name.startsWith(t.race) });
    const calendarHeading = () => screen.getByRole("heading", { name: (name) => name.startsWith(t.stampcal) });
    expect(raceHeading()).toHaveTextContent(rangeLabel(lang, "1m"));
    expect(calendarHeading()).toHaveTextContent(rangeLabel(lang, "3m"));
    await user.click(within(screen.getByRole("group", { name: t.range })).getByRole("button", { name: rangeLabel(lang, "1w") }));
    expect(raceHeading()).toHaveTextContent(rangeLabel(lang, "1w"));
    expect(calendarHeading()).toHaveTextContent(rangeLabel(lang, "3m"));
  });

  it("links back to the main page with the current state", () => {
    render(<BoardView data={marketFixture} initial={initial} lang="ja" />);
    expect(screen.getByRole("link", { name: "← メインへ" })).toHaveAttribute("href", "/?sign=libra&source=ohaasa&range=1m");
  });

  it("renders the empty market without NaN or empty paths and with muted awards", () => {
    const { container } = render(<BoardView data={emptyMarketFixture} initial={initial} lang="ja" />);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    for (const path of container.querySelectorAll("path")) expect(path.getAttribute("d")).toBeTruthy();
    expect(screen.getAllByText("まだデータがありません").length).toBeGreaterThanOrEqual(4);
  });
});
