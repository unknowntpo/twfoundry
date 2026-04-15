export type MapProvider = "google" | "mock";

export function resolveMapProvider(value: string | undefined): MapProvider {
  if (value === undefined || value === "") {
    return "mock";
  }

  if (value === "google" || value === "mock") {
    return value;
  }

  throw new Error(`Unsupported map provider: ${value}`);
}
