export type MapProvider = "maplibre" | "mock";

export function resolveMapProvider(value: string | undefined): MapProvider {
  if (value === undefined || value === "") {
    return "mock";
  }

  if (value === "maplibre" || value === "mock") {
    return value;
  }

  throw new Error(`Unsupported map provider: ${value}`);
}
