import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RankTrend } from "@/features/rank-market/components/rank-trend";
import { historyWithWeekendGap } from "@/test/fixtures/dashboard-data";

describe("RankTrend", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps null dates disconnected and exposes range controls", () => {
    render(
      <RankTrend points={historyWithWeekendGap} range={30} onRangeChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Rank history")).toHaveAttribute(
      "data-connect-nulls",
      "false",
    );
  });

  it("changes the selected trend range", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(
      <RankTrend points={historyWithWeekendGap} range={90} onRangeChange={onRangeChange} />,
    );

    await user.click(screen.getByRole("button", { name: "7 days" }));

    expect(onRangeChange).toHaveBeenCalledWith(7);
  });
});
