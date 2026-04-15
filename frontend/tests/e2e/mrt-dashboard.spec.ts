import { expect, test } from "@playwright/test";

test("dashboard loads with mock MRT map", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "MRT LiveBoard Monitor" })).toBeVisible();
  await expect(page.getByTestId("mock-map")).toBeVisible();
  await expect(page.getByTestId("station-BL18")).toBeVisible();
});

test("station selection opens the LiveBoard panel", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("station-BL18").click();

  await expect(page.getByRole("heading", { name: "Taipei City Hall" })).toBeVisible();
  await expect(page.getByTestId("liveboard-list")).toContainText("Dingpu");
});

test("layer toggle updates visible stations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("station-R02")).toBeVisible();
  await page.getByRole("button", { name: "Red Line" }).click();

  await expect(page.getByTestId("station-R02")).toBeHidden();
  await page.getByRole("button", { name: "Red Line" }).click();
  await expect(page.getByTestId("station-R02")).toBeVisible();
});
