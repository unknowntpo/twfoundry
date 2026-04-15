import { resolveMapProvider } from "@/features/mrt/map/map-provider";

export const appConfig = {
  mapProvider:
    import.meta.env.MODE === "e2e" ? "mock" : resolveMapProvider(import.meta.env.VITE_MAP_PROVIDER),
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
};
