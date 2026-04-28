export type ScenarioId = "clear" | "rush" | "storm" | "night";
export type DemoTab = "map" | "ontology" | "pipelines" | "workshop" | "issues";
export type TimelineMode = "now" | "24h" | "live";

export interface Scenario {
  id: ScenarioId;
  label: string;
  time: string;
  note: string;
}

export interface Layer {
  id: string;
  label: string;
  source: string;
  tone: "red" | "blue" | "green" | "orange" | "brown";
  live: boolean;
  visible: boolean;
}

export interface MapFeature {
  id: string;
  kind: "train" | "incident" | "sensor";
  label: string;
  source: string;
  detail: string;
  lng: number;
  lat: number;
  x: number;
  y: number;
  tone: "red" | "blue" | "green" | "orange" | "brown";
}

export interface OntologyType {
  id: string;
  label: string;
  count: number;
  cadence: string;
  source: string;
  summary: string;
  properties: string[];
  relations: string[];
}

export interface TimelineEvent {
  id: string;
  scenarioIds: ScenarioId[];
  minute: number;
  durationMinutes: number;
  label: string;
  source: string;
  tone: "red" | "blue" | "green" | "orange" | "brown";
  severity: "info" | "watch" | "warning" | "critical";
  metric: string;
}

export interface DemoMetrics {
  activeTrains: number;
  openIncidents: number;
  aqmsStations: number;
  rainfallMmHr: number;
  freewayKph: number;
  pm25: number;
  updateCadenceSec: number;
  headwaySec: number;
  etaMinutes: number;
  platformLoadPct: number;
  activeEventCount: number;
  layerReadouts: Record<string, string>;
  routeEtas: Array<{ station: string; etaMinutes: number }>;
}

export const scenarios: Scenario[] = [
  { id: "clear", label: "Tuesday clear morning", time: "08:15", note: "Base weekday service" },
  { id: "rush", label: "Friday evening rush", time: "18:05", note: "Peak commuter flow" },
  { id: "storm", label: "Afternoon storm cell", time: "16:30", note: "Weather disruption watch" },
  { id: "night", label: "Late night low activity", time: "23:40", note: "Sparse service" },
];

export const initialLayers: Layer[] = [
  {
    id: "metro",
    label: "Taipei Metro - Live trains",
    source: "TDX MOTC",
    tone: "red",
    live: true,
    visible: true,
  },
  {
    id: "rainfall",
    label: "Rainfall radar",
    source: "CWA Doppler composite",
    tone: "blue",
    live: true,
    visible: true,
  },
  {
    id: "pm25",
    label: "Air quality PM2.5",
    source: "EPA AQMS",
    tone: "orange",
    live: true,
    visible: false,
  },
  {
    id: "highways",
    label: "Freeway speed segments",
    source: "TDX Traffic",
    tone: "green",
    live: true,
    visible: true,
  },
  {
    id: "incidents",
    label: "Traffic incidents",
    source: "TDX 1968",
    tone: "brown",
    live: true,
    visible: true,
  },
];

export const mapFeatures: MapFeature[] = [
  {
    id: "T1005",
    kind: "train",
    label: "T1005",
    source: "Tamsui-Xinyi",
    detail: "Direction to Tamsui, 0.5 min ETA to Yuanshan",
    lng: 121.522,
    lat: 25.069,
    x: 47,
    y: 35,
    tone: "red",
  },
  {
    id: "T1014",
    kind: "train",
    label: "T1014",
    source: "Bannan",
    detail: "Westbound, 88 sec ETA to Ximen",
    lng: 121.506,
    lat: 25.042,
    x: 39,
    y: 53,
    tone: "blue",
  },
  {
    id: "I-237",
    kind: "incident",
    label: "I-237",
    source: "Civic Boulevard",
    detail: "Collision, lane blocked, severity 3",
    lng: 121.535,
    lat: 25.046,
    x: 58,
    y: 45,
    tone: "brown",
  },
  {
    id: "AQ-Daan",
    kind: "sensor",
    label: "AQ-Daan",
    source: "EPA AQMS",
    detail: "PM2.5 28 ug/m3, moderate",
    lng: 121.5435,
    lat: 25.027,
    x: 62,
    y: 66,
    tone: "orange",
  },
];

