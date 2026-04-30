<script setup>
import { computed, ref } from 'vue';
import OntologyPreview from './OntologyPreview.vue';
import TrainPreview from './TrainPreview.vue';
import { layers, ontologyObjects, pipelineSteps } from './mockData.js';
import { createPm25Sensor, createStationAnchor, createWeatherCell } from './voxelEntities.js';
import { MRT_TRAIN_BLUEPRINT, createMrtTrain } from './voxelTrain.js';

const routeColors = [
  { name: 'Tamsui-Xinyi', color: '#E3002C' },
  { name: 'Bannan', color: '#0070BD' },
  { name: 'Songshan-Xindian', color: '#008659' },
  { name: 'Zhonghe-Xinlu', color: '#F8B61C' },
];

const selectedRoute = ref(routeColors[0]);
const carCount = ref(4);
const debug = ref(false);

const backendSources = [
  {
    name: 'MRT LiveBoard',
    status: 'implemented backend',
    endpoint: '/api/mrt/liveboard',
    fields: ['id', 'trainCode', 'stationId', 'stationName', 'lineId', 'destinationName', 'arrivalMinutes', 'status'],
  },
  {
    name: 'PM2.5 AQMS',
    status: 'frontend-ready planned shape',
    endpoint: 'planned: EPA AQMS ingestion',
    fields: ['sensorId', 'pm25', 'trend', 'updatedAt', 'location'],
  },
  {
    name: 'Weather / Rainfall',
    status: 'frontend-ready planned shape',
    endpoint: 'planned: CWA weather ingestion',
    fields: ['cellId', 'intensityMmHr', 'trend', 'confidence', 'geometry'],
  },
];

const ontologyComponentCards = [
  {
    key: 'station',
    title: 'Station Anchor',
    type: 'Station',
    source: 'TDX MRT LiveBoard stationId',
    renderer: 'createStationAnchor()',
    fields: ['stationId', 'stationName', 'lineId', 'status'],
    build: () => createStationAnchor({ lineColor: '#0070BD', stationId: 'BL18', stationName: 'Taipei City Hall', debug: debug.value }),
  },
  {
    key: 'pm25',
    title: 'PM2.5 Sensor',
    type: 'PM2.5 Sensor',
    source: 'EPA AQMS planned ingestion',
    renderer: 'createPm25Sensor()',
    fields: ['sensorId', 'pm25', 'trend', 'updatedAt', 'location'],
    build: () => createPm25Sensor({ sensorId: 'AQMS A-07', value: 31, status: 'watch', debug: debug.value }),
  },
  {
    key: 'weather',
    title: 'Rainfall Cell',
    type: 'Weather / Rainfall Cell',
    source: 'CWA weather planned ingestion',
    renderer: 'createWeatherCell()',
    fields: ['cellId', 'intensityMmHr', 'trend', 'confidence', 'geometry'],
    build: () => createWeatherCell({ cellId: 'Rain Cell R-042', intensity: 38, trend: 'rising', debug: debug.value }),
  },
];

const tokenFamilies = [
  { name: 'Sky / Water', role: 'world background, rain, map chunk affordance', swatches: ['#78C8F8', '#D8EEF8', '#81C7D4'] },
  { name: 'Sakura / Rose', role: 'panels, city mass, selection, active state', swatches: ['#FEDFE1', '#FFD2DC', '#F596AA', '#E16B8C'] },
  { name: 'Nature / Alert', role: 'parks, safety, PM2.5, incident contrast', swatches: ['#B5CAA0', '#5DAC81', '#FFB11B', '#B481BB'] },
  { name: 'Ink / Paper', role: 'copy, borders, readable HUD surfaces', swatches: ['#2B2330', '#7F3550', '#FFF7FA'] },
];

