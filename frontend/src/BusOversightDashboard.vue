<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  buildBusOversightModel,
  buildRouteSchematic,
} from './busOversightData.js';
import { BUS_RELIABILITY_SIGNAL_TYPES } from './busReliabilitySignals.js';
import { SUPPORTED_LOCALES, locale, setLocale, t } from './i18n.js';

const analytics = ref({
  bunching: null,
  freshness: null,
  density: null,
});
const analyticsManifest = ref(null);
const liveSignalBundle = ref({
  status: 'waiting_for_flink',
  generatedAt: null,
  latestSlotKey: null,
  signals: [],
});
const liveSignalError = ref('');
const routeContext = ref(null);
const selectedRouteName = ref(null);
const selectedSlotIndex = ref(null);
const timelineMode = ref('network');
const hoveredSlotIndex = ref(null);
const hoverLeft = ref(0);
const focusedProblemId = ref(null);
const isPlaying = ref(false);
const isLoadingRoute = ref(false);
let playTimer = null;
let liveSignalTimer = null;

const model = computed(() => buildBusOversightModel({
  bunching: analytics.value.bunching,
  freshness: analytics.value.freshness,
  density: analytics.value.density,
  selectedRouteName: selectedRouteName.value,
  selectedSlotIndex: selectedSlotIndex.value,
}));

const currentSlotIndex = computed(() => model.value.activeSlotIndex);
const currentSlot = computed(() => model.value.activeSlot);
const selectedRoute = computed(() => model.value.selectedRoute);
const activeEvents = computed(() => model.value.activeEvents);
const isLive = computed(() => currentSlotIndex.value === model.value.liveIndex);
const dataModeLabel = computed(() => t('oversight.batchSnapshot'));
const dataModeDetail = computed(() => {
  const publishedAt = analyticsManifest.value?.publishedAt;
  if (!publishedAt) return t('oversight.batchSource');
  return t('oversight.batchSourcePublished', { time: formatPublishedAt(publishedAt) });
});
const recentLiveSignals = computed(() => (
  Array.isArray(liveSignalBundle.value.signals) ? liveSignalBundle.value.signals : []
));
const liveSignalStatusLabel = computed(() => {
  if (liveSignalError.value) return t('oversight.liveSignals.unavailable');
  if (recentLiveSignals.value.length > 0) return t('oversight.liveSignals.count', { count: recentLiveSignals.value.length });
  return t('oversight.liveSignals.waiting');
});

// Live counts for the current slot from the speed-layer bundle (the batch KPIs are a frozen
// snapshot). When present, they drive the gap/bunching KPI cards so those reflect "now".
const liveCounts = computed(() => {
  const bundle = liveSignalBundle.value;
  const counts = bundle?.counts;
  if (!counts || (counts.gap == null && counts.bunching == null)) return null;
  const slotKey = bundle.latestSlotKey ?? '';
  return {
    gap: counts.gap ?? 0,
    bunching: counts.bunching ?? 0,
    time: slotKey.length >= 16 ? slotKey.slice(11, 16) : '',
  };
});

const schematic = computed(() => buildRouteSchematic(routeContext.value, {
  routeName: selectedRoute.value?.routeName ?? '',
  direction: selectedRoute.value?.direction ?? null,
  events: activeEvents.value,
  locale: locale.value,
}));

const routeTitle = computed(() => {
  if (!selectedRoute.value) return t('oversight.map.unavailable');
  const origin = schematic.value.origin;
  const destination = schematic.value.destination;
  return origin && destination
    ? `${selectedRoute.value.routeName} · ${origin} → ${destination}`
    : selectedRoute.value.routeName;
});

const timelineTitle = computed(() => (
  timelineMode.value === 'network'
    ? t('oversight.timeline.networkTitle')
    : t('oversight.timeline.routeTitle', { route: selectedRoute.value?.routeName ?? '—' })
));

const dayGroups = computed(() => {
  const seen = new Map();
  model.value.timeline.forEach((slot) => {
    if (!seen.has(slot.date)) {
      seen.set(slot.date, {
        date: slot.date,
        weekday: slot.weekday,
        isToday: slot.date === model.value.serviceDate,
      });
    }
  });
  return Array.from(seen.values());
});

const kpiCards = computed(() => {
  const kpis = model.value.kpis;
  return [
    {
      key: 'reliability',
      primary: true,
      live: false,
      label: t('oversight.kpi.reliability'),
      info: t('oversight.kpi.reliability.info'),
      value: kpis.reliability ?? '—',
      ring: kpis.reliability ?? 0,
      delta: formatDelta(kpis.deltas.reliability, false),
    },
    {
      key: 'routes',
      live: false,
      label: t('oversight.kpi.routes'),
      info: t('oversight.kpi.routes.info'),
      value: kpis.routes,
      delta: formatDelta(kpis.deltas.routes, true),
    },
    {
      key: 'serviceGaps',
      tone: 'critical',
      live: true,
      label: t('oversight.kpi.serviceGaps'),
      info: t('oversight.kpi.serviceGaps.info'),
      value: liveCounts.value ? liveCounts.value.gap : kpis.serviceGaps,
      delta: liveCounts.value
        ? { text: t('oversight.kpi.liveAsOf', { time: liveCounts.value.time }), tone: 'live' }
        : formatDelta(kpis.deltas.serviceGaps, true),
    },
    {
      key: 'bunching',
      tone: 'warning',
      live: true,
      label: t('oversight.kpi.bunching'),
      info: t('oversight.kpi.bunching.info'),
      value: liveCounts.value ? liveCounts.value.bunching : kpis.bunching,
      delta: liveCounts.value
        ? { text: t('oversight.kpi.liveAsOf', { time: liveCounts.value.time }), tone: 'live' }
        : formatDelta(kpis.deltas.bunching, true),
    },
    {
      key: 'lowCapacity',
      tone: 'watch',
      live: false,
      label: t('oversight.kpi.lowCapacity'),
      info: t('oversight.kpi.lowCapacity.info'),
      value: kpis.lowCapacity,
      delta: formatDelta(kpis.deltas.lowCapacity, true),
    },
  ];
});

