export const TAIPEI_MAP_VIEW = {
  bounds: {
    west: 121.445,
    south: 24.975,
    east: 121.615,
    north: 25.138,
  },
  center: [121.535, 25.049],
  zoom: 11.2,
  pitch: 45,
  bearing: -17,
};

export const TAIPEI_DIORAMA_SURFACE_VIEW = {
  ...TAIPEI_MAP_VIEW,
  center: [121.5206, 25.0527],
  zoom: 14.25,
  pitch: 0,
  bearing: 0,
};

export function lngLatToGrid([lng, lat], gridSize = 30) {
  const { west, south, east, north } = TAIPEI_MAP_VIEW.bounds;
  const x = ((lng - west) / (east - west)) * (gridSize - 1);
  const z = ((north - lat) / (north - south)) * (gridSize - 1);
  return [
    Math.max(0, Math.min(gridSize - 1, x)),
    Math.max(0, Math.min(gridSize - 1, z)),
  ];
}

export function gridToLngLat([gx, gz], gridSize = 30) {
  const { west, south, east, north } = TAIPEI_MAP_VIEW.bounds;
  const lng = west + (gx / (gridSize - 1)) * (east - west);
  const lat = north - (gz / (gridSize - 1)) * (north - south);
  return [lng, lat];
}
