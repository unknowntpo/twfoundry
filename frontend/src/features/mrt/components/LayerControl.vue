<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import { resolveLocalizedText } from "../localized-text";
import { resolveMrtLineLabel } from "../line-names";
import type { LiveBoardEntry, MrtLine } from "../types";

const props = defineProps<{
  lines: MrtLine[];
}>();

const store = useMrtDashboardStore();
const { locale, t } = useI18n();
const expandedLineIds = ref<string[]>([]);
const trainCardRefs = ref<Record<string, HTMLButtonElement | null>>({});

const liveRowsByLine = computed(() =>
  props.lines.map((line) => ({
    line,
    rows: store.displayedLiveBoards.filter((row) => row.lineId === line.id),
  })),
);

function toggleExpanded(lineId: string): void {
  expandedLineIds.value = expandedLineIds.value.includes(lineId)
    ? expandedLineIds.value.filter((id) => id !== lineId)
    : [...expandedLineIds.value, lineId];
}

function isExpanded(lineId: string): boolean {
  return expandedLineIds.value.includes(lineId);
}

function displayLineLabel(line: MrtLine, rows: LiveBoardEntry[]): string {
  return resolveMrtLineLabel(t, locale.value, line.id, rows.find((row) => row.lineName)?.lineName);
}

function displayDestination(row: LiveBoardEntry): string {
  return resolveLocalizedText(locale.value, row.destinationName, row.destination) ?? row.destination;
}

async function selectTrain(row: LiveBoardEntry): Promise<void> {
  await store.selectStation(row.stationId);
  store.selectTrain(row.id);
}

function registerTrainCardRef(trainId: string, element: Element | null): void {
  trainCardRefs.value[trainId] = element instanceof HTMLButtonElement ? element : null;
}

watch(
  () => store.selectedTrainId,
  async (selectedTrainId) => {
    if (!selectedTrainId) {
      return;
    }

    const row = store.displayedLiveBoards.find((item) => item.id === selectedTrainId);
    if (!row) {
      return;
    }

    if (!expandedLineIds.value.includes(row.lineId)) {
      expandedLineIds.value = [...expandedLineIds.value, row.lineId];
    }

    await nextTick();
    const card = trainCardRefs.value[selectedTrainId];
    card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    card?.focus({ preventScroll: true });
  },
);
</script>

<template>
  <div class="layer-control" :aria-label="t('dashboard.layers.controls')">
    <section
      v-for="{ line, rows } in liveRowsByLine"
      :key="line.id"
      class="line-group"
      :style="{ '--line-color': line.color }"
    >
      <div class="line-row" :class="{ muted: !store.visibleLineIds.includes(line.id) }">
        <button
          type="button"
          class="expand-button"
          :aria-label="t('dashboard.layers.expandLine', { line: displayLineLabel(line, rows) })"
          :aria-expanded="isExpanded(line.id)"
          @click="toggleExpanded(line.id)"
        >
          <span class="chevron" :class="{ expanded: isExpanded(line.id) }" aria-hidden="true">⌄</span>
        </button>

        <button
          type="button"
          class="line-button"
          @click="toggleExpanded(line.id)"
        >
          <span class="line-dot" aria-hidden="true" />
          <span class="line-label">{{ displayLineLabel(line, rows) }}</span>
          <span class="line-count">{{ rows.length }}</span>
        </button>

        <button
          type="button"
          class="visibility-toggle"
          :class="{ off: !store.visibleLineIds.includes(line.id) }"
          :aria-pressed="store.visibleLineIds.includes(line.id)"
          @click="store.toggleLine(line.id)"
        />
      </div>

      <div v-if="isExpanded(line.id)" class="train-list">
        <button
          v-for="row in rows"
          :key="row.id"
          :ref="(element) => registerTrainCardRef(row.id, element)"
          type="button"
          class="train-row"
          :class="{ selected: store.selectedTrainId === row.id }"
          @click="selectTrain(row)"
        >
          <span class="train-dot" aria-hidden="true" />
          <span class="train-main">
            <strong>{{ row.trainCode }}</strong>
            <span class="train-destination">{{ displayDestination(row) }}</span>
            <span class="train-secondary">{{ row.status }} · {{ row.direction }}</span>
          </span>
          <span class="train-meta">ETA {{ row.arrivalMinutes }}m</span>
        </button>

        <p v-if="rows.length === 0" class="empty-trains">
          {{ t("dashboard.layers.noTrains") }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.layer-control {
  display: grid;
  gap: var(--twf-space-2);
}

.line-group {
  display: grid;
  gap: 6px;
}

.line-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.line-row.muted {
  color: var(--twf-color-text-faint);
}

.expand-button,
.line-button,
.visibility-toggle,
.train-row {
  border: 0;
  background: transparent;
  color: inherit;
}

.expand-button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.chevron {
  display: inline-block;
  font-size: 0.9rem;
  transform: rotate(-90deg);
  transition: transform 140ms ease;
}

.chevron.expanded {
  transform: rotate(0deg);
}

.line-button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 38px;
  gap: var(--twf-space-2);
  padding: 7px 4px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  text-align: left;
}

.line-dot {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  background:
    linear-gradient(var(--line-color), var(--line-color)) center / 14px 3px no-repeat,
    var(--twf-color-surface);
}

.line-label {
  min-width: 0;
}

.line-count {
  color: var(--twf-color-text-faint);
  font-size: 0.72rem;
}

.visibility-toggle {
  width: 28px;
  height: 16px;
  border-radius: 999px;
  background: var(--line-color);
  box-shadow: var(--twf-shadow-hairline);
  cursor: pointer;
}

.visibility-toggle.off {
  background: var(--twf-color-border);
}

.train-list {
  display: grid;
  gap: 6px;
  padding-left: 32px;
}

.train-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-md);
  background: color-mix(in srgb, var(--twf-color-surface) 92%, white);
  cursor: pointer;
  text-align: left;
}

.train-row.selected {
  border-color: var(--line-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--line-color) 18%, transparent);
}

.train-dot {
  width: 10px;
  height: 10px;
  margin-top: 8px;
  border-radius: 50%;
  background: var(--line-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--line-color) 16%, transparent);
}

.train-main {
  display: grid;
  gap: 4px;
}

.train-main strong {
  font-size: 0.92rem;
  line-height: 1.15;
}

.train-destination,
.train-secondary,
.train-meta {
  color: var(--twf-color-text-faint);
}

.train-destination {
  font-size: 0.76rem;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.train-secondary {
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.2;
}

.train-meta {
  align-self: center;
  white-space: nowrap;
  font-size: 0.68rem;
  font-weight: 700;
}

.empty-trains {
  margin: 0;
  color: var(--twf-color-text-faint);
  font-size: 0.72rem;
}
</style>
