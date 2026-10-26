import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Mochi } from "@/features/market/components/mochi";

describe("Mochi", () => {
  afterEach(cleanup);

  it("changes face with the rank bucket", () => {
    for (const [rank, mood] of [[1, "star"], [2, "happy"], [9, "calm"], [12, "sad"], [null, "calm"]] as const) {
      const { container } = render(<Mochi sign="aries" rank={rank} size={40} />);
      expect(container.querySelector("svg")).toHaveAttribute("data-mood", mood);
      cleanup();
    }
  });

  it("draws the crown only for a #1 morning and a sweat drop only when sad", () => {
    const star = render(<Mochi sign="leo" rank={1} size={40} />).container;
    expect(star.querySelector("[data-part='crown']")).not.toBeNull();
    expect(star.querySelector("[data-part='sweat']")).toBeNull();
    cleanup();
    const sad = render(<Mochi sign="leo" rank={11} size={40} />).container;
    expect(sad.querySelector("[data-part='sweat']")).not.toBeNull();
    expect(sad.querySelector("[data-part='crown']")).toBeNull();
  });

  it("uses the sign's pastel body, keeps the prototype geometry, and scales by size", () => {
    const svg = render(<Mochi sign="libra" rank={5} size={60} />).container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox", "0 0 60 56");
    expect(svg).toHaveAttribute("width", "60");
    expect(svg).toHaveAttribute("height", "56");
    expect(svg.querySelector("[data-part='body']")).toHaveAttribute("fill", "hsl(180 92% 87%)");
    expect(svg.textContent).toContain("♎︎");
  });

  it("is decorative unless labelled", () => {
    const hidden = render(<Mochi sign="aries" rank={3} size={30} />).container.querySelector("svg")!;
    expect(hidden).toHaveAttribute("aria-hidden", "true");
    cleanup();
    render(<Mochi sign="aries" rank={3} size={30} label="おひつじ座" />);
    expect(screen.getByRole("img", { name: "おひつじ座" })).toBeInTheDocument();
  });
});