onMounted(() => {
  loadAnalytics();
  loadLiveSignals();
  liveSignalTimer = window.setInterval(loadLiveSignals, 30_000);
});

onUnmounted(() => {
  stopPlayback();
  if (liveSignalTimer) window.clearInterval(liveSignalTimer);
});

watch(() => model.value.watchlist, (watchlist) => {
  if (!selectedRouteName.value && watchlist[0]) selectedRouteName.value = watchlist[0].routeName;
}, { immediate: true });

watch(() => selectedRoute.value?.routeName, async (routeName) => {
  if (!routeName) {
    routeContext.value = null;
    return;
  }
  await loadRouteContext(routeName);
}, { immediate: true });

async function loadAnalytics() {
  try {
    const [manifest, bunching, freshness, density] = await Promise.all([
      fetchJson('/data/analytics/bus/manifest.json'),
      fetchJson('/data/analytics/bus/bunching.json'),
      fetchJson('/data/analytics/bus/data-freshness.json'),
      fetchJson('/data/analytics/bus/route-density.json'),
    ]);
    analyticsManifest.value = manifest;
    analytics.value = { bunching, freshness, density };
  } catch (error) {
    console.warn('Unable to load bus oversight data', error);
  }
}

async function loadRouteContext(routeName) {
  isLoadingRoute.value = true;
  try {
    routeContext.value = await fetchJson(`/data/tdx-bus/route-context/${encodeURIComponent(encodeURIComponent(routeName))}.json`);
  } catch (error) {
    console.warn('Unable to load route shape', error);
    routeContext.value = null;
  } finally {
    isLoadingRoute.value = false;
  }
}

async function loadLiveSignals() {
  try {
    liveSignalError.value = '';
    liveSignalBundle.value = await fetchJson(liveSignalPath());
  } catch (error) {
    liveSignalError.value = error.message;
  }
}

function liveSignalPath() {
  if (isLocalHost()) return '/data/online/bus-route-signals/latest.json';
  return '/api/online/bus-route-signals?limit=8';
}

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`request failed ${response.status}`);
  return response.json();
}

function selectSlot(index) {
  selectedSlotIndex.value = Number(index);
}

function stepSlot(delta) {
  selectSlot(Math.max(0, Math.min(model.value.timeline.length - 1, currentSlotIndex.value + delta)));
}

function selectRoute(routeName) {
  selectedRouteName.value = routeName;
  timelineMode.value = 'route';
}

function backToLive() {
  selectSlot(model.value.liveIndex);
}

function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback();
    return;
  }
  isPlaying.value = true;
  playTimer = setInterval(() => {
    if (currentSlotIndex.value >= model.value.timeline.length - 1) {
      stopPlayback();
      return;
    }
    stepSlot(1);
  }, 650);
}

function stopPlayback() {
  isPlaying.value = false;
  if (playTimer) clearInterval(playTimer);
  playTimer = null;
}

function updateTimelineHover(event) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  hoverLeft.value = ratio * 100;
  hoveredSlotIndex.value = Math.round(ratio * Math.max(0, model.value.timeline.length - 1));
}

function clearTimelineHover() {
  hoveredSlotIndex.value = null;
}

function severityForSlot(slot) {
  if (timelineMode.value === 'route' && selectedRoute.value) {
    const routeEvents = slot.events.filter((event) => event.routeName === selectedRoute.value.routeName);
    return maxSeverity(routeEvents);
  }
  return slot.severity;
}

function slotHeight(slot, index) {
  const severity = severityForSlot(slot);
  const base = { normal: 24, watch: 44, warning: 62, critical: 82 }[severity] ?? 24;
  return `${Math.min(96, base + (index % 3) * 3)}%`;
}

function slotTitle(slot) {
  const status = slot.hasData
    ? t(`oversight.severity.${severityForSlot(slot)}`)
    : t('oversight.timeline.empty');
  return `${formatSlot(slot)} · ${status}`;
}

function formatSlot(slot = currentSlot.value) {
  if (!slot) return '—';
  return `${slot.date} ${t(`oversight.weekday.${slot.weekday}`)} ${String(slot.hour).padStart(2, '0')}:00`;
}

function formatDay(day) {
  return `${day.date.slice(5)} ${t(`oversight.weekday.${day.weekday}`)}`;
}

function formatDelta(value, higherIsBad) {
  if (value === null || value === undefined) {
    return { text: `${t('oversight.noDelta')} ${t('oversight.vsYesterday')}`, tone: 'flat' };
  }
  if (value === 0) {
    return { text: `${t('oversight.noDelta')} ${t('oversight.vsYesterday')}`, tone: 'flat' };
  }
  const up = value > 0;
  return {
    text: `${up ? '▲' : '▼'} ${Math.abs(value)} ${t('oversight.vsYesterday')}`,
    tone: up === higherIsBad ? 'bad' : 'good',
  };
}

function formatWatchMetric(route) {
  if (route.counts?.[BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP]) {
    return `${route.counts[BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP]} ${t('oversight.signal.service_gap')}`;
  }
  if (route.counts?.[BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING]) {
    return `${route.counts[BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING]} ${t('oversight.signal.bunching')}`;
  }
  if (route.counts?.[BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY]) {
    return `${route.counts[BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY]} ${t('oversight.signal.low_capacity')}`;
  }
  return route.metric || '—';
}

function problemWhere(event) {
  const from = pointAtProgress(event.progressStart)?.name ?? schematic.value.origin;
  const to = pointAtProgress(event.progressEnd)?.name ?? schematic.value.destination;
  return t('oversight.problem.where', { from, to });
}

