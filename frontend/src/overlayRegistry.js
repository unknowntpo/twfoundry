export const overlayCategories = [
  { id: 'moving', label: 'MOVING', description: 'Live or estimated moving objects.' },
  { id: 'station', label: 'STATION', description: 'Facilities and stop points.' },
  { id: 'route', label: 'ROUTE', description: 'Static or replayable path geometry.' },
  { id: 'environment', label: 'ENVIRON', description: 'Weather and exposure context.' },
  { id: 'incident', label: 'INCIDENT', description: 'Operational alerts and disruptions.' },
  { id: 'analytics', label: 'ANALYTICS', description: 'Computed spatial indicators.' },
];

export const overlayRegistry = [
  {
    id: 'mrt-routes',
    title: 'MRT routes',
    category: 'route',
    color: '#E16B8C',
    short: 'TDX',
    zIndex: 20,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'tdx', datasetId: 'metro_shape', required: false }],
    timelineAware: false,
    controls: [],
    renderer: { provider: 'maplibre', module: 'mrt-routes' },
  },
  {
    id: 'mrt-stations',
    title: 'MRT stations',
    category: 'station',
    color: '#E16B8C',
    short: 'TDX',
    zIndex: 30,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'tdx', datasetId: 'metro_station', required: false }],
    timelineAware: false,
    controls: [{ id: 'station-size', label: 'Station size', kind: 'slider' }],
    renderer: { provider: 'maplibre', module: 'mrt-stations' },
  },
  {
    id: 'mrt-trains',
    title: 'Estimated trains',
    category: 'moving',
    color: '#D94B55',
    short: 'TDX',
    zIndex: 40,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'tdx', datasetId: 'mrt_liveboard', required: true }],
    timelineAware: true,
    controls: [{ id: 'show-trails', label: 'Trails', kind: 'toggle' }],
    renderer: { provider: 'maplibre', module: 'mrt-estimated-trains', status: 'planned' },
  },
  {
    id: 'bus-stops',
    title: 'Bus stops',
    category: 'station',
    color: '#5DAC81',
    short: 'TDX',
    zIndex: 24,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'tdx', datasetId: 'bus_stop', required: false }],
    timelineAware: false,
    controls: [{ id: 'bus-size', label: 'Bus marker size', kind: 'slider' }],
    renderer: { provider: 'maplibre', module: 'point-stations', status: 'planned' },
  },
  {
    id: 'youbike-stations',
    title: 'YouBike docks',
    category: 'station',
    color: '#FFB11B',
    short: 'TDX',
    zIndex: 25,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'tdx', datasetId: 'bike_station_availability', required: false }],
    timelineAware: true,
    controls: [{ id: 'availability', label: 'Availability', kind: 'toggle' }],
    renderer: { provider: 'maplibre', module: 'point-stations', status: 'planned' },
  },
  {
    id: 'rainfall-cells',
    title: 'Rainfall cells',
    category: 'environment',
    color: '#81C7D4',
    short: 'CWA',
    zIndex: 35,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'cwa', datasetId: 'rainfall_observation', required: false }],
    timelineAware: true,
    controls: [{ id: 'opacity', label: 'Opacity', kind: 'slider' }],
    renderer: { provider: 'maplibre', module: 'weather-cells', status: 'planned' },
  },
  {
    id: 'pm25-sensors',
    title: 'PM2.5 sensors',
    category: 'environment',
    color: '#FFB11B',
    short: 'EPA',
    zIndex: 36,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'epa', datasetId: 'aqms_pm25', required: false }],
    timelineAware: true,
    controls: [{ id: 'threshold', label: 'Threshold', kind: 'slider' }],
    renderer: { provider: 'maplibre', module: 'sensor-points', status: 'planned' },
  },
  {
    id: 'incidents',
    title: 'Incidents',
    category: 'incident',
    color: '#B481BB',
    short: 'OPS',
    zIndex: 50,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [{ sourceId: 'ops', datasetId: 'incident_events', required: false }],
    timelineAware: true,
    controls: [{ id: 'severity', label: 'Severity', kind: 'select' }],
    renderer: { provider: 'maplibre', module: 'incident-markers', status: 'planned' },
  },
  {
    id: 'population-analytics',
    title: 'Population grid',
    category: 'analytics',
    color: '#58B2DC',
    short: 'H3',
    zIndex: 10,
    visibility: { defaultVisible: false, supportsToggle: true },
    dataDependencies: [{ sourceId: 'segis', datasetId: 'population_h3', required: false }],
    timelineAware: false,
    controls: [
      { id: 'metric', label: 'Metric', kind: 'select' },
      { id: 'height', label: 'Height', kind: 'slider' },
    ],
    renderer: { provider: 'maplibre', module: 'h3-analytics', status: 'planned' },
  },
];

export const overlayLayerControls = overlayRegistry.map((overlay) => ({
  key: overlay.id,
  label: overlay.title,
  color: overlay.color,
  short: overlay.short,
  category: overlay.category,
  timelineAware: overlay.timelineAware,
  defaultVisible: overlay.visibility.defaultVisible,
  supportsToggle: overlay.visibility.supportsToggle,
  controls: overlay.controls,
  renderer: overlay.renderer,
}));

export const legacyOverlayLabels = {
  mrt: 'Taipei Metro',
  bus: 'Taipei Bus',
  ubike: 'YouBike docks',
  rain: 'Rainfall cells',
  pm25: 'PM2.5 sensors',
  incident: 'Incidents',
};

export function defaultOverlayVisibility(overlays = overlayRegistry) {
  return Object.fromEntries(overlays.map((overlay) => [overlay.id, overlay.visibility.defaultVisible]));
}

export function overlaysByCategory(overlays = overlayLayerControls, categories = overlayCategories) {
  return categories
    .map((category) => ({
      ...category,
      overlays: overlays.filter((overlay) => overlay.category === category.id),
    }))
    .filter((category) => category.overlays.length > 0);
}

export function activeOverlayCount(visibility, overlays = overlayLayerControls) {
  return overlays.filter((overlay) => visibility[overlay.key] ?? overlay.defaultVisible).length;
}