const componentPrimitives = [
  { name: 'Floating HUD panel', category: 'surface', use: 'Left overlay cockpit, right ontology inspector, timeline dock.' },
  { name: 'Pipeline node', category: 'navigation', use: 'Shows MapLibre tiles → chunks → observations → ontology → voxel entities.' },
  { name: 'Layer pill', category: 'domain control', use: 'Turns domain overlays on/off without exposing implementation-only layers.' },
  { name: 'Object token', category: 'ontology', use: 'Switches selected object type and focuses the 3D world anchor.' },
  { name: 'Status chip', category: 'state', use: 'Live, history, focused, selected, debug, stale, or source state.' },
  { name: 'Timeline slider', category: 'temporal control', use: 'Scrubs worldTime and detaches from live mode.' },
];

const voxelModules = [
  { name: 'MRT Train', renderer: 'createMrtTrain()', source: 'TDX MRT', preview: 'Interactive Three.js preview below.' },
  { name: 'MRT Route Tube', renderer: 'TubeGeometry along curve', source: 'TDX route geometry', preview: 'Line color + raised rail.' },
  { name: 'Station Anchor', renderer: 'white voxel marker', source: 'station ontology object', preview: 'Small clickable cube at route nodes.' },
  { name: 'Rainfall Cell', renderer: 'transparent water volume', source: 'CWA rainfall observation', preview: 'Soft crystal overlay, not solid city block.' },
  { name: 'PM2.5 Haze', renderer: 'floating gold puffs + sensor poles', source: 'EPA AQMS', preview: 'Ambient exposure field.' },
  { name: 'Incident Marker', renderer: 'stacked pulsing blocks', source: 'OPS event', preview: 'Tension marker for operational events.' },
  { name: 'Tile Chunk', renderer: 'transparent tile plate', source: 'MapLibre viewport', preview: 'Diagnostic geospatial backbone.' },
  { name: 'Voxel Avatar', renderer: 'local context character', source: 'user/cursor context', preview: 'Future position-aware risk query.' },
];

const stateRules = [
  { state: 'Live', rule: 'worldTime advances, freshness chip stays active, observations remain current.' },
  { state: 'History detached', rule: 'timeline scrub pauses live truth and makes object values replay-driven.' },
  { state: 'Layer off', rule: 'all entities owned by the overlay disappear from both world and interaction hit targets.' },
  { state: 'Object selected', rule: 'right inspector changes first, then the 3D camera focuses the registered anchor.' },
  { state: 'Panel collapsed', rule: 'HUD leaves a small restore affordance and stops blocking the miniature world.' },
  { state: 'Debug overlay', rule: 'builder-local axes and module origins can appear in Design System only.' },
];

const captureSections = [
  {
    title: 'Product Shell',
    intent: '掌中世界是主角，HUD 只作為 operational controls。',
    items: ['full-screen world stage', 'left overlay cockpit', 'right ontology inspector', 'bottom timeline', 'corner world mark'],
  },
  {
    title: 'Data Pipeline',
    intent: '把資料進入世界的流程明確化，避免直接硬畫一堆 3D 物件。',
    items: pipelineSteps.map((step) => `${step.label}: ${step.detail}`),
  },
  {
    title: 'Domain Overlays',
    intent: 'Overlay 是 domain 定義，不是 renderer 名稱；renderer 由 module 決定。',
    items: layers.filter((layer) => layer.key !== 'tiles').map((layer) => `${layer.label}: ${layer.short}`),
  },
  {
    title: 'Ontology Objects',
    intent: '地圖或 voxel 上的可點擊 entity 需要回到穩定 object graph。',
    items: ontologyObjects.map((object) => `${object.type}: ${object.name}`),
  },
];

const trainSummary = computed(() => {
  const train = createMrtTrain({
    lineColor: selectedRoute.value.color,
    carCount: carCount.value,
    debug: debug.value,
  });
  return train.userData.voxelBlueprint;
});

const ontologyComponentSummaries = computed(() => ontologyComponentCards.map((card) => {
  const entity = card.build();
  return {
    ...card,
    voxelCount: entity.userData.voxelBlueprint.voxelCount,
    geometryVariants: entity.userData.voxelBlueprint.geometryVariants,
    contract: entity.userData.voxelBlueprint.backendContract,
  };
}));
</script>

