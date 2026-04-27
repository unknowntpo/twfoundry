import { resolveMapProvider } from "@/features/mrt/map/map-provider";

export type MrtLiveBoardSource = "mock" | "tdx";
export type MapLibreStyleConfig =
  | string
  | {
      version: 8;
      sources: Record<
        string,
        {
          type: "raster";
          tiles: string[];
          tileSize: number;
          attribution: string;
        }
      >;
      layers: Array<{
        id: string;
        type: "raster";
        source: string;
      }>;
    };

export function resolveMrtLiveBoardSource(value: string | undefined): MrtLiveBoardSource {
  return value === "tdx" ? "tdx" : "mock";
}

export function resolveMapLibreStyle(
  styleUrl: string | undefined,
  rasterTilesUrl: string | undefined,
): MapLibreStyleConfig {
  if (styleUrl && styleUrl.trim() !== "") {
    return styleUrl;
  }

  if (!rasterTilesUrl || rasterTilesUrl.trim() === "") {
    return "https://tiles.openfreemap.org/styles/liberty";
  }

  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [rasterTilesUrl.trim()],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "osm",
      },
    ],
  };
}

export const appConfig = {
  mapProvider:
    import.meta.env.MODE === "test"
      ? "mock"
      : import.meta.env.MODE === "e2e"
        ? resolveMapProvider(import.meta.env.VITE_MAP_PROVIDER ?? "mock")
        : resolveMapProvider(import.meta.env.VITE_MAP_PROVIDER),
  mapLibreStyle: resolveMapLibreStyle(
    import.meta.env.VITE_MAPLIBRE_STYLE_URL,
    import.meta.env.VITE_MAPLIBRE_RASTER_TILES_URL,
  ),
  mrtLiveBoardSource:
    import.meta.env.MODE === "e2e"
      ? resolveMrtLiveBoardSource(import.meta.env.VITE_MRT_LIVEBOARD_SOURCE)
      : resolveMrtLiveBoardSource(import.meta.env.VITE_MRT_LIVEBOARD_SOURCE),
  tdxProxyUrl: import.meta.env.VITE_TDX_PROXY_URL ?? "http://localhost:8080",
};
