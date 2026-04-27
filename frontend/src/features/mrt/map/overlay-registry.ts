export type OverlayId = "mrt-routes" | "mrt-stations" | "mrt-estimated-trains" | "timeline";

export type OverlayCategory = "moving" | "station" | "route" | "time";

export interface OverlayVisibility {
  defaultVisible: boolean;
  supportsToggle: boolean;
}

export interface OverlayDataDependency {
  sourceId: string;
  datasetId: string;
  required: boolean;
}

export interface OverlayControl {
  id: string;
  label: string;
  kind: "toggle" | "slider" | "select";
}

export interface OverlayDescriptor {
  id: OverlayId;
  title: string;
  category: OverlayCategory;
  description: string;
  zIndex: number;
  visibility: OverlayVisibility;
  dataDependencies: OverlayDataDependency[];
  controls: OverlayControl[];
  timelineAware: boolean;
}

export interface OverlayRenderContext {
  mapProvider: "maplibre" | "mock";
  selectedStationId?: string;
  visibleLineIds: string[];
  visibleOverlayIds: OverlayId[];
}

export interface OverlayRenderer {
  id: OverlayId;
  mount(context: OverlayRenderContext): void | Promise<void>;
  update(context: OverlayRenderContext): void | Promise<void>;
  unmount(): void | Promise<void>;
}

export const mrtOverlayRegistry: OverlayDescriptor[] = [
  {
    id: "mrt-routes",
    title: "MRT Routes",
    category: "route",
    description: "Static MRT route geometry and line color presentation.",
    zIndex: 10,
    visibility: {
      defaultVisible: true,
      supportsToggle: true,
    },
    dataDependencies: [{ sourceId: "tdx", datasetId: "metro_shape", required: false }],
    controls: [],
    timelineAware: false,
  },
  {
    id: "mrt-stations",
    title: "MRT Stations",
    category: "station",
    description: "Station markers, selection state, and station-level interaction.",
    zIndex: 20,
    visibility: {
      defaultVisible: true,
      supportsToggle: true,
    },
    dataDependencies: [{ sourceId: "tdx", datasetId: "metro_station", required: false }],
    controls: [],
    timelineAware: false,
  },
  {
    id: "mrt-estimated-trains",
    title: "Estimated MRT Trains",
    category: "moving",
    description: "Train circles derived from station LiveBoard and route geometry.",
    zIndex: 30,
    visibility: {
      defaultVisible: true,
      supportsToggle: true,
    },
    dataDependencies: [{ sourceId: "tdx", datasetId: "mrt_liveboard", required: true }],
    controls: [{ id: "show-trains", label: "Train", kind: "toggle" }],
    timelineAware: true,
  },
  {
    id: "timeline",
    title: "Timeline",
    category: "time",
    description: "Playback cursor, play/pause state, and historical replay surface.",
    zIndex: 100,
    visibility: {
      defaultVisible: true,
      supportsToggle: false,
    },
    dataDependencies: [],
    controls: [{ id: "playback-mode", label: "Playback", kind: "select" }],
    timelineAware: true,
  },
];

export function findOverlayById(overlayId: OverlayId): OverlayDescriptor | undefined {
  return mrtOverlayRegistry.find((overlay) => overlay.id === overlayId);
}

export function defaultVisibleOverlayIds(): OverlayId[] {
  return mrtOverlayRegistry
    .filter((overlay) => overlay.visibility.defaultVisible)
    .map((overlay) => overlay.id);
}