<template>
  <main class="design-system-page">
    <header class="ds-header">
      <div>
        <p>TWFoundry Design System</p>
        <h1>Sakura Voxel Components</h1>
        <span>Procedural voxel art modules for the MapLibre-ready operations world.</span>
      </div>
      <a href="/" class="ds-home-link">Back to cockpit</a>
    </header>

    <section class="ds-section">
      <div class="section-title">
        <p>Pattern Capture</p>
        <h2>Current Cockpit Inventory</h2>
        <span>Extracted from the actual Sakura Voxel frontend, using the design-pattern-capture axes.</span>
      </div>
      <div class="capture-grid">
        <article v-for="section in captureSections" :key="section.title" class="capture-card">
          <h3>{{ section.title }}</h3>
          <p>{{ section.intent }}</p>
          <ul>
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="ds-grid">
      <article class="ds-panel ds-preview-panel">
        <div class="ds-panel-head">
          <div>
            <p>Component Preview</p>
            <h2>MRT Train</h2>
          </div>
          <span class="ds-chip">Three.js</span>
        </div>
        <TrainPreview :line-color="selectedRoute.color" :car-count="carCount" :debug="debug" />
      </article>

      <article class="ds-panel ds-control-panel">
        <div class="ds-panel-head">
          <div>
            <p>Controls</p>
            <h2>Parameters</h2>
          </div>
          <span class="ds-chip">Reusable builder</span>
        </div>

        <div class="ds-control-group">
          <label>Route color</label>
          <div class="route-color-grid">
            <button
              v-for="route in routeColors"
              :key="route.name"
              type="button"
              :class="{ active: route.name === selectedRoute.name }"
              @click="selectedRoute = route"
            >
              <span :style="{ background: route.color }"></span>
              {{ route.name }}
            </button>
          </div>
        </div>

        <label class="ds-slider">
          <span>Car count</span>
          <strong>{{ carCount }}</strong>
          <input v-model.number="carCount" type="range" min="1" max="6" />
        </label>

        <label class="ds-toggle">
          <input v-model="debug" type="checkbox" />
          <span>Show local axis debug overlay</span>
        </label>
      </article>

      <article class="ds-panel">
        <div class="ds-panel-head">
          <div>
            <p>Procedural SOP</p>
            <h2>Blueprint</h2>
          </div>
          <span class="ds-chip">Voxel art</span>
        </div>
        <dl class="blueprint-list">
          <div>
            <dt>Main axis</dt>
            <dd>{{ MRT_TRAIN_BLUEPRINT.mainAxis }}</dd>
          </div>
          <div>
            <dt>Local coordinate</dt>
            <dd>{{ MRT_TRAIN_BLUEPRINT.localCoordinate }}</dd>
          </div>
          <div>
            <dt>Modules</dt>
            <dd>{{ MRT_TRAIN_BLUEPRINT.modules.join(' · ') }}</dd>
          </div>
          <div>
            <dt>Repeat patterns</dt>
            <dd>{{ MRT_TRAIN_BLUEPRINT.repeatPatterns.join(' · ') }}</dd>
          </div>
        </dl>
      </article>

      <article class="ds-panel">
        <div class="ds-panel-head">
          <div>
            <p>Generated Output</p>
            <h2>Runtime Summary</h2>
          </div>
          <span class="ds-chip">Live</span>
        </div>
        <dl class="metric-list">
          <div>
            <dt>Cars</dt>
            <dd>{{ trainSummary.carCount }}</dd>
          </div>
          <div>
            <dt>Voxels</dt>
            <dd>{{ trainSummary.voxelCount }}</dd>
          </div>
          <div>
            <dt>Geometry variants</dt>
            <dd>{{ trainSummary.geometryVariants }}</dd>
          </div>
          <div>
            <dt>Line color</dt>
            <dd>{{ trainSummary.lineColor }}</dd>
          </div>
        </dl>
      </article>
    </section>

    <section class="ds-section">
      <div class="section-title">
        <p>Render Modules</p>
        <h2>Voxel Entity Catalog</h2>
        <span>Each domain object should resolve to a render module, not a hard-coded one-off mesh.</span>
      </div>
      <div class="module-grid">
        <article v-for="module in voxelModules" :key="module.name" class="module-card">
          <div>
            <h3>{{ module.name }}</h3>
            <p>{{ module.source }}</p>
          </div>
          <dl>
            <div>
              <dt>Renderer</dt>
              <dd>{{ module.renderer }}</dd>
            </div>
            <div>
              <dt>Preview note</dt>
              <dd>{{ module.preview }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <section class="ds-section">
      <div class="section-title">
        <p>Backend Coverage</p>
        <h2>Ontology Components From Data Shapes</h2>
        <span>Each backend or planned ingestion shape gets a visible voxel component so we can verify the frontend can render the object class.</span>
      </div>

      <div class="backend-source-grid">
        <article v-for="source in backendSources" :key="source.name" class="backend-source-card">
          <span>{{ source.status }}</span>
          <h3>{{ source.name }}</h3>
          <p>{{ source.endpoint }}</p>
          <small>{{ source.fields.join(' · ') }}</small>
        </article>
      </div>

      <div class="ontology-component-grid">
        <article v-for="card in ontologyComponentSummaries" :key="card.key" class="ontology-component-card">
          <div class="ds-panel-head">
            <div>
              <p>{{ card.type }}</p>
              <h2>{{ card.title }}</h2>
            </div>
            <span class="ds-chip">{{ card.source }}</span>
          </div>
          <OntologyPreview :kind="card.key" :debug="debug" />
          <dl class="metric-list compact">
            <div>
              <dt>Renderer</dt>
              <dd>{{ card.renderer }}</dd>
            </div>
            <div>
              <dt>Fields</dt>
              <dd>{{ card.fields.join(' · ') }}</dd>
            </div>
            <div>
              <dt>Voxels</dt>
              <dd>{{ card.voxelCount }}</dd>
            </div>
            <div>
              <dt>Geometry variants</dt>
              <dd>{{ card.geometryVariants }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <section class="ds-section">
      <div class="section-title">
        <p>Foundations</p>
        <h2>Tokens, Primitives, States</h2>
        <span>These are the reusable page ingredients extracted from the current cockpit UI.</span>
      </div>
      <div class="foundation-grid">
        <article class="ds-panel">
          <div class="ds-panel-head">
            <div>
              <p>Color Model</p>
              <h2>Semantic Families</h2>
            </div>
          </div>
          <div class="token-family-list">
            <div v-for="family in tokenFamilies" :key="family.name" class="token-family">
              <div class="token-swatches">
                <span v-for="swatch in family.swatches" :key="swatch" :style="{ background: swatch }"></span>
              </div>
              <strong>{{ family.name }}</strong>
              <p>{{ family.role }}</p>
            </div>
          </div>
        </article>

        <article class="ds-panel">
          <div class="ds-panel-head">
            <div>
              <p>UI Primitives</p>
              <h2>Component Roles</h2>
            </div>
          </div>
          <div class="primitive-list">
            <div v-for="primitive in componentPrimitives" :key="primitive.name">
              <span>{{ primitive.category }}</span>
              <strong>{{ primitive.name }}</strong>
              <p>{{ primitive.use }}</p>
            </div>
          </div>
        </article>

        <article class="ds-panel state-panel">
          <div class="ds-panel-head">
            <div>
              <p>State Model</p>
              <h2>Truth Rules</h2>
            </div>
          </div>
          <div class="state-list">
            <div v-for="state in stateRules" :key="state.state">
              <strong>{{ state.state }}</strong>
              <p>{{ state.rule }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
