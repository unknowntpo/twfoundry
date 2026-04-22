import { expect, test } from "@playwright/test";

test("frontend loads MRT liveboard rows from backend endpoint", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("station-BL18").click();

  await expect(page.getByRole("heading", { name: "Taipei City Hall" })).toBeVisible();
  await expect(page.getByTestId("liveboard-list")).toContainText("Nangang Exhibition Center");
  await expect(page.getByTestId("liveboard-list")).toContainText("1");
  await expect(page.getByTestId("train-tdx-BL18-BL23")).toBeVisible();
});
