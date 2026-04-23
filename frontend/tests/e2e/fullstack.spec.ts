import { expect, test } from "@playwright/test";

interface TdxLiveBoardResponse {
  source: "tdx";
  updatedAt: string;
  rows: Array<{
    id: string;
    stationId: string;
    destination: string;
    arrivalMinutes: number;
    status: string;
  }>;
}

const candidateStations = ["BL18", "BL15", "R10", "G10", "R05"] as const;

test("frontend loads MRT liveboard rows from backend endpoint", async ({ page, request }) => {
  let selectedStationId: string | undefined;
  let firstRow: TdxLiveBoardResponse["rows"][number] | undefined;

  for (const stationId of candidateStations) {
    const response = await request.get(
      `http://127.0.0.1:18080/api/mrt/liveboard?operator=TRTC&stationId=${stationId}`,
    );
    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as TdxLiveBoardResponse;
    if (payload.source === "tdx" && payload.rows.length > 0) {
      selectedStationId = stationId;
      firstRow = payload.rows[0];
      break;
    }
  }

  expect(selectedStationId, "No candidate MRT station returned live TDX rows during e2e run.").toBeTruthy();
  expect(firstRow, "Expected at least one live TDX row for the selected station.").toBeTruthy();

  await page.goto("/");
  await page.getByTestId(`station-${selectedStationId}`).click();

  await expect(page.getByTestId("timeline-live-toggle")).toBeVisible();
  await expect(page.getByTestId("timeline-intervals")).toContainText("5s");
  await expect(page.getByTestId("timeline-intervals")).toContainText("1m");
  await expect(page.getByTestId("liveboard-list")).not.toContainText("No arrivals in the current feed.");
  await expect(page.getByTestId("liveboard-list")).toContainText(firstRow!.destination);
  await expect(page.getByTestId("train-" + firstRow!.id)).toBeVisible();
});
