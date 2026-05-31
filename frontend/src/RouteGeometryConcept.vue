<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  buildRouteMeasure,
  buildRouteProgressObservation,
  buildStopProgress,
  findMatchingShape,
  findMatchingStopOfRoute,
  parseLineStringGeometry,
  projectPointToRoute,
} from './busRouteGeometry.js';
import { createOperationsFromSnapshot } from './operationsWorkflowData.js';

const routeName = ref('205');
const direction = ref(0);
const routeContext = ref(null);
const sampleObservation = ref(null);
const loadError = ref('');

const viewport = {
  width: 1120,
  height: 520,
  padding: 64,
};

const routeShape = computed(() => {
  if (!routeContext.value) return null;
  return (routeContext.value.shapes ?? []).find((shape) => Number(shape.Direction) === direction.value) ?? null;
});
const routeStops = computed(() => {
  if (!routeContext.value) return null;
  return (routeContext.value.stopOfRoutes ?? []).find((route) => Number(route.Direction) === direction.value) ?? null;
});
const routePoints = computed(() => parseLineStringGeometry(routeShape.value?.Geometry));
const routeMeasure = computed(() => buildRouteMeasure(routePoints.value));
const stopProgress = computed(() => buildStopProgress(routeStops.value, routeMeasure.value));
const visibleStops = computed(() => (
  stopProgress.value
    .filter((stop) => stop.position && Number.isFinite(stop.progressMeters))
    .sort((left, right) => left.sequence - right.sequence)
));
const sampleProgress = computed(() => (
  sampleObservation.value && routeContext.value
    ? buildRouteProgressObservation(sampleObservation.value, routeContext.value)
    : null
));
const bounds = computed(() => computeBounds([
  ...routePoints.value,
  ...visibleStops.value.map((stop) => stop.position),
  sampleObservation.value
    ? [sampleObservation.value.position.longitude, sampleObservation.value.position.latitude]
    : null,
].filter(Boolean)));
const routePath = computed(() => svgPath(routePoints.value));
const stopPairs = computed(() => visibleStops.value.map((stop) => ({
  stop,
  raw: projectToSvg(stop.position),
  matched: projectToSvg(projectPointToRoute(stop.position, routeMeasure.value)?.point),
})));
const busRaw = computed(() => (
  sampleObservation.value
    ? projectToSvg([sampleObservation.value.position.longitude, sampleObservation.value.position.latitude])
    : null
));
const busMatched = computed(() => (
  sampleProgress.value
    ? projectToSvg([sampleProgress.value.matchedPosition.longitude, sampleProgress.value.matchedPosition.latitude])
    : null
));
const selectedDirectionStops = computed(() => visibleStops.value.slice(0, 7));
const routeContextSummary = computed(() => ({
  routeName: routeContext.value?.routeName ?? routeName.value,
  shapeCount: routeContext.value?.shapeCount ?? 0,
  stopOfRouteCount: routeContext.value?.stopOfRouteCount ?? 0,
  totalStops: routeStops.value?.Stops?.length ?? 0,
  routeLengthKm: routeMeasure.value.totalMeters / 1000,
}));

onMounted(async () => {
  await loadConceptData();
});

