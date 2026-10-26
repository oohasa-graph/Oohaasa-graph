import { expect, test, type Page } from "@playwright/test";

// Runs against DATA_FIXTURE_MODE=1 (invented fixture text). Every test fails on uncaught page errors
// and on console errors such as hydration mismatches.
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

const watchlistButton = (page: Page, name: string) => page.getByRole("table").getByRole("button", { name, exact: true });

test("first visit opens the Japanese main page", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "今日の銘柄" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("heading", { level: 3, name: /てんびん座/ })).toBeVisible();
  await expect(page.getByText(/^\d+\/\d+朝$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("chart opens the board and back returns", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await page.getByRole("link", { name: "タップで市場ボードへ ↗" }).click();
  await expect(page).toHaveURL("/board?sign=libra&source=ohaasa&range=1m");
  await expect(page.getByRole("heading", { name: /順位レース/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "今日の銘柄" })).toBeVisible();
  await page.getByRole("link", { name: "タップで市場ボードへ ↗" }).click();
  await page.getByRole("link", { name: "← メインへ" }).click();
  await expect(page).toHaveURL("/?sign=libra&source=ohaasa&range=1m");
  await expect(page.getByRole("heading", { name: "今日の銘柄" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("selection carries into the board and survives browser back", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await watchlistButton(page, "しし座").click();
  await page.getByRole("button", { name: "3か月" }).click();
  await expect(page.getByRole("heading", { level: 3, name: /しし座/ })).toBeVisible();
  await page.getByRole("link", { name: "タップで市場ボードへ ↗" }).click();
  await expect(page).toHaveURL(/\/board\?/);
  expect(page.url()).toContain("sign=leo");
  expect(page.url()).toContain("range=3m");
  const legend = page.getByRole("group", { name: "順位レース" });
  await expect(legend.getByRole("button", { name: "しし座" })).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(page).toHaveURL("/?sign=leo&source=ohaasa&range=3m");
  await expect(page.getByRole("heading", { level: 3, name: /しし座/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "3か月" })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("language page switches to Korean and remembers it", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/?sign=leo&source=gogo&range=1w");
  await page.getByRole("link", { name: "あ/A 日本語 ▾" }).click();
  await expect(page).toHaveURL(/\/language\?return=/);
  await page.getByRole("button", { name: /한국어/ }).click();
  await expect(page).toHaveURL("/?sign=leo&source=gogo&range=1w");
  await expect(page.getByRole("heading", { name: "오늘의 종목" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  // Fortune text is never translated.
  await expect(page.getByText("Invented fortune for leo")).toHaveAttribute("lang", "ja");
  await page.reload();
  await expect(page.getByRole("heading", { name: "오늘의 종목" })).toBeVisible();
  await page.getByRole("link", { name: "탭해서 시장 보드로 ↗" }).click();
  await expect(page.getByRole("heading", { name: /순위 레이스/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("unknown or repeated URL params fall back to safe defaults", async ({ page }) => {
  const errors = watchErrors(page);
  const response = await page.goto("/?sign=foo&range=10y&source=x");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 3, name: /てんびん座/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "1か月" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/board?sign=leo&sign=aries&source=gogo&source=ohaasa");
  await expect(page.getByRole("group", { name: "順位レース" }).getByRole("button", { name: "しし座" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "ゴーゴー" })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

// Decoded `return` values that URL parsing would otherwise turn into another origin.
for (const target of ["//evil.example", "https://evil.example", "/\t/evil.example", "/\n/evil.example", "/.//evil.example", "/%2e//evil.example", "/\\evil.example", "/a/..//evil.example"]) {
  test(`language return stays on this site for ${JSON.stringify(target)}`, async ({ page, baseURL }) => {
    const errors = watchErrors(page);
    await page.goto(`/language?return=${encodeURIComponent(target)}`);
    await expect(page.getByRole("link", { name: "← メインへ" })).toHaveAttribute("href", "/");
    await page.getByRole("button", { name: /English/ }).click();
    await expect(page.getByRole("heading", { name: "Today's board" })).toBeVisible();
    const url = new URL(page.url());
    expect(url.origin).toBe(new URL(baseURL!).origin);
    expect(url.pathname).toBe("/");
    expect(errors).toEqual([]);
  });
}

test("no horizontal page scroll on phones", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "phone layout check");
  const errors = watchErrors(page);
  const width = page.viewportSize()!.width;
  for (const path of ["/", "/board", "/language", "/?range=all&source=gogo", "/board?range=all&source=gogo"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
  }
  for (const lang of ["en", "ko"]) {
    await page.context().addCookies([{ name: "rm-lang", value: lang, url: page.url() }]);
    for (const path of ["/", "/board"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${lang} ${path}`).toBeLessThanOrEqual(width);
    }
  }
  await page.context().clearCookies();
  await page.goto("/board");
  const scroller = page.getByTestId("stamp-scroller");
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const { scrollLeft, scrollWidth, clientWidth } = await scroller.evaluate((element) => ({
    scrollLeft: element.scrollLeft, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
  }));
  expect(scrollLeft + clientWidth).toBeGreaterThanOrEqual(scrollWidth - 1);
  // The sign column stays pinned while the newest stamps are in view.
  const scrollerBox = (await scroller.boundingBox())!;
  const labelBox = (await scroller.getByRole("button", { name: "てんびん座" }).boundingBox())!;
  expect(labelBox.x).toBeGreaterThanOrEqual(scrollerBox.x - 1);
  expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(scrollerBox.x + scrollerBox.width);
  expect(errors).toEqual([]);
});
