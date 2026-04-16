import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTdxProxyHandler, loadTdxProxyConfig } from "../src/features/mrt/tdx/proxy-core";

const env = {
  ...loadDotEnv(resolve(process.cwd(), ".env")),
  ...process.env,
};

const port = Number(env.TDX_PROXY_PORT ?? "5174");
const handler = createTdxProxyHandler(loadTdxProxyConfig(env));

Bun.serve({
  fetch: handler,
  port,
});

console.info(`TDX proxy listening on http://localhost:${port}`);

function loadDotEnv(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...value] = line.split("=");
        return [key, value.join("=").replace(/^['"]|['"]$/g, "")];
      }),
  );
}
