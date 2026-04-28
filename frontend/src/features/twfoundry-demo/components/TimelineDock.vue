<script setup lang="ts">
import { computed } from "vue";
import type { Scenario, ScenarioId, TimelineMode } from "../data";
import { timelineEvents, timelineTicks } from "../data";

const props = defineProps<{
  scenario: Scenario;
  scenarios: Scenario[];
  playing: boolean;
  currentMinute: number;
  timelineMode: TimelineMode;
  playbackSpeed: number;
}>();

const emit = defineEmits<{
  togglePlaying: [];
  selectScenario: [id: ScenarioId];
  setMode: [mode: TimelineMode];
  setSpeed: [speed: number];
  scrub: [minute: number];
}>();

const visibleEvents = computed(() =>
  timelineEvents.filter((event) => event.scenarioIds.includes(props.scenario.id)),
);
const cursorLeft = computed(() => `${(props.currentMinute / 1440) * 100}%`);
const currentTimeLabel = computed(() => {
  const hour = Math.floor(props.currentMinute / 60) % 24;
  const minute = Math.floor(props.currentMinute % 60);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

function eventLeft(minute: number): string {
  return `${(minute / 1440) * 100}%`;
}

function eventWidth(durationMinutes: number): string {
  return `${Math.max(1.2, (durationMinutes / 1440) * 100)}%`;
}

function scrubFromPointer(event: PointerEvent): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  emit("scrub", ratio * 1440);
}
</script>

<template>
  <footer class="timeline-dock">
    <button type="button" class="play-button" :aria-pressed="playing" @click="emit('togglePlaying')">
      {{ playing ? "Pause" : "Play" }}
    </button>

    <div class="mode-buttons" aria-label="Timeline mode">
      <button type="button" :class="{ active: timelineMode === 'now' }" @click="emit('setMode', 'now')">Now</button>
      <button type="button" :class="{ active: timelineMode === '24h' }" @click="emit('setMode', '24h')">24-hour</button>
      <button type="button" :class="{ active: timelineMode === 'live' }" @click="emit('setMode', 'live')">Live · 60m</button>
    </div>

    <div class="time-readout">
      <strong>{{ currentTimeLabel }}</strong>
      <span>CST · {{ scenario.label }}</span>
    </div>

    <div class="speed-buttons" aria-label="Playback speed">
      <span>Speed</span>
      <button
        v-for="speed in [1, 15, 60, 300]"
        :key="speed"
        type="button"
        :class="{ active: playbackSpeed === speed }"
        @click="emit('setSpeed', speed)"
      >
        {{ speed }}×
      </button>
    </div>

    <div class="track" @pointerdown="scrubFromPointer">
      <span
        v-for="event in visibleEvents"
        :key="event.id"
        class="event-band"
        :data-tone="event.tone"
        :data-severity="event.severity"
        :style="{ left: eventLeft(event.minute), width: eventWidth(event.durationMinutes) }"
      />
      <span class="window" :style="{ left: cursorLeft }" />
      <i
        v-for="tick in timelineTicks"
        :key="tick.label"
        :style="{ left: `${tick.position}%` }"
        :title="tick.label"
      />
    </div>

    <div class="event-lane" aria-label="Timeline events">
      <button
        v-for="event in visibleEvents"
        :key="event.id"
        type="button"
        class="event-marker"
        :data-tone="event.tone"
        :style="{ left: eventLeft(event.minute) }"
        :title="`${event.label} · ${event.metric}`"
      >
        <span />
        <strong>{{ event.label }}</strong>
        <small>{{ event.metric }}</small>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.timeline-dock {
  display: grid;
  grid-template-columns: auto minmax(360px, auto) 1fr minmax(360px, auto);
  align-items: center;
  gap: 22px;
  min-height: clamp(128px, 8.8vw, 166px);
  border-top: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface);
  padding: 16px clamp(22px, 1.9vw, 38px) 24px;
}

.play-button {
  width: clamp(44px, 2.8vw, 54px);
  height: clamp(44px, 2.8vw, 54px);
  border: 1px solid var(--twf-color-text);
  border-radius: 999px;
  background: var(--twf-color-text);
  color: var(--twf-color-surface-raised);
  cursor: pointer;
  font-size: 0.68rem;
}

