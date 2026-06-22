import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const targetUrl = process.env.BUS_OVERSIGHT_URL ?? 'http://127.0.0.1:5174/bus-oversight';
const forbiddenVisibleText = /StopOfRoute|RouteUID|endpoint|evidence fallback|p95|schema|POC|ETA|direction 0|direction 1|方向 0|方向 1|debug|fixture|prototype|API/;
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const launchOptions = {
  headless: true,
};

if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
} else if (existsSync(chromePath)) {
  launchOptions.executablePath = chromePath;
}

let browser;
try {
  browser = await chromium.launch(launchOptions);
} catch (error) {
  throw new Error(
    `Unable to launch Chromium for bus oversight verification. Install Playwright browsers or set PLAYWRIGHT_CHROMIUM_EXECUTABLE. ${error.message}`,
  );
}

const page = await browser.newPage({
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 1,
});

const badResponses = [];
const pageErrors = [];
page.on('response', (response) => {
  if (response.status() >= 400) {
    badResponses.push({ url: response.url(), status: response.status() });
  }
});
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
});

try {
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.getByText('中').click();
  await page.waitForTimeout(250);

  const initialText = await page.locator('body').innerText();
  assert.equal(badResponses.length, 0, `Unexpected failed responses: ${JSON.stringify(badResponses, null, 2)}`);
  assert.equal(pageErrors.length, 0, `Unexpected page errors: ${JSON.stringify(pageErrors, null, 2)}`);
  assert.match(initialText, /公車路線服務控制台/);
  assert.match(initialText, /服務健康時間軸/);
  assert.match(initialText, /服務日期 2026-05-20/);
  assert.equal(forbiddenVisibleText.test(initialText), false, 'Forbidden implementation wording is visible in zh UI');

  const kpiDeltas = initialText.match(/較昨日/g) ?? [];
  assert.equal(kpiDeltas.length, 5, 'All five KPI cards must show a persistent vs-yesterday delta');

  assert.equal(await page.locator('.kpi-i').count(), 5, 'Each KPI card should expose an info popover trigger');
  await page.locator('.kpi-i').first().focus();
  await page.waitForFunction(() => {
    const node = document.querySelector('.kpi-pop');
    return node && Number(getComputedStyle(node).opacity) > 0.9;
  });

  const stopsBeforeRouteSwitch = await page.locator('.stop-dot').count();
  await page.getByText('路線 南京幹線').click();
  await page.waitForTimeout(700);
  const stopsAfterRouteSwitch = await page.locator('.stop-dot').count();
  const routeTitle = await page.locator('.route-panel h2').innerText();
  assert.match(routeTitle, /南京幹線/);
  assert.notEqual(stopsAfterRouteSwitch, stopsBeforeRouteSwitch, 'Route switch should load a distinct real route shape');

  await page.getByText('路線 303區').click();
  await page.waitForTimeout(700);
  const latestText = await page.locator('body').innerText();
  assert.match(latestText, /位置觀察需核對/, 'Latest slot should include route quality observations from freshness data');

  await page.getByLabel('上一小時').click();
  await page.waitForTimeout(300);
  const historyText = await page.locator('body').innerText();
  assert.match(historyText, /22:00 的問題/);
  assert.equal(await page.locator('.prob-card').count(), 2, 'History slot should show route problems for 303區');
  assert.equal(historyText.includes('GPS 推估，非官方車牌歸屬。'), false, 'Vehicle assignment note should be limited to latest slot');
  assert.equal(await page.locator('.seg.problem').count() > 0, true, 'Problem route segments should be highlighted');

  await page.locator('.prob-card').first().hover();
  assert.equal(await page.locator('.pin.focus').count(), 1, 'Hovering a problem card should focus the corresponding route pin');
  assert.equal(forbiddenVisibleText.test(historyText), false, 'Forbidden implementation wording is visible after interactions');

  await page.getByText('路線 南環幹線').click();
  await page.waitForTimeout(700);
  await page.getByText('回到最新快照').click();
  await page.waitForTimeout(300);
  const liveGapText = await page.locator('body').innerText();
  assert.match(liveGapText, /GPS 推估，非官方車牌歸屬。/, 'Latest service-gap problem should show the GPS estimate note');

  console.log(`bus oversight dashboard verification passed: ${targetUrl}`);
} finally {
  await browser.close();
}
