import { resolveMapProvider } from "@/features/mrt/map/map-provider";

export type MrtLiveBoardSource = "mock" | "tdx";

export function resolveMrtLiveBoardSource(value: string | undefined): MrtLiveBoardSource {
  return value === "tdx" ? "tdx" : "mock";
}

export const appConfig = {
  mapProvider:
    import.meta.env.MODE === "test"
      ? "mock"
      : import.meta.env.MODE === "e2e"
        ? resolveMapProvider(import.meta.env.VITE_MAP_PROVIDER ?? "mock")
        : resolveMapProvider(import.meta.env.VITE_MAP_PROVIDER),
  mapLibreStyleUrl:
    import.meta.env.VITE_MAPLIBRE_STYLE_URL ?? "https://demotiles.maplibre.org/style.json",
  mrtLiveBoardSource:
    import.meta.env.MODE === "e2e"
      ? resolveMrtLiveBoardSource(import.meta.env.VITE_MRT_LIVEBOARD_SOURCE)
      : resolveMrtLiveBoardSource(import.meta.env.VITE_MRT_LIVEBOARD_SOURCE),
  tdxProxyUrl: import.meta.env.VITE_TDX_PROXY_URL ?? "http://localhost:8080",
};
