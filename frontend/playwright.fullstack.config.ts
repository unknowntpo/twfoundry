import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  testMatch: /fullstack\.spec\.ts/,
  use: {
    baseURL: "http://127.0.0.1:5176",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command:
        "cd .. && if [ -z \"$JAVA_HOME\" ]; then export JAVA_HOME=$(/usr/libexec/java_home -v 21); fi && export PATH=\"$JAVA_HOME/bin:$PATH\" && ./gradlew :backend:ingestion:bootRun --args='--spring.profiles.active=e2e --server.port=18080'",
      url: "http://127.0.0.1:18080/actuator/health",
      reuseExistingServer: false,
    },
    {
      command:
        "VITE_MAP_PROVIDER=mock VITE_MRT_LIVEBOARD_SOURCE=tdx VITE_TDX_PROXY_URL=http://127.0.0.1:18080 bun run dev --host 127.0.0.1 --port 5176 --mode e2e",
      url: "http://127.0.0.1:5176",
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
