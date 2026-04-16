import { resolveMapProvider } from "@/features/mrt/map/map-provider";

export type MrtLiveBoardSource = "mock" | "tdx";

export function resolveMrtLiveBoardSource(value: string | undefined): MrtLiveBoardSource {
  return value === "tdx" ? "tdx" : "mock";
}

export const appConfig = {
  mapProvider:
    import.meta.env.MODE === "e2e" ? "mock" : resolveMapProvider(import.meta.env.VITE_MAP_PROVIDER),
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  googleMapsMapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID",
  mrtLiveBoardSource:
    import.meta.env.MODE === "e2e"
      ? "mock"
      : resolveMrtLiveBoardSource(import.meta.env.VITE_MRT_LIVEBOARD_SOURCE),
  tdxProxyUrl: import.meta.env.VITE_TDX_PROXY_URL ?? "http://localhost:5174",
};
