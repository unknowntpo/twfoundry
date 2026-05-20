export const pipelineSteps = [
  {
    key: 'tiles',
    label: 'MapLibre map',
    short: 'map',
    detail: 'Zhongshan Station focus',
    countLabel: 'interactive',
  },
  {
    key: 'places',
    label: 'map places',
    short: 'places',
    detail: 'map feature catalog',
    countLabel: '1 focus',
  },
  {
    key: 'observations',
    label: 'observations',
    short: 'obs',
    detail: 'TDX + weather rows',
    countLabel: '128 rows',
  },
  {
    key: 'ontology',
    label: 'ontology objects',
    short: 'objects',
    detail: 'stable object graph',
    countLabel: '22 objects',
  },
  {
    key: 'detail',
    label: 'detail modules',
    short: 'detail',
    detail: 'selected object renderer',
    countLabel: 'object-driven',
  },
];

export const layers = overlayLayerControls;

export const ontologyObjects = [
  {
    id: 'train-R22',
    name: 'Train R22',
    type: 'Train',
    layer: 'TDX MRT',
    status: 'live',
    freshness: '12s ago',
    summary: '淡水信義線南向列車，接近中山站。',
    properties: ['route: Tamsui-Xinyi', 'next_stop: Zhongshan', 'load: 67%', 'eta: 2 min'],
    relationships: ['belongs_to Route R', 'near Rain Cell R-042', 'affected_by Incident I-237'],
  },
  {
    id: 'station-R11-G14',
    name: 'Zhongshan Station',
    type: 'Station',
    layer: 'TDX MRT',
    status: 'normal',
    freshness: '34s ago',
    summary: '淡水信義線 / 松山新店線交會的中山站，作為南西商圈地圖情報焦點。',
    properties: ['stationId: R11/G14', 'platform_load: medium', 'area: Nanxi', 'transfers: 1'],
    relationships: ['observed_by TDX station feed', 'serves Train R22', 'inside Zhongshan Station focus'],
  },
  {
    id: 'rain-R042',
    name: 'Rain Cell R-042',
    type: 'Rainfall Cell',
    layer: 'Weather',
    status: 'intense',
    freshness: '48s ago',
    summary: '士林至中山北側短時雨量上升，投影成地圖上的降雨情報範圍。',
    properties: ['intensity: 38 mm/h', 'confidence: 0.82', 'source: CWA mock', 'trend: rising'],
    relationships: ['covers Zhongshan Station focus', 'affects Train R22', 'near AQMS A-07'],
  },
  {
    id: 'aq-A07',
    name: 'AQMS A-07',
    type: 'PM2.5 Sensor',
    layer: 'Air Quality',
    status: 'watch',
    freshness: '1m ago',
    summary: 'PM2.5 偏高，以金色/櫻色 haze 顯示局部暴露。',
    properties: ['pm2.5: 31 ug/m3', 'trend: flat', 'exposure: medium', 'source: EPA mock'],
    relationships: ['observes Risk Zone Z-02', 'near Zhongshan Station', 'inside Zhongshan Station focus'],
  },
  {
    id: 'incident-I237',
    name: 'Incident I-237',
    type: 'Incident',
    layer: 'Incident',
    status: 'open',
    freshness: '2m ago',
    summary: '路口施工回堵，對鄰近車站與路線產生低強度風險。',
    properties: ['severity: medium', 'kind: road work', 'radius: 600m', 'action: watch route impact'],
    relationships: ['near Zhongshan Station', 'affects Route R', 'coincident_with Rain Cell R-042'],
  },
];

export const defaultObject = ontologyObjects.find((object) => object.type === 'Station') ?? ontologyObjects[0];
import { overlayLayerControls } from './overlayRegistry.js';
