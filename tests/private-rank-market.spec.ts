import { expect, test } from "@playwright/test";

test("owner signs in and switches source and zodiac", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password").fill("correct horse");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: /What rank am I today/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gogo" }).click();
  await expect(page.getByText("Viewing Gogo")).toBeVisible();
  await page.getByRole("button", { name: "Aquarius" }).click();
  await expect(page.getByRole("heading", { name: /Aquarius/ })).toBeVisible();
});

test("mobile layout keeps source toggle and rank hero visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password").fill("correct horse");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Ohaasa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gogo" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /What rank am I today/i }),
  ).toBeVisible();
});
