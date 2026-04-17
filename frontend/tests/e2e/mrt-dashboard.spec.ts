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

test("sidebars collapse without clearing dashboard state", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("station-BL18").click();
  await expect(page.getByRole("heading", { name: "Taipei City Hall" })).toBeVisible();

  await page.getByRole("button", { name: "Red Line" }).click();
  await expect(page.getByTestId("station-R02")).toBeHidden();

  await page.getByTestId("collapse-layers-sidebar").click();
  await expect(page.getByTestId("expand-layers-sidebar")).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Map layers")).toBeHidden();
  await expect(page.getByRole("button", { name: "Red Line" })).toBeHidden();

  await page.getByTestId("collapse-station-panel").click();
  await expect(page.getByTestId("expand-station-panel")).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { name: "Taipei City Hall" })).toBeHidden();

  await page.getByTestId("expand-layers-sidebar").click();
  await expect(page.getByRole("button", { name: "Red Line" })).toBeVisible();
  await expect(page.getByTestId("station-R02")).toBeHidden();

  await page.getByTestId("expand-station-panel").click();
  await expect(page.getByRole("heading", { name: "Taipei City Hall" })).toBeVisible();
  await expect(page.getByTestId("liveboard-list")).toContainText("Dingpu");
});

test("mobile controls reveal hidden dashboard panels", async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 1112 });
  await page.goto("/");

  const mobilePanels = page.getByRole("navigation", { name: "Compact dashboard panels" });
  await expect(mobilePanels).toBeVisible();
  await expect(page.getByLabel("Map layers")).toBeHidden();
  await expect(page.getByLabel("Playback timeline")).toBeHidden();

  await mobilePanels.getByRole("button", { name: "Layers" }).click();
  await expect(page.getByLabel("Map layers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Red Line" })).toBeVisible();

  await mobilePanels.getByRole("button", { name: "Time" }).click();
  await expect(page.getByLabel("Playback timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: "Now" })).toBeVisible();

  await mobilePanels.getByRole("button", { name: "Detail" }).click();
  await expect(page.getByLabel("Station LiveBoard")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Select a station" })).toBeVisible();

  await expect(mobilePanels.getByRole("button", { name: "Detail" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("tablet layout keeps side panels behind compact controls", async ({ page }) => {
  await page.setViewportSize({ width: 722, height: 1080 });
  await page.goto("/");

  const compactPanels = page.getByRole("navigation", { name: "Compact dashboard panels" });
  await expect(compactPanels).toBeVisible();
  await expect(page.getByLabel("Map layers")).toBeHidden();
  await expect(page.getByLabel("Station LiveBoard")).toBeHidden();

  const mapRegion = page.getByLabel("MRT map dashboard");
  await expect(mapRegion).toBeVisible();
  await expect(mapRegion).toHaveJSProperty("clientWidth", 722);

  await compactPanels.getByRole("button", { name: "Detail" }).click();
  await expect(page.getByLabel("Station LiveBoard")).toBeVisible();
});

test("locale switcher changes dashboard copy and persists preference", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Language").selectOption("zh-TW");

  await expect(page.getByRole("heading", { name: "MRT 即時看板" })).toBeVisible();
  await expect(page.getByRole("link", { name: "設計系統" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "MRT 即時看板" })).toBeVisible();
  await expect(page.getByLabel("語言")).toHaveValue("zh-TW");
});
