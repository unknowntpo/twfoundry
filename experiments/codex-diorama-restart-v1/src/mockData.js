export const palette = {
  ink: '#2b2330',
  cloud: '#fff9fb',
  line: '#d8c8d6',
  skyClear: '#58b2dc',
  skyPale: '#a5dee4',
  waterSoft: '#81c7d4',
  leafSpring: '#5dac81',
  leafSoft: '#b5caa0',
  leafPale: '#a8d8b9',
  sunnyGold: '#ffb11b',
  sunnyFlower: '#f7d94c',
  fujiSoft: '#b481bb',
  fujiVivid: '#8b81c3',
  sakuraMist: '#fedfe1',
  sakuraPop: '#f596aa',
  sakuraAction: '#e16b8c',
  plinthTop: '#e7d9c8',
  plinthSide: '#c8aa8b',
  soil: '#9c7b52',
  railRed: '#e16b8c'
};

export const routeStops = [
  { id: 'station-beitou', name: 'Beitou', label: '北投', x: -4.7, z: -2.6 },
  { id: 'station-shipai', name: 'Shipai', label: '石牌', x: -3.2, z: -1.2 },
  { id: 'station-yuanshan', name: 'Yuanshan', label: '圓山', x: -1.1, z: 0.1 },
  { id: 'station-taipei-main', name: 'Taipei Main', label: '台北車站', x: 1.2, z: 0.7 },
  { id: 'station-cksmh', name: 'CKS Memorial Hall', label: '中正紀念堂', x: 3.2, z: 1.8 },
  { id: 'station-daan', name: 'Daan Park', label: '大安森林公園', x: 4.7, z: 2.8 }
];

export const ontologyObjects = [
  {
    id: 'train-r22',
    type: 'Train',
    name: 'Train R22',
    summary: 'TDX mock train projected as a voxel capsule on the Tamsui-Xinyi route.',
    state: 'Moving',
    freshness: 'live +12s',
    relationships: [
      'belongs_to -> Route Tamsui-Xinyi',
      'next_stop -> Station Yuanshan',
      'observed_by -> TDX MRT live feed',
      'affected_by -> Rainfall Cell R-03'
    ]
  },
  {
    id: 'route-tamsui-xinyi',
    type: 'Route',
    name: 'Tamsui-Xinyi Route',
    summary: 'Raised red voxel rail crossing the miniature Taipei base.',
    state: 'Normal headway',
    freshness: 'updated 18s ago',
    relationships: [
      'contains -> Station Yuanshan',
      'contains -> Train R22',
      'near -> Incident I-042',
      'served_by -> TDX timetable observations'
    ]
  },
  {
    id: 'station-yuanshan',
    type: 'Station',
    name: 'Yuanshan Station',
    summary: 'Low voxel station node with platform load and nearby context.',
    state: 'Moderate platform load',
    freshness: 'updated 24s ago',
    relationships: [
      'on_route -> Route Tamsui-Xinyi',
      'next_train -> Train R22',
      'near -> AQMS Station Datong',
      'near -> Rainfall Cell R-03'
    ]
  },
  {
    id: 'rain-r03',
    type: 'Rainfall Cell',
    name: 'Rainfall Cell R-03',
    summary: 'Soft blue voxel volume over the river bend, encoding light spring rain.',
    state: '2.6 mm/hr',
    freshness: 'updated 1m ago',
    relationships: [
      'affects -> Train R22',
      'covers -> Station Yuanshan',
      'observed_by -> CWA rainfall observation',
      'raises -> Local caution signal'
    ]
  },
  {
    id: 'aqms-datong',
    type: 'AQMS Station',
    name: 'AQMS Datong',
    summary: 'Small sensor tower projecting PM2.5 exposure as amber haze.',
    state: 'PM2.5 18 ug/m3',
    freshness: 'updated 3m ago',
    relationships: [
      'observes -> PM2.5',
      'near -> Station Yuanshan',
      'contributes_to -> Local risk zone',
      'shown_as -> amber voxel haze'
    ]
  },
  {
    id: 'incident-i042',
    type: 'Incident',
    name: 'Incident I-042',
    summary: 'Small warning marker near the station approach, kept subdued to avoid dashboard tone.',
    state: 'monitoring',
    freshness: 'updated 5m ago',
    relationships: [
      'near -> Route Tamsui-Xinyi',
      'may_affect -> Station Yuanshan',
      'observed_by -> traffic event feed',
      'connected_to -> Local risk zone'
    ]
  }
];

export const hudSignals = [
  { label: 'Live feed', value: 'TDX MRT', tone: 'sky' },
  { label: 'Rain', value: 'Light', tone: 'water' },
  { label: 'PM2.5', value: '18 ug/m3', tone: 'sunny' },
  { label: 'Mode', value: 'Ontology', tone: 'leaf' }
];
