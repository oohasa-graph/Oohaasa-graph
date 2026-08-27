import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RankMarket } from "@/features/rank-market/rank-market";
import { dashboardFixture } from "@/test/fixtures/dashboard-data";

describe("RankMarket", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("switches the entire experience from Ohaasa to Gogo", async () => {
    const user = userEvent.setup();
    render(<RankMarket initialData={dashboardFixture} />);

    expect(screen.getByRole("heading", { name: /#9.*12/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gogo" }));
    expect(screen.getByRole("heading", { name: /#1.*12/i })).toBeInTheDocument();
    expect(screen.getByText("Viewing Gogo")).toBeInTheDocument();
    expect(screen.getByText("Libra · you")).toBeInTheDocument();
  });

  it("changes zodiac and persists the choice", async () => {
    const user = userEvent.setup();
    render(<RankMarket initialData={dashboardFixture} />);

    await user.click(screen.getByRole("button", { name: "Aquarius" }));

    expect(screen.getByRole("heading", { name: /Aquarius/ })).toBeInTheDocument();
    expect(localStorage.getItem("selected-zodiac")).toBe("aquarius");
  });
});
