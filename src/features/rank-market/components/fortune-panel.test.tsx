import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FortunePanel } from "@/features/rank-market/components/fortune-panel";
import { gogoFortune, ohaasaFortune } from "@/test/fixtures/dashboard-data";

describe("FortunePanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows source-specific lucky fields", () => {
    const { rerender } = render(
      <FortunePanel source="ohaasa" fortune={ohaasaFortune} />,
    );

    expect(screen.getByText("Lucky hint")).toBeInTheDocument();
    expect(screen.queryByText("Lucky color")).not.toBeInTheDocument();

    rerender(<FortunePanel source="gogo" fortune={gogoFortune} />);

    expect(screen.getByText("Lucky color")).toBeInTheDocument();
    expect(screen.getByText("Lucky key")).toBeInTheDocument();
  });

  it("renders a clear empty state without fake details", () => {
    render(<FortunePanel source="gogo" fortune={null} />);

    expect(screen.getByText("No complete fortune yet")).toBeInTheDocument();
    expect(screen.queryByText("Lucky color")).not.toBeInTheDocument();
  });
});
