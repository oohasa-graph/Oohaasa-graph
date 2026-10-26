import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageView } from "@/features/market/components/language-view";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("LanguageView", () => {
  beforeEach(() => {
    document.cookie = "rm-lang=; Path=/; Max-Age=0";
    router.replace.mockClear();
    router.refresh.mockClear();
  });
  afterEach(cleanup);

  it("remembers Korean and returns to the page it came from", async () => {
    const user = userEvent.setup();
    render(<LanguageView lang="ja" returnPath="/board?sign=leo" />);
    await user.click(screen.getByRole("button", { name: /한국어/ }));
    expect(document.cookie).toContain("rm-lang=ko");
    expect(router.replace).toHaveBeenCalledWith("/board?sign=leo");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("highlights the current language and offers all three with greetings", () => {
    render(<LanguageView lang="en" returnPath="/" />);
    expect(screen.getByRole("button", { name: /English/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /日本語/ })).not.toHaveAttribute("aria-current");
    for (const greeting of ["Hello!", "こんにちは！", "안녕하세요!"]) expect(screen.getByText(greeting)).toBeVisible();
    for (const title of ["Choose your language", "ことばをえらんでね", "언어를 골라 주세요"]) expect(screen.getByText(title)).toBeVisible();
  });

  it("links back to the sanitized return path", () => {
    render(<LanguageView lang="ko" returnPath="/?sign=leo&source=gogo&range=3m" />);
    expect(screen.getByRole("link", { name: "← 메인으로" })).toHaveAttribute("href", "/?sign=leo&source=gogo&range=3m");
  });
});