function pointAtProgress(progress) {
  const points = schematic.value.points;
  if (points.length === 0) return null;
  const index = Math.max(0, Math.min(points.length - 1, Math.round(progress * (points.length - 1))));
  return points[index];
}

function problemMetric(event) {
  if (event.type === BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP) {
    return t('oversight.problem.serviceGapMetric', {
      minutes: formatNumber(event.observedHeadwayMinutes, 1),
    });
  }
  if (event.type === BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING) {
    return t('oversight.problem.bunchingMetric', {
      ratio: formatNumber(event.progressGapRatio, 2),
    });
  }
  if (event.sourceKind === 'freshness') {
    return t('oversight.problem.qualityMetric', {
      rate: Math.round((Number(event.offRouteRate) || 0) * 100),
    });
  }
  return t('oversight.problem.lowCapacityMetric', {
    vehicles: formatNumber(event.activeVehicles, 0),
    speed: formatNumber(event.avgSpeedKph, 1),
  });
}

function signalTypeLabel(signal) {
  if (signal.type === 'suspected_gap') return t('oversight.signal.service_gap');
  if (signal.type === 'suspected_bunching') return t('oversight.signal.bunching');
  return signal.type ?? t('oversight.liveSignals.signal');
}

function signalMetric(signal) {
  const minutes = Number(signal.headway_min_est);
  if (Number.isFinite(minutes)) {
    return t('oversight.liveSignals.headway', { minutes: formatNumber(minutes, 1) });
  }
  return signal.slot_key ?? liveSignalBundle.value.latestSlotKey ?? '—';
}

function shouldShowStopLabel(point) {
  const points = schematic.value.points;
  if (point.index === 0 || point.index === points.length - 1) return true;
  const affected = activeEvents.value.some((event) => (
    Math.abs(point.progress - event.progressStart) < 0.04
    || Math.abs(point.progress - event.progressEnd) < 0.04
  ));
  if (affected) return true;
  const stride = Math.max(2, Math.ceil(points.length / 9));
  return point.index % stride === 0;
}

function stopLabelAttrs(point) {
  const alignRight = point.x < 190;
  const alignLeft = point.x > 750;
  if (alignRight) {
    return {
      x: point.x + 14,
      y: point.y + 4,
      anchor: 'start',
    };
  }
  if (alignLeft) {
    return {
      x: point.x - 14,
      y: point.y + 4,
      anchor: 'end',
    };
  }
  return {
    x: point.x,
    y: point.y - 14,
    anchor: 'middle',
  };
}

function segmentTone(type) {
  if (type === BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP) return 'critical';
  if (type === BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING) return 'warning';
  return 'watch';
}

function stopRing(point) {
  const event = activeEvents.value.find((candidate) => (
    Math.abs(point.progress - candidate.progressStart) < 0.04
    || Math.abs(point.progress - candidate.progressEnd) < 0.04
  ));
  return event ? segmentTone(event.type) : null;
}

function focusProblem(eventId) {
  focusedProblemId.value = eventId;
}

function maxSeverity(events) {
  return events.reduce((severity, event) => (
    severityRank(event.severity) > severityRank(severity) ? event.severity : severity
  ), 'normal');
}

function severityRank(severity) {
  return { normal: 0, watch: 1, warning: 2, critical: 3 }[severity] ?? 0;
}

function formatNumber(value, digits) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return number.toFixed(digits).replace(/\.0$/, '');
}

function formatPublishedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale.value === 'zh-TW' ? 'zh-TW' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <main class="oversight-shell">
    <header class="topbar">
      <div>
        <div class="brand-kicker">{{ t('oversight.brandKicker') }}</div>
        <h1 class="brand-title">
          {{ t('oversight.brandPre') }}<span>{{ t('oversight.brandAccent') }}</span>
        </h1>
      </div>
      <div class="topbar-actions">
        <span class="day-pill data-mode-pill" :title="dataModeDetail">
          {{ dataModeLabel }}
        </span>
        <span class="day-pill">
          {{ currentSlot ? t('oversight.serviceDate', { date: currentSlot.date }) : t('oversight.noDate') }}
        </span>
        <div class="locale-switch" :aria-label="t('app.language')">
          <button
            v-for="option in SUPPORTED_LOCALES"
            :key="option.code"
            type="button"
            :class="{ active: locale === option.code }"
            @click="setLocale(option.code)"
          >
            {{ option.code === 'zh-TW' ? '中' : option.label }}
          </button>
        </div>
      </div>
    </header>

    <section class="kpi-band" aria-label="service summary">
      <article
        v-for="card in kpiCards"
        :key="card.key"
        class="kpi"
        :class="[{ primary: card.primary, 'is-live': card.live }, card.tone ? `tone-${card.tone}` : '']"
      >
        <div class="kpi-top">
          <span class="kpi-headline">
            <span class="kpi-label">{{ card.label }}</span>
            <span class="kpi-source" :class="card.live ? 'live' : 'batch'">
              <span v-if="card.live" class="kpi-source-dot"></span>{{ card.live ? t('oversight.kpi.liveSource') : t('oversight.kpi.batchSource') }}
            </span>
          </span>
          <button class="kpi-i" type="button" :aria-label="t('oversight.info')">
            i
            <span class="kpi-pop">{{ card.info }}</span>
          </button>
        </div>
        <div class="kpi-value">
          <div v-if="card.primary" class="ring" :style="{ '--p': card.ring }">
            {{ card.value }}
          </div>
          <strong>{{ card.value }}</strong>
          <span class="kpi-delta" :class="card.delta.tone">{{ card.delta.text }}</span>
        </div>
      </article>
    </section>

    <section class="panel timeline-panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">{{ t('oversight.timeline.eyebrow') }}</div>
          <h2>{{ timelineTitle }}</h2>
        </div>
        <div class="seg-toggle" role="tablist">
          <button
            type="button"
            :class="{ active: timelineMode === 'network' }"
            @click="timelineMode = 'network'"
          >
            {{ t('oversight.mode.network') }}
          </button>
          <button
            type="button"
            :class="{ active: timelineMode === 'route' }"
            @click="timelineMode = 'route'"
          >
            {{ t('oversight.mode.route') }}
          </button>
        </div>
      </div>

      <div class="tl-statusrow">
        <span class="tl-bigtime">{{ formatSlot() }}</span>
        <span class="live-pill history" :title="dataModeDetail">
          <span class="live-dot"></span>
          {{ isLive ? t('oversight.latestSnapshot') : t('oversight.history') }}
        </span>
      </div>

      <div class="tl-strip">
        <button
          v-for="(slot, index) in model.timeline"
          :key="slot.key"
          type="button"
          class="tl-cell"
          :class="[
            `sev-${severityForSlot(slot)}`,
            { active: index === currentSlotIndex, 'day-sep': slot.hour === 0 && index > 0, empty: !slot.hasData },
          ]"
          :style="{ height: slotHeight(slot, index) }"
          :title="slotTitle(slot)"
          @click="selectSlot(index)"
        ></button>
      </div>

      <div class="tl-track" @mousemove="updateTimelineHover" @mouseleave="clearTimelineHover">
        <div class="rail"></div>
        <div
          class="tl-fill"
          :style="{ width: `${model.timeline.length <= 1 ? 0 : (currentSlotIndex / (model.timeline.length - 1)) * 100}%` }"
        ></div>
        <div
          class="tl-now"
          :style="{ left: `${model.timeline.length <= 1 ? 0 : (model.liveIndex / (model.timeline.length - 1)) * 100}%` }"
        ></div>
        <input
          class="tl-slider"
          type="range"
          min="0"
          :max="Math.max(0, model.timeline.length - 1)"
          :value="currentSlotIndex"
          :aria-label="t('oversight.timeline.select')"
          @input="selectSlot($event.target.value)"
        />
        <div
          class="tl-hover"
          :class="{ visible: hoveredSlotIndex !== null }"
          :style="{ left: `${hoverLeft}%` }"
        >
          {{ hoveredSlotIndex !== null ? formatSlot(model.timeline[hoveredSlotIndex]) : '' }}
        </div>
      </div>

      <div class="tl-days">
        <span v-for="day in dayGroups" :key="day.date" :class="{ today: day.isToday }">
          {{ formatDay(day) }}
        </span>
      </div>

      <div class="tl-actions">
        <button class="tl-btn" type="button" :aria-label="t('oversight.timeline.previous')" :disabled="currentSlotIndex <= 0" @click="stepSlot(-1)">‹</button>
        <button class="tl-btn primary" type="button" :aria-label="isPlaying ? t('oversight.timeline.pause') : t('oversight.timeline.play')" @click="togglePlayback">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <button class="tl-btn" type="button" :aria-label="t('oversight.timeline.next')" :disabled="currentSlotIndex >= model.timeline.length - 1" @click="stepSlot(1)">›</button>
        <button class="btn compact" type="button" @click="backToLive">{{ t('oversight.backToLatestSnapshot') }}</button>
      </div>

      <div class="legend">
        <span><b class="swatch ok"></b>{{ t('oversight.severity.normal') }}</span>
        <span><b class="swatch watch"></b>{{ t('oversight.severity.watch') }}</span>
        <span><b class="swatch warning"></b>{{ t('oversight.severity.warning') }}</span>
        <span><b class="swatch critical"></b>{{ t('oversight.severity.critical') }}</span>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel route-panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">{{ t('oversight.map.eyebrow') }}</div>
            <h2>{{ routeTitle }}</h2>
          </div>
          <span class="live-pill history" :title="dataModeDetail">
            <span class="live-dot"></span>
            {{ isLive ? t('oversight.latestSnapshot') : t('oversight.history') }} {{ currentSlot ? `${currentSlot.date} ${String(currentSlot.hour).padStart(2, '0')}:00` : '' }}
          </span>
        </div>

        <div class="map-wrap">
          <svg class="routemap" viewBox="0 0 940 600" role="img" :aria-label="routeTitle">
            <g>
              <line
                v-for="segment in schematic.segments"
                :key="`base-${segment.index}`"
                class="seg base"
                :x1="segment.from.x"
                :y1="segment.from.y"
                :x2="segment.to.x"
                :y2="segment.to.y"
              />
              <line
                v-for="segment in schematic.problemSegments"
                :key="`${segment.eventId}-${segment.segmentIndex}`"
                class="seg problem"
                :class="[
                  `sev-${segmentTone(segment.type)}`,
                  { pulse: focusedProblemId === segment.eventId },
                ]"
                :x1="schematic.segments[segment.segmentIndex]?.from.x"
                :y1="schematic.segments[segment.segmentIndex]?.from.y"
                :x2="schematic.segments[segment.segmentIndex]?.to.x"
                :y2="schematic.segments[segment.segmentIndex]?.to.y"
              />
            </g>
            <g>
              <rect
                v-for="vehicle in schematic.vehicles"
                :key="`${vehicle.eventId}-${vehicle.className}-${vehicle.x}-${vehicle.y}`"
                class="veh"
                :class="vehicle.className"
                :x="vehicle.x - 7"
                :y="vehicle.y - 7"
                width="14"
                height="14"
                rx="4"
              />
            </g>
            <g>
              <template v-for="point in schematic.points" :key="`stop-${point.index}`">
                <circle
                  class="stop-dot"
                  :class="[
                    { terminal: point.index === 0 || point.index === schematic.points.length - 1 },
                    stopRing(point) ? `ring-${stopRing(point)}` : '',
                  ]"
                  :cx="point.x"
                  :cy="point.y"
                  :r="point.index === 0 || point.index === schematic.points.length - 1 ? 8 : 6"
                />
                <text
                  v-if="shouldShowStopLabel(point)"
                  class="stop-label"
                  :x="stopLabelAttrs(point).x"
                  :y="stopLabelAttrs(point).y"
                  :text-anchor="stopLabelAttrs(point).anchor"
                >
                  {{ point.name }}
                </text>
              </template>
              <text v-if="isLoadingRoute" class="map-empty" x="470" y="60">{{ t('oversight.map.loading') }}</text>
              <text v-else-if="schematic.points.length === 0" class="map-empty" x="470" y="60">{{ t('oversight.map.unavailable') }}</text>
              <text v-else-if="activeEvents.length === 0" class="map-empty" x="470" y="60">{{ t('oversight.map.empty') }}</text>
            </g>
            <g>
              <g
                v-for="pin in schematic.pins"
                :key="pin.eventId"
                class="pin"
                :class="[activeEvents[pin.index]?.severity, { focus: focusedProblemId === pin.eventId }]"
              >
                <line :x1="pin.anchorX" :y1="pin.anchorY" :x2="pin.x" :y2="pin.y" />
                <circle :cx="pin.x" :cy="pin.y" r="13" />
                <text :x="pin.x" :y="pin.y + 4">{{ pin.index + 1 }}</text>
              </g>
            </g>
          </svg>
        </div>

        <div class="legend">
          <span><b class="vehicle normal"></b>{{ t('oversight.legend.vehicle') }}</span>
          <span><b class="vehicle bunch"></b>{{ t('oversight.legend.bunchedVehicle') }}</span>
          <span><b class="segment critical"></b>{{ t('oversight.legend.serviceGap') }}</span>
          <span><b class="segment warning"></b>{{ t('oversight.legend.bunching') }}</span>
          <span><b class="segment watch"></b>{{ t('oversight.legend.lowCapacity') }}</span>
        </div>
      </section>

      <div class="side-column">
        <section class="panel live-signals-panel">
          <div class="panel-head compact-head">
            <div>
              <div class="eyebrow">{{ t('oversight.liveSignals.eyebrow') }}</div>
              <h2>{{ t('oversight.liveSignals.title') }}</h2>
            </div>
            <span class="mode-badge">{{ liveSignalStatusLabel }}</span>
          </div>
          <div v-if="recentLiveSignals.length > 0" class="live-signal-list">
            <article
              v-for="signal in recentLiveSignals"
              :key="`${signal.type}-${signal.route_uid}-${signal.direction}-${signal.slot_key}-${signal.trailing_vehicle_id}-${signal.leading_vehicle_id}`"
              class="live-signal-row"
              :class="signal.type === 'suspected_gap' ? 'critical' : 'warning'"
            >
              <span class="sev-chip" :class="signal.type === 'suspected_gap' ? 'critical' : 'warning'">
                {{ signalTypeLabel(signal) }}
              </span>
              <span class="watch-main">
                <strong>{{ t('oversight.routePrefix') }}{{ signal.route_name ?? signal.route_uid ?? '—' }}</strong>
                <small>{{ signalMetric(signal) }} · {{ signal.slot_key ?? '—' }}</small>
              </span>
            </article>
          </div>
          <div v-else class="prob-empty">
            {{ liveSignalError ? t('oversight.liveSignals.unavailable') : t('oversight.liveSignals.empty') }}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head compact-head">
            <div class="eyebrow">{{ t('oversight.watch.eyebrow') }}</div>
            <span class="mode-badge">{{ t('oversight.watch.badge', { count: model.watchlist.length }) }}</span>
          </div>
          <div v-if="model.watchlist.length > 0" class="watch-list">
            <button
              v-for="route in model.watchlist"
              :key="route.routeName"
              class="watch-row"
              :class="[route.severity, { active: route.routeName === selectedRoute?.routeName }]"
              type="button"
              @click="selectRoute(route.routeName)"
            >
              <span class="sev-chip" :class="route.severity">{{ t(`oversight.severity.${route.severity}`) }}</span>
              <span class="watch-main">
                <strong>{{ t('oversight.routePrefix') }}{{ route.routeName }}</strong>
                <small>{{ route.destination ? t('oversight.toward', { dest: route.destination }) : formatWatchMetric(route) }}</small>
              </span>
              <span class="open-arrow">›</span>
            </button>
          </div>
          <div v-else class="prob-empty">{{ t('oversight.watch.empty') }}</div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">{{ t('oversight.problem.eyebrow') }}</div>
              <h2>{{ t('oversight.problem.title', { time: currentSlot ? `${String(currentSlot.hour).padStart(2, '0')}:00` : '—' }) }}</h2>
            </div>
          </div>

          <div v-if="activeEvents.length > 0">
            <article
              v-for="(event, index) in activeEvents"
              :key="event.id"
              class="prob-card"
              :class="[event.severity, { active: focusedProblemId === event.id }]"
              @mouseenter="focusProblem(event.id)"
              @mouseleave="focusProblem(null)"
              @focusin="focusProblem(event.id)"
              @focusout="focusProblem(null)"
              tabindex="0"
            >
              <div class="prob-head">
                <div class="prob-title">
                  <span class="pin-num">{{ index + 1 }}</span>
                  <strong>{{ t(event.labelKey) }}</strong>
                </div>
                <span class="sev-chip" :class="event.severity">{{ t(event.severityKey) }}</span>
              </div>
              <div class="prob-where">{{ problemWhere(event) }}</div>
              <div class="prob-metric">{{ problemMetric(event) }}</div>
              <p>{{ t(event.copyKey ?? `oversight.signal.${event.type}.copy`) }}</p>
              <p v-if="isLive && event.vehicles?.length" class="vehicle-note">{{ t('oversight.problem.vehicleNote') }}</p>
            </article>
          </div>
          <div v-else class="prob-empty">{{ t('oversight.problem.empty') }}</div>
        </section>
      </div>
    </div>

    <div class="foot-note">{{ t('oversight.footNote') }}</div>
  </main>
