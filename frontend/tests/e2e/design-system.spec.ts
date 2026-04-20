import { expect, test } from "@playwright/test";

test("design system page documents TWFoundry tokens and trade-offs", async ({ page }) => {
  await page.goto("/design-system");

  await expect(page.getByRole("heading", { name: /Calm, transit-aware/ })).toBeVisible();
  await expect(page.getByTestId("design-token-grid")).toContainText("--twf-color-canvas");
  await expect(page.getByRole("heading", { name: "Small Vue components first" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Traditional Chinese needs its own fallback plan" }),
  ).toBeVisible();
  await expect(page.getByText("--twf-font-family-cjk")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Product copy lives in locale messages" }),
  ).toBeVisible();
  await expect(page.getByTestId("common-component-inventory")).toContainText("Dialog");
  await expect(page.getByTestId("common-component-inventory")).toContainText("Implemented");
  await expect(page.getByTestId("overlay-patterns")).toContainText("Toast");
  await expect(page.getByTestId("overlay-patterns")).toContainText("Drawer / Sheet");
  await expect(page.getByTestId("breakpoint-rules")).toContainText("1024px+");
  await expect(page.getByTestId("library-tradeoffs")).toContainText("Ant Design Vue");
  await expect(page.getByTestId("library-tradeoffs")).toContainText("shadcn-vue");
});

test("dashboard links to the design system page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Design System" }).click();

  await expect(page).toHaveURL(/\/design-system$/);
  await expect(page.getByRole("heading", { name: /Calm, transit-aware/ })).toBeVisible();
});
