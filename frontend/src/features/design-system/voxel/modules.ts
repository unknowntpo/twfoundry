export type GeometryType = "point" | "line" | "polygon" | "grid" | "volume";

export type VisualRole = "vehicle" | "route" | "station" | "sensor" | "event" | "field" | "zone";

export type TimeMode = "live" | "historical" | "static";

export type VoxelModuleKey =
  | "moving-object"
  | "route"
  | "station"
  | "sensor"
  | "field-volume"
  | "incident-pulse"
  | "zone-chunk";

export type VoxelRenderModule = {
  key: VoxelModuleKey;
  renderer: string;
  title: string;
  input: string;
  visualRole: VisualRole;
  geometryType: GeometryType;
  timeMode: TimeMode;
  styleToken: string;
  description: string;
  examples: string[];
};

export const voxelModules: VoxelRenderModule[] = [
  {
    key: "moving-object",
    renderer: "MovingObjectRenderer",
    title: "Moving vehicle voxel",
    input: "point + vehicle",
    visualRole: "vehicle",
    geometryType: "point",
    timeMode: "live",
    styleToken: "transport.metro",
    description:
      "A detailed voxel train asset with carriage windows, route color, and timeline motion.",
    examples: ["Taipei Metro train", "rescue vehicle", "maintenance cart"],
  },
  {
    key: "route",
    renderer: "RouteRenderer",
    title: "Raised route path",
    input: "line + route",
    visualRole: "route",
    geometryType: "line",
    timeMode: "static",
    styleToken: "route.metro-line",
    description: "Raised route geometry that keeps true route colors readable on Sakura terrain.",
    examples: ["MRT line", "road corridor", "evacuation path"],
  },
  {
    key: "station",
    renderer: "StationNodeRenderer",
    title: "Muted station node",
    input: "point + station",
    visualRole: "station",
    geometryType: "point",
    timeMode: "static",
    styleToken: "node.station-muted",
    description: "Low-emphasis station marker that stays visible without competing with vehicles.",
    examples: ["MRT station", "bus stop", "transfer hub"],
  },
  {
    key: "sensor",
    renderer: "SensorTowerRenderer",
    title: "Observation tower",
    input: "point + sensor",
    visualRole: "sensor",
    geometryType: "point",
    timeMode: "live",
    styleToken: "sensor.air-water",
    description:
      "Small voxel tower with a readable beacon for AQMS, rainfall, and roadside sensors.",
    examples: ["AQMS station", "rain gauge", "speed detector"],
  },
  {
    key: "field-volume",
    renderer: "FieldVolumeRenderer",
    title: "Rainfall volume",
    input: "grid/volume + field",
    visualRole: "field",
    geometryType: "volume",
    timeMode: "historical",
    styleToken: "field.rainfall",
    description: "A translucent voxel field with animated rain drops and intensity blocks.",
    examples: ["rain cell", "PM2.5 cloud", "crowding volume"],
  },
  {
    key: "incident-pulse",
    renderer: "IncidentPulseRenderer",
    title: "Incident pulse block",
    input: "point/polygon + event",
    visualRole: "event",
    geometryType: "polygon",
    timeMode: "live",
    styleToken: "incident.alert",
    description: "Semi-transparent red voxel block with a breathing light and tension ring.",
    examples: ["signal hold", "service disruption", "road incident"],
  },
  {
    key: "zone-chunk",
    renderer: "ZoneChunkRenderer",
    title: "Terrain chunk",
    input: "grid + zone",
    visualRole: "zone",
    geometryType: "grid",
    timeMode: "static",
    styleToken: "terrain.chunk",
    description:
      "A map-ready terrain chunk for districts, land use, and future MapLibre tile projection.",
    examples: ["visible map chunk", "district tile", "terrain class"],
  },
];

export const registryRules = [
  ["point + vehicle", "MovingObjectRenderer", "train, bus, emergency vehicle"],
  ["line + route", "RouteRenderer", "MRT line, road corridor, path"],
  ["point + station", "StationNodeRenderer", "station, stop, transfer hub"],
  ["point + sensor", "SensorTowerRenderer", "AQMS, rainfall gauge, detector"],
  ["grid/volume + field", "FieldVolumeRenderer", "rain, PM2.5, crowding, risk"],
  ["point/polygon + event", "IncidentPulseRenderer", "incident, closure, alert"],
  ["grid/polygon + zone", "ZoneChunkRenderer", "tile chunk, terrain, admin zone"],
];

export const paletteTokens = [
  ["Canvas mist", "--twf-color-canvas", "#FBE5EC", "春霧與櫻花背景"],
  ["Panel ivory", "--twf-color-surface", "#FFF9F3", "面板底色，不做玻璃"],
  ["Sakura", "--twf-color-voxel-sakura", "#EFB5C6", "住宅與櫻花地表"],
  ["Sakura pop", "--twf-color-voxel-sakura-strong", "#DC7898", "選取與主強調"],
  ["Sora", "--twf-color-voxel-sora", "#67AEE5", "明亮天空與即時資訊"],
  ["Mizu", "--twf-color-voxel-mizu", "#8BCDD8", "雨量與水感體積"],
  ["Leaf", "--twf-color-voxel-leaf", "#75BD85", "安全、綠地、健康狀態"],
  ["Fuji", "--twf-color-voxel-fuji", "#8D83C7", "夜間與深度"],
  ["Alert", "--twf-color-route-red", "#DF3F53", "事故與紅線語意"],
  ["Yamabuki", "--twf-color-status-warning", "#F6B23A", "提示與低危險警示"],
];
