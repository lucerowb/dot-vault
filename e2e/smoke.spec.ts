import { expect, test } from "@playwright/test";

test("marketing home loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Share secrets like.*\.env.*files/i,
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Try quick share" })).toBeVisible();
});

test("quick share page loads", async ({ page }) => {
  await page.goto("/quick-share");
  await expect(page.getByRole("heading", { name: "Quick share" })).toBeVisible();
  await expect(page.getByText("Drop a .env file here")).toBeVisible();
});