</template>

<style scoped>
.oversight-shell {
  --bg: #060a12;
  --panel: rgba(9, 17, 27, 0.84);
  --panel-soft: rgba(6, 13, 22, 0.72);
  --border: rgba(128, 154, 180, 0.22);
  --border-soft: rgba(128, 154, 180, 0.16);
  --fg: #e5f2fb;
  --fg-soft: #dcecf7;
  --muted: #aebfcc;
  --mono-muted: #8fa7ba;
  --accent: #2ec7e8;
  --critical: #ff6b61;
  --warning: #ffd052;
  --watch: #6c9eff;
  --ok: #4fd5a7;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  --sans: Geist, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Noto Sans TC", system-ui, sans-serif;
  min-height: 100vh;
  max-width: 1340px;
  margin: 0 auto;
  padding: 26px;
  background:
    radial-gradient(circle at 18% 6%, rgba(17, 100, 129, 0.22), transparent 30%),
    radial-gradient(circle at 88% 14%, rgba(108, 158, 255, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(7, 16, 26, 0), rgba(2, 5, 10, 0.5) 64%),
    var(--bg);
  color: var(--fg);
  font-family: var(--sans);
}

.topbar,
.topbar-actions,
.kpi-top,
.panel-head,
.tl-statusrow,
.tl-actions,
.legend,
.prob-head,
.prob-title {
  display: flex;
  align-items: center;
}

.topbar {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.brand-kicker,
.eyebrow {
  color: var(--mono-muted);
  font: 12px/1.2 var(--mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.brand-title {
  margin: 6px 0 0;
  color: var(--fg);
  font-size: 26px;
  line-height: 1.1;
}

.brand-title span {
  color: var(--accent);
}

.topbar-actions {
  justify-content: flex-end;
  gap: 10px;
}

.day-pill,
.mode-badge {
  flex: 0 0 auto;
  padding: 8px 12px;
  border: 1px solid rgba(108, 158, 255, 0.34);
  border-radius: 999px;
  background: rgba(38, 68, 114, 0.28);
  color: #bad1ff;
  font: 12px/1.1 var(--mono);
}

.locale-switch,
.seg-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.22);
}

.locale-switch button,
.seg-toggle button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font: 12px/1 var(--mono);
  padding: 6px 9px;
}

.locale-switch button.active,
.seg-toggle button.active {
  background: rgba(17, 101, 126, 0.6);
  color: #d8fbff;
}

.kpi-band {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.kpi,
.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.26);
}

