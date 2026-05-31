import { expect, test } from "@playwright/test";

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const SAMPLE_ENV = "DOTVAULT_E2E_SECRET=playwright-test-value\nAPI_KEY=abc123";

test.describe("quick share crypto flow", () => {
  test.skip(
    !hasRedis,
    "requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
  );

  test("encrypt, share, and decrypt round-trip", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/quick-share");

    // File upload triggers encrypt+upload; fill()+blur is unreliable in Playwright.
    await page.setInputFiles('input[type="file"]', {
      name: "dotvault-e2e.env",
      mimeType: "text/plain",
      buffer: Buffer.from(SAMPLE_ENV, "utf-8"),
    });

    const shareLink = page
      .locator("code")
      .filter({ hasText: /\/r\/tk_/ })
      .first();
    await expect(shareLink).toBeVisible({ timeout: 90_000 });
    const href = await shareLink.textContent();
    expect(href).toMatch(/\/r\/tk_[a-f0-9]{32}#/);

    await page.goto(href!.trim());

    await expect(
      page.getByText("Decrypted locally in your browser", { exact: false }),
    ).toBeVisible({ timeout: 60_000 });

    await expect(page.locator("pre")).toContainText(
      "DOTVAULT_E2E_SECRET=playwright-test-value",
    );
    await expect(page.locator("pre")).toContainText("API_KEY=abc123");
  });
});
