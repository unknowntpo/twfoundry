<template>
  <main class="shell">
    <section class="stage-wrap">
      <div class="title-ribbon">
        <span class="eyebrow">TWFoundry / Taipei Pocket World</span>
        <h1>March Sakura Diorama</h1>
      </div>

      <DioramaScene
        :world-time="worldTime"
        :selected-id="selectedObject?.id"
        @hover-object="setHoverObject"
        @select-object="selectObject"
      />

      <div class="hud top-hud">
        <div v-for="signal in hudSignals" :key="signal.label" class="hud-chip" :class="`tone-${signal.tone}`">
          <span>{{ signal.label }}</span>
          <strong>{{ signal.value }}</strong>
        </div>
      </div>

      <section class="hud object-hud">
        <div class="panel-title">
          <span>{{ activeObject.type }}</span>
          <strong>{{ activeObject.name }}</strong>
        </div>
        <p>{{ activeObject.summary }}</p>
        <div class="state-row">
          <span>{{ activeObject.state }}</span>
          <span>{{ activeObject.freshness }}</span>
        </div>
        <ul>
          <li v-for="relationship in activeObject.relationships" :key="relationship">{{ relationship }}</li>
        </ul>
      </section>

      <section class="hud timeline-hud">
        <button class="icon-btn" type="button" @click="isPlaying = !isPlaying" :aria-label="isPlaying ? 'Pause' : 'Play'">
          {{ isPlaying ? 'II' : '▶' }}
        </button>
        <label>
          <span>{{ isLive ? 'Live' : 'Time' }}</span>
          <input v-model.number="worldTime" type="range" min="0" max="100" />
        </label>
        <button class="live-btn" type="button" :class="{ active: isLive }" @click="toggleLive">
          LIVE
        </button>
        <strong>{{ formattedTime }}</strong>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import DioramaScene from './DioramaScene.vue';
import { hudSignals, ontologyObjects } from './mockData';

const worldTime = ref(34);
const isPlaying = ref(true);
const isLive = ref(true);
const selectedObject = ref(ontologyObjects[0]);
const hoverObject = ref(null);

let timer = null;

const activeObject = computed(() => hoverObject.value || selectedObject.value || ontologyObjects[0]);
const formattedTime = computed(() => {
  const minutes = Math.round(worldTime.value * 0.9);
  const hour = 7 + Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

function selectObject(id) {
  const match = ontologyObjects.find((object) => object.id === id);
  if (match) {
    selectedObject.value = match;
    isLive.value = false;
  }
}

function setHoverObject(id) {
  hoverObject.value = ontologyObjects.find((object) => object.id === id) || null;
}

function toggleLive() {
  isLive.value = !isLive.value;
  if (isLive.value) {
    isPlaying.value = true;
  }
}

onMounted(() => {
  timer = window.setInterval(() => {
    if (!isPlaying.value) return;
    worldTime.value = (worldTime.value + (isLive.value ? 0.42 : 0.24)) % 100;
  }, 90);
});

onBeforeUnmount(() => {
  window.clearInterval(timer);
});

watch(worldTime, () => {
  if (!isPlaying.value) {
    isLive.value = false;
  }
});
</script>