.kpi {
  position: relative;
  grid-column: span 2;
  display: grid;
  gap: 8px;
  min-height: 118px;
  padding: 16px;
}

.kpi.primary {
  grid-column: span 4;
}

.kpi.tone-critical {
  border-color: rgba(255, 105, 97, 0.4);
}

.kpi.tone-warning {
  border-color: rgba(255, 208, 82, 0.34);
}

.kpi.tone-watch {
  border-color: rgba(108, 158, 255, 0.34);
}

.kpi-top {
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.kpi-label {
  color: var(--mono-muted);
  font: 11px/1.2 var(--mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.kpi-headline {
  display: grid;
  gap: 6px;
  justify-items: start;
}
/* Source tag: distinguishes speed-layer "Live" KPIs from the frozen batch snapshot. */
.kpi-source {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--mono-muted);
  font: 10px/1.5 var(--mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.kpi-source.live {
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.kpi-source-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.kpi.is-live {
  border-top: 2px solid color-mix(in srgb, var(--accent) 60%, transparent);
}

.kpi-i {
  position: relative;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: transparent;
  color: var(--mono-muted);
  cursor: help;
  display: grid;
  flex: 0 0 auto;
  font: 700 11px/1 var(--mono);
  place-items: center;
}

.kpi-i:hover,
.kpi-i:focus-visible {
  border-color: var(--accent);
  color: var(--fg);
  outline: none;
}

.kpi-pop {
  position: absolute;
  top: 25px;
  right: 0;
  z-index: 5;
  width: 220px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #0b1726;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.55);
  color: #cdddec;
  font: 11.5px/1.55 var(--mono);
  opacity: 0;
  pointer-events: none;
  text-align: left;
  transform: translateY(-4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.kpi-i:hover .kpi-pop,
.kpi-i:focus .kpi-pop,
.kpi-i:focus-visible .kpi-pop {
  opacity: 1;
  transform: none;
}

.kpi-value {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kpi strong {
  font-size: clamp(24px, 2.6vw, 38px);
  line-height: 1;
}

.kpi.primary strong {
  font-size: clamp(40px, 4.4vw, 58px);
}

.kpi-delta {
  color: var(--mono-muted);
  font: 12px/1 var(--mono);
}

.kpi-delta.bad {
  color: var(--critical);
}

.kpi-delta.good {
  color: var(--ok);
}

.kpi-delta.live {
  color: var(--accent);
}

.ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background:
    radial-gradient(closest-side, var(--bg) 70%, transparent 71%),
    conic-gradient(var(--accent) calc(var(--p) * 1%), rgba(128, 154, 180, 0.18) 0);
  color: #d8fbff;
  display: grid;
  font: 700 15px/1 var(--mono);
  place-items: center;
}

.panel {
  padding: 18px;
}

.panel + .panel {
  margin-top: 16px;
}

.panel-head {
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.panel-head h2 {
  margin: 6px 0 0;
  color: var(--fg);
  font-size: 18px;
  line-height: 1.2;
}

.compact-head {
  align-items: center;
}

.tl-statusrow {
  gap: 12px;
  margin-bottom: 8px;
}

.tl-bigtime {
  color: var(--fg);
  font: 590 18px/1.05 var(--mono);
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--mono-muted);
  font: 10px/1 var(--mono);
  text-transform: uppercase;
}

.live-pill.live {
  border-color: rgba(79, 213, 167, 0.5);
  color: #aef0d4;
}

.live-pill.history {
  border-color: rgba(108, 158, 255, 0.45);
  color: #bad1ff;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mono-muted);
}

.live-pill.live .live-dot {
  animation: lp 1.4s ease-in-out infinite;
  background: var(--ok);
  box-shadow: 0 0 9px var(--ok);
}

.live-pill.history .live-dot {
  background: var(--watch);
}

@keyframes lp {
  50% {
    opacity: 0.4;
  }
}

.tl-strip {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 84px;
}

.tl-cell {
  flex: 1 1 0;
  min-width: 0;
  border: 0;
  border-radius: 3px 3px 2px 2px;
  background: rgba(128, 154, 180, 0.16);
  cursor: pointer;
  padding: 0;
}

.tl-cell.empty {
  opacity: 0.48;
}

.tl-cell:hover {
  filter: brightness(1.2);
}

.tl-cell.sev-normal {
  background: rgba(128, 154, 180, 0.16);
}

.tl-cell.sev-watch {
  background: linear-gradient(180deg, rgba(108, 158, 255, 0.9), rgba(108, 158, 255, 0.32));
}

.tl-cell.sev-warning {
  background: linear-gradient(180deg, rgba(255, 208, 82, 0.92), rgba(255, 208, 82, 0.34));
}

.tl-cell.sev-critical {
  background: linear-gradient(180deg, rgba(255, 107, 97, 0.95), rgba(255, 107, 97, 0.38));
}

.tl-cell.day-sep {
  margin-left: 7px;
}

.tl-cell.active {
  outline: 2px solid #d8fbff;
  outline-offset: 1px;
}

.tl-track {
  position: relative;
  height: 26px;
  margin-top: 6px;
}

.rail,
.tl-fill {
  position: absolute;
  top: 11px;
  height: 4px;
  border-radius: 999px;
}

.rail {
  left: 0;
  right: 0;
  background: rgba(128, 154, 180, 0.18);
}

.tl-fill {
  left: 0;
  background: linear-gradient(90deg, rgba(46, 199, 232, 0.5), rgba(46, 199, 232, 0.85));
}

.tl-now {
  position: absolute;
  top: 3px;
  width: 2px;
  height: 20px;
  background: rgba(79, 213, 167, 0.8);
  box-shadow: 0 0 8px rgba(79, 213, 167, 0.6);
}

.tl-slider {
  appearance: none;
  position: absolute;
  top: 4px;
  left: 0;
  width: 100%;
  height: 18px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.tl-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #d8fbff;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px rgba(46, 199, 232, 0.6);
  cursor: grab;
}

.tl-hover {
  position: absolute;
  top: -34px;
  z-index: 6;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #0b1726;
  color: #cdddec;
  font: 10.5px/1.1 var(--mono);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%);
  white-space: nowrap;
}

.tl-hover.visible {
  opacity: 1;
}

.tl-days {
  display: flex;
  gap: 7px;
  margin-top: 6px;
}

.tl-days span {
  flex: 1 1 0;
  color: var(--mono-muted);
  font: 10.5px/1.2 var(--mono);
  text-align: center;
}

.tl-days span.today {
  color: #aef0d4;
}

.tl-actions {
  gap: 8px;
  margin-top: 10px;
}

.tl-btn,
.btn {
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: rgba(12, 22, 34, 0.78);
  color: var(--fg-soft);
  cursor: pointer;
}

.tl-btn {
  width: 34px;
  height: 30px;
  display: grid;
  font-size: 13px;
  place-items: center;
}

.tl-btn.primary {
  border-color: rgba(46, 199, 232, 0.55);
  background: rgba(17, 101, 126, 0.5);
  color: #d8fbff;
}

.tl-btn:disabled {
  cursor: default;
  opacity: 0.4;
}

.btn.compact {
  height: 30px;
  padding: 0 12px;
}

.legend {
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.legend b {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}

.swatch.ok {
  background: var(--ok);
}

.swatch.watch,
.segment.watch {
  background: var(--watch);
}

.swatch.warning,
.segment.warning {
  background: var(--warning);
}

.swatch.critical {
  background: var(--critical);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.map-wrap {
  overflow: hidden;
  margin-top: 4px;
  border-radius: 10px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px),
    radial-gradient(circle at 50% 42%, rgba(23, 52, 74, 0.42), transparent 46%),
    #07101a;
  background-size: 44px 44px, 44px 44px, auto, auto;
}

.routemap {
  display: block;
  width: 100%;
  height: auto;
}

.seg {
  fill: none;
  stroke-linecap: round;
}

.seg.base {
  filter: drop-shadow(0 0 5px rgba(188, 220, 255, 0.25));
  stroke: #cfe0f5;
  stroke-width: 5;
}

.seg.problem {
  stroke-width: 8;
}

.seg.sev-critical {
  stroke: var(--critical);
  stroke-dasharray: 3 7;
}

.seg.sev-warning {
  stroke: var(--warning);
}

.seg.sev-watch {
  stroke: var(--watch);
}

.seg.pulse {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.stop-dot {
  fill: #07101a;
  stroke: #d9e7f8;
  stroke-width: 2.5;
}

.stop-dot.terminal {
  fill: var(--accent);
  stroke: #d8fbff;
}

.stop-dot.ring-critical {
  stroke: var(--critical);
  stroke-width: 3.5;
}

.stop-dot.ring-warning {
  stroke: var(--warning);
  stroke-width: 3.5;
}

.stop-dot.ring-watch {
  stroke: var(--watch);
  stroke-width: 3.5;
}

.stop-label {
  fill: #cdddec;
  font: 12px/1 var(--sans);
}

.veh {
  stroke: #07101a;
  stroke-width: 2;
  transform-box: fill-box;
  transform-origin: center;
  transform: rotate(8deg);
}

.veh.normal,
.vehicle.normal {
  fill: var(--accent);
  background: var(--accent);
}

.veh.bunch,
.vehicle.bunch {
  fill: var(--warning);
  background: var(--warning);
}

.veh.capacity {
  fill: var(--watch);
}

.vehicle {
  border-radius: 50%;
}

.segment.critical {
  background: repeating-linear-gradient(90deg, var(--critical) 0 3px, transparent 3px 7px);
}

.map-empty {
  fill: #6f8597;
  font: 13px/1 var(--sans);
  text-anchor: middle;
}

.pin line {
  stroke: rgba(207, 224, 245, 0.4);
  stroke-width: 1.5;
}

.pin circle {
  stroke: #07101a;
  stroke-width: 2;
}

.pin.critical circle {
  fill: var(--critical);
}

.pin.warning circle {
  fill: var(--warning);
}

.pin.watch circle {
  fill: var(--watch);
}

.pin text {
  fill: #0a0f16;
  font: 800 13px/1 var(--sans);
  text-anchor: middle;
}

.pin.focus circle {
  animation: pinpulse 0.9s ease-in-out infinite;
}

@keyframes pinpulse {
  0%,
  100% {
    r: 13;
  }
  50% {
    r: 16;
  }
}

.watch-list {
  display: grid;
  gap: 8px;
}

.live-signals-panel {
  border-color: rgba(79, 213, 167, 0.22);
}

.live-signal-list {
  display: grid;
  gap: 8px;
}

.live-signal-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-left: 4px solid var(--warning);
  border-radius: 8px;
  background: var(--panel-soft);
}

.live-signal-row.critical {
  border-left-color: var(--critical);
}

.live-signal-row.warning {
  border-left-color: var(--warning);
}

.watch-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1.4fr) auto;
  align-items: center;
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--border-soft);
  border-left-width: 4px;
  border-radius: 8px;
  background: var(--panel-soft);
  color: inherit;
  cursor: pointer;
  font-family: inherit;
  gap: 10px;
  text-align: left;
}

.watch-row.critical {
  border-left-color: var(--critical);
}

.watch-row.warning {
  border-left-color: var(--warning);
}

.watch-row.watch {
  border-left-color: var(--watch);
}

.watch-row.active {
  border-color: rgba(46, 199, 232, 0.45);
  background: rgba(18, 31, 46, 0.7);
}

.sev-chip {
  justify-self: start;
  padding: 4px 8px;
  border-radius: 999px;
  font: 11px/1.1 var(--mono);
}

.sev-chip.critical {
  background: rgba(255, 105, 97, 0.16);
  color: #ffb3ad;
}

.sev-chip.warning {
  background: rgba(255, 208, 82, 0.16);
  color: #ffe19a;
}

.sev-chip.watch {
  background: rgba(108, 158, 255, 0.16);
  color: #bad1ff;
}

.sev-chip.normal {
  background: rgba(128, 154, 180, 0.12);
  color: var(--mono-muted);
}

.watch-main strong {
  display: block;
  color: var(--fg);
  font-size: 15px;
}

.watch-main small {
  color: var(--mono-muted);
  font: 11.5px/1.3 var(--mono);
}

.open-arrow {
  color: var(--accent);
  font-size: 18px;
}

.prob-card {
  display: grid;
  gap: 8px;
  margin-bottom: 9px;
  padding: 13px;
  border: 1px solid var(--border-soft);
  border-left-width: 4px;
  border-radius: 8px;
  background: var(--panel-soft);
  cursor: pointer;
}

.prob-card.critical {
  border-left-color: var(--critical);
}

.prob-card.warning {
  border-left-color: var(--warning);
}

.prob-card.watch {
  border-left-color: var(--watch);
}

.prob-card.active {
  border-color: rgba(46, 199, 232, 0.4);
  background: rgba(18, 31, 46, 0.7);
}

.prob-head {
  justify-content: space-between;
  gap: 10px;
}

.prob-title {
  gap: 9px;
}

.prob-title strong {
  color: var(--fg);
  font-size: 14.5px;
}

.pin-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #0a0f16;
  display: grid;
  font: 800 12px/1 var(--sans);
  place-items: center;
}

.prob-card.critical .pin-num {
  background: var(--critical);
}

.prob-card.warning .pin-num {
  background: var(--warning);
}

.prob-card.watch .pin-num {
  background: var(--watch);
}

.prob-where {
  color: var(--accent);
  font: 12px/1.3 var(--mono);
}

.prob-metric {
  color: var(--fg-soft);
  font: 13px/1 var(--mono);
}

.prob-card p {
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.5;
}

.prob-card .vehicle-note {
  color: var(--mono-muted);
}

.prob-empty {
  padding: 22px 14px;
  border: 1px dashed var(--border-soft);
  border-radius: 8px;
  color: var(--mono-muted);
  font: 13px/1.6 var(--mono);
  text-align: center;
}

.foot-note {
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: rgba(18, 31, 46, 0.42);
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1080px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .kpi {
    grid-column: span 4;
  }

  .kpi.primary {
    grid-column: span 12;
  }
}

@media (max-width: 720px) {
  .oversight-shell {
    padding: 16px;
  }

  .topbar,
  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .kpi {
    grid-column: span 12;
  }

  .tl-strip {
    height: 70px;
  }

  .watch-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .watch-row .sev-chip {
    display: none;
  }
}
</style>