.time-readout {
  display: grid;
  gap: 1px;
  justify-items: center;
}

.time-readout strong {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2.05rem, 2.1vw, 2.65rem);
  line-height: 1;
}

.time-readout span {
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.72rem, 0.72vw, 0.9rem);
  letter-spacing: 0.16em;
}

.mode-buttons,
.speed-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
}

.mode-buttons button,
.speed-buttons button {
  border: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface-raised);
  padding: 8px 13px;
  color: var(--twf-color-text-muted);
  cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.72rem, 0.7vw, 0.84rem);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mode-buttons button + button,
.speed-buttons button + button {
  margin-left: -1px;
}

.mode-buttons button.active,
.speed-buttons button.active {
  border-color: var(--twf-color-text);
  background: var(--twf-color-text);
  color: var(--twf-color-surface);
}

.speed-buttons {
  justify-content: flex-end;
}

.speed-buttons span {
  margin-right: 10px;
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.track {
  position: relative;
  grid-column: 1 / -1;
  height: clamp(44px, 3vw, 58px);
  border: 1px solid var(--twf-color-border);
  background:
    linear-gradient(90deg, rgba(201, 123, 99, 0.1), rgba(47, 111, 214, 0.1)),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 47px,
      rgba(31, 27, 23, 0.08) 48px
    );
}

.track .window {
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: 72%;
  width: 8px;
  border: 1px solid var(--twf-color-accent-warm);
  background: rgba(201, 123, 99, 0.2);
}

.event-band {
  position: absolute;
  top: 5px;
  bottom: 5px;
  border-left: 1px solid currentColor;
  border-right: 1px solid currentColor;
  opacity: 0.42;
}

.event-band[data-tone="red"] {
  color: var(--twf-color-route-red);
  background: rgba(217, 45, 58, 0.16);
}

.event-band[data-tone="blue"] {
  color: var(--twf-color-route-blue);
  background: rgba(47, 111, 214, 0.16);
}

.event-band[data-tone="green"] {
  color: var(--twf-color-route-green);
  background: rgba(47, 158, 98, 0.14);
}

.event-band[data-tone="orange"] {
  color: var(--twf-color-status-warning);
  background: rgba(224, 120, 32, 0.16);
}

.event-band[data-tone="brown"] {
  color: #8c6322;
  background: rgba(140, 99, 34, 0.16);
}

.event-band[data-severity="critical"] {
  opacity: 0.66;
}

.track i {
  position: absolute;
  top: 7px;
  width: 1px;
  height: 28px;
  background: rgba(31, 27, 23, 0.36);
}

.event-lane {
  position: relative;
  grid-column: 1 / -1;
  min-height: 26px;
}

.event-marker {
  position: absolute;
  top: 0;
  display: inline-grid;
  grid-template-columns: auto auto auto;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  transform: translateX(-50%);
  border: 0;
  background: transparent;
  color: var(--twf-color-text-faint);
  cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.68rem;
  white-space: nowrap;
}

.event-marker span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}

.event-marker strong {
  overflow: hidden;
  max-width: 120px;
  color: var(--twf-color-text-muted);
  font-weight: 500;
  text-overflow: ellipsis;
}

.event-marker small {
  color: var(--twf-color-text-faint);
}

.event-marker[data-tone="red"] {
  color: var(--twf-color-route-red);
}

.event-marker[data-tone="blue"] {
  color: var(--twf-color-route-blue);
}

.event-marker[data-tone="green"] {
  color: var(--twf-color-route-green);
}

.event-marker[data-tone="orange"] {
  color: var(--twf-color-status-warning);
}

.event-marker[data-tone="brown"] {
  color: #8c6322;
}

@media (max-width: 760px) {
  .timeline-dock {
    grid-template-columns: auto 1fr;
  }

  .track,
  .event-lane,
  .mode-buttons,
  .speed-buttons {
    grid-column: 1 / -1;
  }
}
</style>
