import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RankMarket } from "@/features/rank-market/rank-market";
import type { RankMarketData } from "@/features/rank-market/types";
import { dashboardFixture, historyWithWeekendGap } from "@/test/fixtures/dashboard-data";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, value),
  };
}

describe("RankMarket", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("switches the entire experience from Ohaasa to Gogo", async () => {
    const user = userEvent.setup();
    render(<RankMarket initialData={dashboardFixture} currentDate="2026-08-26" />);

    expect(screen.getByRole("heading", { name: /#9.*12/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gogo" }));
    expect(screen.getByRole("heading", { name: /#1.*12/i })).toBeInTheDocument();
    expect(screen.getByText("Viewing Gogo")).toBeInTheDocument();
    expect(screen.getByText("Libra · you")).toBeInTheDocument();
  });

  it("changes zodiac and persists the choice", async () => {
    const user = userEvent.setup();
    render(<RankMarket initialData={dashboardFixture} currentDate="2026-08-26" />);

    await user.click(screen.getByRole("button", { name: "Aquarius" }));

    expect(screen.getByRole("heading", { name: /Aquarius/ })).toBeInTheDocument();
    expect(localStorage.getItem("selected-zodiac")).toBe("aquarius");
  });

  it("renders source-specific history, movement, and freshness state", () => {
    const data: RankMarketData = structuredClone(dashboardFixture);
    data.sources.ohaasa.history.libra = historyWithWeekendGap;
    data.sources.ohaasa.movements.libra = { places: 5, direction: "up" };

    render(<RankMarket initialData={data} currentDate="2026-08-27" />);

    expect(screen.getByText("Up 5 places")).toBeInTheDocument();
    expect(screen.getByText("Top-three streak")).toBeInTheDocument();
    expect(screen.getByText("Edition 2026-08-26")).toBeInTheDocument();
    expect(screen.getByText("Stale source date")).toBeInTheDocument();
    expect(screen.getByLabelText("Rank history")).toHaveAttribute(
      "data-connect-nulls",
      "false",
    );
  });
});