export const ontologyTypes: OntologyType[] = [
  {
    id: "Train",
    label: "Train",
    count: 49,
    cadence: "10s",
    source: "TDX real-time train position",
    summary: "A metro vehicle currently in revenue service with computed position and next stop.",
    properties: ["id string", "lineId ref-Line", "position geo:Point live", "etaSec int live"],
    relations: ["operates_on Line", "next_stop_at Station"],
  },
  {
    id: "Station",
    label: "Station",
    count: 81,
    cadence: "static",
    source: "TDX station master",
    summary: "Passenger boarding facility, line membership, interchange status, and coordinates.",
    properties: ["id string", "name string", "lineIds ref-Line[]", "interchange boolean"],
    relations: ["served_by Line", "next_stop_for Train"],
  },
  {
    id: "Incident",
    label: "Incident",
    count: 7,
    cadence: "30s",
    source: "TDX traffic incident",
    summary: "A road event that can affect routing, alerting, and operations response.",
    properties: ["id string", "kind enum", "severity int", "position geo:Point"],
    relations: ["occurs_on Highway", "located_in District"],
  },
  {
    id: "Sensor",
    label: "Sensor",
    count: 12,
    cadence: "60s",
    source: "EPA AQMS",
    summary: "A monitoring station reporting PM2.5 and related air quality categories.",
    properties: ["id string", "name string", "pm25 float live", "category enum live"],
    relations: ["located_in District"],
  },
];

export const timelineTicks = [
  { label: "AM rush", position: 28 },
  { label: "Convective onset", position: 54 },
  { label: "PM peak", position: 74 },
];

export const timelineEvents: TimelineEvent[] = [
  {
    id: "evt-am-rush-load",
    scenarioIds: ["clear", "rush"],
    minute: 455,
    durationMinutes: 95,
    label: "AM rush load",
    source: "TDX metro",
    tone: "red",
    severity: "watch",
    metric: "47 trains",
  },
  {
    id: "evt-banqiao-headway",
    scenarioIds: ["clear", "rush", "storm"],
    minute: 515,
    durationMinutes: 32,
    label: "Banqiao headway gap",
    source: "TDX liveboard",
    tone: "blue",
    severity: "info",
    metric: "+2.4m",
  },
  {
    id: "evt-f1-incident",
    scenarioIds: ["rush", "storm"],
    minute: 565,
    durationMinutes: 76,
    label: "F1 KM95 incident",
    source: "TDX 1968",
    tone: "brown",
    severity: "warning",
    metric: "lane blocked",
  },
  {
    id: "evt-aqms-drift",
    scenarioIds: ["clear", "rush", "night"],
    minute: 675,
    durationMinutes: 44,
    label: "AQMS drift check",
    source: "EPA AQMS",
    tone: "orange",
    severity: "info",
    metric: "PM2.5 32",
  },
  {
    id: "evt-cwa-cell",
    scenarioIds: ["storm"],
    minute: 885,
    durationMinutes: 120,
    label: "Convective onset",
    source: "CWA radar",
    tone: "blue",
    severity: "critical",
    metric: "18 mm/hr",
  },
  {
    id: "evt-station-crowding",
    scenarioIds: ["rush", "storm"],
    minute: 1018,
    durationMinutes: 86,
    label: "Zhongshan crowding",
    source: "Metro ops",
    tone: "red",
    severity: "warning",
    metric: "platform 82%",
  },
  {
    id: "evt-pm-rush",
    scenarioIds: ["rush", "storm"],
    minute: 1085,
    durationMinutes: 125,
    label: "PM rush peak",
    source: "TDX metro",
    tone: "red",
    severity: "watch",
    metric: "49 trains",
  },
  {
    id: "evt-data-lag",
    scenarioIds: ["storm", "night"],
    minute: 1128,
    durationMinutes: 25,
    label: "CWA tile lag",
    source: "Ingestion",
    tone: "blue",
    severity: "warning",
    metric: "10m stale",
  },
  {
    id: "evt-tainan-pm",
    scenarioIds: ["rush"],
    minute: 1140,
    durationMinutes: 68,
    label: "PM2.5 alert",
    source: "EPA AQMS",
    tone: "orange",
    severity: "warning",
    metric: "Tainan",
  },
  {
    id: "evt-night-maintenance",
    scenarioIds: ["night"],
    minute: 1390,
    durationMinutes: 38,
    label: "Track maintenance",
    source: "Metro ops",
    tone: "green",
    severity: "watch",
    metric: "BR segment",
  },
  {
    id: "evt-night-low-service",
    scenarioIds: ["night"],
    minute: 1420,
    durationMinutes: 18,
    label: "Last train window",
    source: "TDX metro",
    tone: "red",
    severity: "critical",
    metric: "12 trains",
  },
];

function wrappedDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1440 - distance);
}

function peak(minute: number, centerMinute: number, width: number): number {
  const distance = wrappedDistance(minute, centerMinute);
  return Math.exp(-((distance * distance) / (2 * width * width)));
}

function wave(minute: number, period: number, phase = 0): number {
  return (Math.sin((minute / period) * Math.PI * 2 + phase) + 1) / 2;
}

export function buildDemoMetrics(scenarioId: ScenarioId, minute: number): DemoMetrics {
  const morningRush = peak(minute, 8 * 60 + 10, 95);
  const eveningRush = peak(minute, 18 * 60 + 5, 120);
  const stormCell = scenarioId === "storm" ? peak(minute, 16 * 60 + 30, 150) : 0;
  const nightLow = scenarioId === "night" ? peak(minute, 23 * 60 + 35, 180) : 0;
  const scenarioLoad =
    scenarioId === "rush"
      ? 1.15
      : scenarioId === "storm"
        ? 0.95
        : scenarioId === "night"
          ? 0.42
          : 0.78;
  const activity = Math.max(morningRush, eveningRush) * scenarioLoad;
  const jitter = wave(minute, 37, 0.7);
  const activeEventCount = timelineEvents.filter(
    (event) =>
      event.scenarioIds.includes(scenarioId) &&
      minute >= event.minute &&
      minute <= event.minute + event.durationMinutes,
  ).length;
  const activeTrains = Math.round(18 + activity * 31 + stormCell * 5 - nightLow * 8 + jitter * 3);
  const openIncidents = Math.round(
    2 + eveningRush * 4 + stormCell * 6 + activeEventCount * 0.8 + wave(minute, 83) * 1.5,
  );
  const rainfallMmHr = Number(
    (0.4 + stormCell * 18 + (scenarioId === "rush" ? 1.2 : 0) + wave(minute, 46) * 1.8).toFixed(1),
  );
  const pm25 = Math.round(
    18 + eveningRush * 22 + nightLow * 10 + stormCell * 4 + wave(minute, 64, 1.4) * 8,
  );
  const freewayKph = Math.round(88 - eveningRush * 38 - stormCell * 22 - openIncidents * 1.8);
  const headwaySec = Math.max(
    72,
    Math.round(165 - activity * 58 + stormCell * 42 + wave(minute, 29) * 18),
  );
  const etaMinutes = Math.max(0.3, Number((headwaySec / 230 + wave(minute, 19) * 0.7).toFixed(1)));
  const platformLoadPct = Math.min(
    96,
    Math.round(32 + activity * 48 + stormCell * 14 + wave(minute, 51) * 8),
  );
  const updateCadenceSec = scenarioId === "storm" && stormCell > 0.55 ? 90 : 60;
  const routeEtas = ["Yuanshan", "Jiantan", "Shilin", "Zhishan", "Mingde", "Shipai"].map(
    (station, index) => ({
      station,
      etaMinutes: Number((etaMinutes + index * (0.7 + headwaySec / 420)).toFixed(1)),
    }),
  );

  return {
    activeTrains,
    openIncidents,
    aqmsStations: 12,
    rainfallMmHr,
    freewayKph,
    pm25,
    updateCadenceSec,
    headwaySec,
    etaMinutes,
    platformLoadPct,
    activeEventCount,
    routeEtas,
    layerReadouts: {
      metro: `${activeTrains} trains`,
      rainfall: `${rainfallMmHr.toFixed(1)} mm/hr`,
      pm25: `PM2.5 ${pm25}`,
      highways: `${freewayKph} kph`,
      incidents: `${openIncidents} open`,
    },
  };
}