async function loadConceptData() {
  try {
    const contextResponse = await fetch(`/data/tdx-bus/route-context/${encodeURIComponent(routeName.value)}.json`);
    if (!contextResponse.ok) throw new Error(`route context HTTP ${contextResponse.status}`);
    routeContext.value = await contextResponse.json();

    const manifestResponse = await fetch('/data/tdx-bus/archive/manifest.json');
    if (!manifestResponse.ok) throw new Error(`archive manifest HTTP ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();
    const entry = [...(manifest.snapshots ?? [])].reduce((best, snapshot) => (
      Number(snapshot.count ?? 0) > Number(best?.count ?? -1) ? snapshot : best
    ), null);
    if (!entry?.path) return;

    const snapshotResponse = await fetch(entry.path);
    if (!snapshotResponse.ok) throw new Error(`snapshot HTTP ${snapshotResponse.status}`);
    const snapshot = await snapshotResponse.json();
    const observations = createOperationsFromSnapshot(snapshot, entry);
    sampleObservation.value = observations.find((observation) => (
      observation.route.name === routeName.value
      && Number(observation.route.direction) === direction.value
    )) ?? observations.find((observation) => observation.route.name === routeName.value) ?? null;
    if (sampleObservation.value) direction.value = Number(sampleObservation.value.route.direction);
  } catch (error) {
    loadError.value = error.message;
  }
}

function setDirection(nextDirection) {
  direction.value = nextDirection;
  const matched = sampleObservation.value && Number(sampleObservation.value.route.direction) === nextDirection
    ? sampleObservation.value
    : null;
  if (!matched) void reloadSampleForDirection(nextDirection);
}

async function reloadSampleForDirection(nextDirection) {
  const manifestResponse = await fetch('/data/tdx-bus/archive/manifest.json');
  const manifest = await manifestResponse.json();
  const entry = [...(manifest.snapshots ?? [])].reduce((best, snapshot) => (
    Number(snapshot.count ?? 0) > Number(best?.count ?? -1) ? snapshot : best
  ), null);
  if (!entry?.path) return;
  const snapshot = await (await fetch(entry.path)).json();
  const observations = createOperationsFromSnapshot(snapshot, entry);
  sampleObservation.value = observations.find((observation) => (
    observation.route.name === routeName.value
    && Number(observation.route.direction) === nextDirection
  )) ?? sampleObservation.value;
}

function projectToSvg(point) {
  if (!point || !bounds.value) return null;
  const { minLon, maxLon, minLat, maxLat } = bounds.value;
  const x = viewport.padding
    + ((point[0] - minLon) / Math.max(maxLon - minLon, 0.000001)) * (viewport.width - viewport.padding * 2);
  const y = viewport.height - viewport.padding
    - ((point[1] - minLat) / Math.max(maxLat - minLat, 0.000001)) * (viewport.height - viewport.padding * 2);
  return { x, y };
}

function svgPath(points) {
  return points
    .map((point, index) => {
      const projected = projectToSvg(point);
      if (!projected) return '';
      return `${index === 0 ? 'M' : 'L'} ${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
    })
    .join(' ');
}

function computeBounds(points) {
  if (!points.length) return null;
  const lons = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lonPad = Math.max((maxLon - minLon) * 0.08, 0.001);
  const latPad = Math.max((maxLat - minLat) * 0.08, 0.001);
  return {
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
  };
}

function progressPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 1000) / 10}%` : '--';
}

function meters(value) {
  return Number.isFinite(value) ? `${Math.round(value)}m` : '--';
}
</script>

<template>
  <main class="concept-page">
    <header class="topbar">
      <div>
        <div class="eyebrow">TDX Bus Geometry Concept</div>
        <h1>把站點、路線與 GPS 變成可比較的 route progress</h1>
      </div>
      <a class="nav-link" href="/">回 dashboard</a>
    </header>

    <section class="hero-grid">
      <div class="explain">
        <p>
          這頁用真實 TDX route context 示範：站點順序來自 StopOfRoute，
          route 線來自 Shape，公車 GPS 與站點都會投影到同一條線上。
        </p>
        <div class="step-row">
          <span>1. 讀站序</span>
          <span>2. 投影到線</span>
          <span>3. 算累積距離</span>
          <span>4. 比較延遲</span>
        </div>
      </div>
      <div class="summary">
        <div><span>route</span><strong>{{ routeContextSummary.routeName }}</strong></div>
        <div><span>direction</span><strong>{{ direction }}</strong></div>
        <div><span>stops</span><strong>{{ routeContextSummary.totalStops }}</strong></div>
        <div><span>length</span><strong>{{ routeContextSummary.routeLengthKm.toFixed(1) }}km</strong></div>
      </div>
    </section>

    <section v-if="loadError" class="panel warning">{{ loadError }}</section>

    <section class="panel visual-panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">Visual Model</div>
          <h2>紅點是原始站點，藍點是投影後的路線位置</h2>
        </div>
        <div class="segmented">
          <button type="button" :class="{ active: direction === 0 }" @click="setDirection(0)">Direction 0</button>
          <button type="button" :class="{ active: direction === 1 }" @click="setDirection(1)">Direction 1</button>
        </div>
      </div>

      <svg
        class="route-svg"
        :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
        role="img"
        aria-label="route geometry projection demo"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path class="route-shadow" :d="routePath" />
        <path class="route-line" :d="routePath" />

        <g v-for="pair in stopPairs" :key="pair.stop.stopUID">
          <line
            v-if="pair.raw && pair.matched"
            class="projection-line"
            :x1="pair.raw.x"
            :y1="pair.raw.y"
            :x2="pair.matched.x"
            :y2="pair.matched.y"
          />
          <circle v-if="pair.raw" class="raw-stop" :cx="pair.raw.x" :cy="pair.raw.y" r="4.5" />
          <circle v-if="pair.matched" class="matched-stop" :cx="pair.matched.x" :cy="pair.matched.y" r="3.2" />
          <text
            v-if="pair.matched && pair.stop.sequence <= 4"
            class="stop-label"
            :x="pair.matched.x + 8"
            :y="pair.matched.y - 8"
          >{{ pair.stop.sequence }} {{ pair.stop.name }}</text>
        </g>

        <g v-if="busRaw && busMatched">
          <line class="bus-projection" :x1="busRaw.x" :y1="busRaw.y" :x2="busMatched.x" :y2="busMatched.y" />
          <circle class="bus-raw" :cx="busRaw.x" :cy="busRaw.y" r="8" />
          <circle class="bus-matched" :cx="busMatched.x" :cy="busMatched.y" r="10" />
          <text class="bus-label" :x="busMatched.x + 14" :y="busMatched.y - 12">
            {{ sampleObservation?.id }} / {{ progressPercent(sampleProgress?.progressRatio) }}
          </text>
        </g>
      </svg>

      <div class="legend">
        <span><b class="line-key"></b>Route Shape</span>
        <span><b class="raw-key"></b>原始站點</span>
        <span><b class="matched-key"></b>投影後站點</span>
        <span><b class="bus-key"></b>公車投影</span>
      </div>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="eyebrow">Stop Sequence</div>
        <h2>站點順序是 TDX 給的，不是我們猜的</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>站名</th>
              <th>投影進度</th>
              <th>離 route</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stop in selectedDirectionStops" :key="stop.stopUID">
              <td>{{ stop.sequence }}</td>
              <td>{{ stop.name }}</td>
              <td>{{ progressPercent(stop.progressRatio) }}</td>
              <td>{{ meters(stop.distanceToRouteMeters) }}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="panel">
        <div class="eyebrow">Map Matching</div>
        <h2>GPS 先對到 route 上，再拿進度比較</h2>
        <div class="metric-list">
          <div><span>Plate</span><strong>{{ sampleObservation?.id ?? '--' }}</strong></div>
          <div><span>Progress</span><strong>{{ progressPercent(sampleProgress?.progressRatio) }}</strong></div>
          <div><span>Distance to route</span><strong>{{ meters(sampleProgress?.distanceToRouteMeters) }}</strong></div>
          <div><span>Nearest stop</span><strong>{{ sampleProgress?.nearestStop?.name ?? '--' }}</strong></div>
          <div><span>Between stops</span><strong>{{ sampleProgress?.betweenStops?.betweenLabel ?? '--' }}</strong></div>
        </div>
      </article>

      <article class="panel wide">
        <div class="eyebrow">Delay Signal</div>
        <h2>延遲不是比經緯度，是比 route progress</h2>
        <div class="formula">
          <span>today progress</span>
          <b>{{ progressPercent(sampleProgress?.progressRatio) }}</b>
          <span>vs</span>
          <b>multi-day baseline progress</b>
          <span>= possible delay signal</span>
        </div>
        <p>
          如果車輛離 route 太遠，這筆 projection 會被標成低可信度，不應直接用來判斷延遲。
        </p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.concept-page {
  min-height: 100%;
  padding: 26px;
  background:
    radial-gradient(circle at 20% 8%, rgba(17, 100, 129, 0.2), transparent 30%),
    #060a12;
  color: #e5f2fb;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
}

.topbar,
.hero-grid,
.panel-head,
.step-row,
.summary,
.legend,
.formula {
  display: flex;
  align-items: center;
}

.topbar {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.eyebrow {
  color: #8fa7ba;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  max-width: 900px;
  margin-top: 8px;
  font-size: clamp(34px, 5vw, 68px);
  line-height: 0.98;
  letter-spacing: 0;
}

h2 {
  margin-top: 6px;
  font-size: 20px;
  letter-spacing: 0;
}

p {
  color: #aebfcc;
  font-size: 15px;
  line-height: 1.6;
}

.nav-link,
button {
  border: 1px solid rgba(128, 154, 180, 0.32);
  border-radius: 8px;
  background: rgba(12, 22, 34, 0.78);
  color: #dcecf7;
  text-decoration: none;
}

.nav-link {
  padding: 10px 12px;
}

.hero-grid {
  align-items: stretch;
  gap: 16px;
  margin-bottom: 16px;
}

.explain,
.summary,
.panel {
  border: 1px solid rgba(128, 154, 180, 0.22);
  border-radius: 10px;
  background: rgba(9, 17, 27, 0.84);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.26);
}

.explain {
  flex: 1;
  padding: 18px;
}

.step-row {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.step-row span,
.legend span,
.formula span,
.formula b {
  padding: 8px 10px;
  border: 1px solid rgba(128, 154, 180, 0.22);
  border-radius: 999px;
  background: rgba(18, 31, 46, 0.74);
  color: #bfd0dc;
  font-size: 13px;
}

.summary {
  width: 320px;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px;
}

.summary div,
.metric-list div {
  min-width: 130px;
  display: grid;
  gap: 4px;
}

.summary span,
.metric-list span {
  color: #8fa7ba;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.summary strong,
.metric-list strong {
  font-size: 20px;
}

.panel {
  padding: 16px;
}

.warning {
  margin-bottom: 16px;
  border-color: rgba(244, 165, 96, 0.42);
  color: #ffd29c;
}

.visual-panel {
  margin-bottom: 16px;
  padding-bottom: 12px;
}

.panel-head {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.segmented {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(128, 154, 180, 0.24);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
}

button {
  height: 34px;
  padding: 0 12px;
  cursor: pointer;
}

button.active {
  border-color: rgba(20, 196, 226, 0.7);
  background: rgba(17, 101, 126, 0.72);
}

.route-svg {
  display: block;
  width: 100%;
  height: auto;
  min-height: 420px;
  border-radius: 10px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px),
    radial-gradient(circle at 50% 46%, rgba(23, 52, 74, 0.42), transparent 44%),
    #07101a;
  background-size: 46px 46px, 46px 46px, auto, auto;
}

.route-shadow {
  fill: none;
  stroke: rgba(124, 151, 184, 0.16);
  stroke-width: 12;
}

.route-line {
  fill: none;
  stroke: #d4e4ff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4.5;
  filter: url("#glow");
}

.projection-line,
.bus-projection {
  stroke-dasharray: 4 5;
  stroke-width: 1.2;
}

.projection-line {
  stroke: rgba(255, 112, 96, 0.56);
}

.bus-projection {
  stroke: rgba(255, 211, 89, 0.76);
  stroke-width: 2;
}

.raw-stop {
  fill: #ff5b4f;
  stroke: #ffd7d0;
  stroke-width: 1.5;
}

.matched-stop {
  fill: #18c6dd;
  stroke: #d8fbff;
  stroke-width: 1.2;
}

.bus-raw {
  fill: rgba(255, 216, 86, 0.42);
  stroke: #ffd94f;
  stroke-width: 2;
}

.bus-matched {
  fill: #ffd052;
  stroke: white;
  stroke-width: 2;
}

.stop-label,
.bus-label {
  fill: #e7f4ff;
  paint-order: stroke;
  stroke: #07101a;
  stroke-width: 4px;
  font: 13px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.bus-label {
  font-weight: 700;
}

.legend {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.legend b {
  width: 12px;
  height: 12px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 50%;
  vertical-align: -1px;
}

.line-key {
  background: #d4e4ff;
}

.raw-key {
  background: #ff5b4f;
}

.matched-key {
  background: #18c6dd;
}

.bus-key {
  background: #ffd052;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 16px;
}

.wide {
  grid-column: 1 / -1;
}

table {
  width: 100%;
  margin-top: 14px;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 8px;
  border-top: 1px solid rgba(128, 154, 180, 0.18);
  text-align: left;
}

th {
  color: #8fa7ba;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
}

td {
  color: #dcecf7;
  font-size: 14px;
}

.metric-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.formula {
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.formula b {
  color: #fff;
  background: rgba(17, 101, 126, 0.78);
}

@media (max-width: 820px) {
  .concept-page {
    padding: 16px;
  }

  .hero-grid,
  .grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .summary {
    width: auto;
  }

  .panel-head,
  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
