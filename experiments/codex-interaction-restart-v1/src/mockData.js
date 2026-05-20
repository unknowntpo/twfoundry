export const layers = [
  { id: 'metro', label: 'Metro', tone: '#58b2dc' },
  { id: 'weather', label: 'Rain', tone: '#81c7d4' },
  { id: 'air', label: 'PM2.5', tone: '#ffb11b' },
  { id: 'incidents', label: 'Incidents', tone: '#e16b8c' },
  { id: 'sensors', label: 'Sensors', tone: '#5dac81' }
]

export const stations = [
  { id: 'st-taipei-main', name: 'Taipei Main', x: -3, z: -1.8, type: 'Station', route: 'Tamsui-Xinyi' },
  { id: 'st-zhongshan', name: 'Zhongshan', x: -1.25, z: -0.75, type: 'Station', route: 'Tamsui-Xinyi' },
  { id: 'st-yuanshan', name: 'Yuanshan', x: 0.6, z: 0.35, type: 'Station', route: 'Tamsui-Xinyi' },
  { id: 'st-jiantan', name: 'Jiantan', x: 2.45, z: 1.45, type: 'Station', route: 'Tamsui-Xinyi' }
]

export const avatarTiles = [
  { id: 'tile-main', label: 'Main Plaza', x: -2.1, z: -1.25 },
  { id: 'tile-river', label: 'River Walk', x: -0.2, z: 1.6 },
  { id: 'tile-station', label: 'Yuanshan Gate', x: 0.8, z: 0.1 },
  { id: 'tile-market', label: 'Market Edge', x: 2.35, z: -1.1 }
]

export const trains = [
  {
    id: 'train-r22',
    name: 'Train R22',
    type: 'Train',
    route: 'Tamsui-Xinyi',
    color: '#e16b8c',
    offset: 0.12,
    relationships: [
      ['belongs_to', 'Route Tamsui-Xinyi'],
      ['next_stop', 'Station Yuanshan'],
      ['observed_by', 'TDX live feed'],
      ['affected_by', 'Rainfall Cell R-08'],
      ['near', 'Incident I-237']
    ]
  },
  {
    id: 'train-r31',
    name: 'Train R31',
    type: 'Train',
    route: 'Tamsui-Xinyi',
    color: '#8b81c3',
    offset: 0.58,
    relationships: [
      ['belongs_to', 'Route Tamsui-Xinyi'],
      ['next_stop', 'Station Zhongshan'],
      ['observed_by', 'TDX live feed'],
      ['shares_route_with', 'Train R22']
    ]
  }
]

export const incidents = [
  {
    id: 'incident-i237',
    name: 'Incident I-237',
    type: 'Incident',
    x: 1.45,
    z: 0.8,
    severity: 'route delay',
    relationships: [
      ['blocks_access_to', 'Station Yuanshan'],
      ['affects', 'Train R22'],
      ['reported_by', 'CCTV / road feed'],
      ['overlaps', 'Rainfall Cell R-08'],
      ['raises_risk_for', 'Avatar local context']
    ]
  },
  {
    id: 'incident-i244',
    name: 'Incident I-244',
    type: 'Incident',
    x: -2.45,
    z: -0.55,
    severity: 'crowd pocket',
    relationships: [
      ['near', 'Taipei Main'],
      ['affects', 'platform transfer'],
      ['observed_by', 'crowd sensor S-02']
    ]
  }
]

export const sensors = [
  { id: 'sensor-s02', name: 'Sensor S-02', type: 'Sensor', x: -2.6, z: -0.85, metric: 'crowd', base: 36 },
  { id: 'sensor-aqm7', name: 'AQM-7', type: 'AQMS Station', x: 1.85, z: -1.55, metric: 'pm25', base: 18 },
  { id: 'sensor-r08', name: 'Rain Cell R-08', type: 'Rainfall Cell', x: 0.15, z: 1.25, metric: 'rain', base: 12 }
]

export const railPath = stations.map((station) => ({ x: station.x, z: station.z }))
