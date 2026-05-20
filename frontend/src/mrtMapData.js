const routeDefinitions = [
  {
    id: 'bannan',
    name: 'Bannan Line',
    color: '#4077D6',
    coordinates: [
      [121.455, 25.024],
      [121.473, 25.025],
      [121.500, 25.042],
      [121.517, 25.046],
      [121.532, 25.042],
      [121.544, 25.041],
      [121.565, 25.041],
      [121.582, 25.048],
      [121.607, 25.052],
    ],
  },
  {
    id: 'tamsui-xinyi',
    name: 'Tamsui-Xinyi Line',
    color: '#D94B55',
    coordinates: [
      [121.518, 25.132],
      [121.520, 25.104],
      [121.520, 25.087],
      [121.520, 25.062],
      [121.517, 25.046],
      [121.523, 25.033],
      [121.543, 25.033],
      [121.563, 25.033],
    ],
  },
  {
    id: 'songshan-xindian',
    name: 'Songshan-Xindian Line',
    color: '#3F9D6B',
    coordinates: [
      [121.537, 24.982],
      [121.536, 25.010],
      [121.532, 25.033],
      [121.544, 25.041],
      [121.561, 25.050],
      [121.577, 25.051],
    ],
  },
  {
    id: 'zhonghe-xinlu',
    name: 'Zhonghe-Xinlu Line',
    color: '#D89A38',
    coordinates: [
      [121.485, 25.000],
      [121.502, 25.016],
      [121.516, 25.033],
      [121.532, 25.042],
      [121.548, 25.052],
      [121.572, 25.060],
    ],
  },
];

const stationDefinitions = [
  { id: 'BL11', name: 'Longshan Temple', routeId: 'bannan', color: '#4077D6', coordinates: [121.500, 25.036] },
  { id: 'BL12', name: 'Ximen', routeId: 'bannan', color: '#4077D6', coordinates: [121.508, 25.042] },
  { id: 'BL13', name: 'Taipei Main Station', routeId: 'bannan', color: '#4077D6', coordinates: [121.517, 25.046] },
  { id: 'BL15', name: 'Zhongxiao Fuxing', routeId: 'bannan', color: '#4077D6', coordinates: [121.544, 25.041] },
  { id: 'BL18', name: 'Taipei City Hall', routeId: 'bannan', color: '#4077D6', coordinates: [121.565, 25.041] },
  { id: 'R15', name: 'Shilin', routeId: 'tamsui-xinyi', color: '#D94B55', coordinates: [121.520, 25.087] },
  { id: 'R13', name: 'Minquan W. Rd.', routeId: 'tamsui-xinyi', color: '#D94B55', coordinates: [121.520, 25.062] },
  { id: 'R11', name: 'Zhongshan', routeId: 'tamsui-xinyi', color: '#D94B55', coordinates: [121.520, 25.052] },
  { id: 'R10', name: 'Taipei Main Station', routeId: 'tamsui-xinyi', color: '#D94B55', coordinates: [121.517, 25.046] },
  { id: 'R05', name: 'Daan', routeId: 'tamsui-xinyi', color: '#D94B55', coordinates: [121.543, 25.033] },
  { id: 'G09', name: 'Guting', routeId: 'songshan-xindian', color: '#3F9D6B', coordinates: [121.532, 25.033] },
  { id: 'G14', name: 'Songjiang Nanjing', routeId: 'songshan-xindian', color: '#3F9D6B', coordinates: [121.532, 25.052] },
  { id: 'G16', name: 'Nanjing Sanmin', routeId: 'songshan-xindian', color: '#3F9D6B', coordinates: [121.577, 25.051] },
  { id: 'O07', name: 'Dongmen', routeId: 'zhonghe-xinlu', color: '#D89A38', coordinates: [121.532, 25.033] },
  { id: 'O08', name: 'Zhongxiao Xinsheng', routeId: 'zhonghe-xinlu', color: '#D89A38', coordinates: [121.532, 25.042] },
  { id: 'O11', name: 'Xingtian Temple', routeId: 'zhonghe-xinlu', color: '#D89A38', coordinates: [121.548, 25.052] },
];

export const mrtRouteGeoJson = {
  type: 'FeatureCollection',
  features: routeDefinitions.map((route) => ({
    type: 'Feature',
    id: route.id,
    properties: {
      id: route.id,
      name: route.name,
      color: route.color,
      source: 'TDX mock MRT overlay',
    },
    geometry: {
      type: 'LineString',
      coordinates: route.coordinates,
    },
  })),
};

export const mrtStationGeoJson = {
  type: 'FeatureCollection',
  features: stationDefinitions.map((station) => ({
    type: 'Feature',
    id: station.id,
    properties: {
      id: station.id,
      name: station.name,
      routeId: station.routeId,
      color: station.color,
      source: 'TDX mock station overlay',
    },
    geometry: {
      type: 'Point',
      coordinates: station.coordinates,
    },
  })),
};

export const mrtMapSummary = {
  routeCount: routeDefinitions.length,
  stationCount: stationDefinitions.length,
};
