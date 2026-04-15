import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5175",
    trace: "on-first-retry"
  },
  webServer: {
    command: "bun run dev --host 127.0.0.1 --port 5175 --mode e2e",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
