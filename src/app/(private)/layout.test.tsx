import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { describe, expect, it, vi } from "vitest";

import PrivateLayout from "@/app/(private)/layout";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("PrivateLayout", () => {
  it("redirects unauthenticated requests to login", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT:/login");
    });

    await expect(
      PrivateLayout({ children: <p>Private content</p> }),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders authenticated children", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "owner" },
      expires: "2099-01-01T00:00:00.000Z",
    });

    render(await PrivateLayout({ children: <p>Private content</p> }));

    expect(screen.getByText("Private content")).toBeInTheDocument();
  });
});
