<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { avatarTiles, incidents, layers, railPath, sensors, stations, trains } from './mockData'

const container = ref(null)
const worldTime = ref(36)
const playing = ref(true)
const liveMode = ref(false)
const speed = ref(1)
const avatarIndex = ref(2)
const selectedId = ref('train-r22')
const enabledLayers = reactive({
  metro: true,
  weather: true,
  air: true,
  incidents: true,
  sensors: true
})

let renderer
let scene
let camera
let frameId
let resizeObserver
let lastTick = performance.now()
const objectRefs = new Map()
const clickableRefs = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

const selectedObject = computed(() => {
  return [...trains, ...incidents, ...stations, ...sensors].find((item) => item.id === selectedId.value)
})

const avatar = computed(() => avatarTiles[avatarIndex.value])
const normalizedTime = computed(() => (liveMode.value ? livePulse() : worldTime.value / 100))
const clockLabel = computed(() => {
  const minutes = Math.floor(worldTime.value * 14.4)
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return liveMode.value ? 'LIVE + now' : `${h}:${m}`
})

const trainStates = computed(() =>
  trains.map((train) => {
    const p = sampleRail((normalizedTime.value + train.offset) % 1)
    const delay = Math.round(2 + wave(train.offset, 0.35) * 8)
    return { ...train, x: p.x, z: p.z, delay }
  })
)

const rainfall = computed(() => {
  if (!enabledLayers.weather) return 0
  return Math.round(18 + wave(0.2, 0.9) * 64)
})

const pm25 = computed(() => {
  if (!enabledLayers.air) return 0
  return Math.round(9 + wave(0.58, 0.45) * 38)
})

const sensorLoad = computed(() => {
  if (!enabledLayers.sensors) return 0
  return Math.round(20 + wave(0.08, 0.25) * 78)
})

const activeIncidents = computed(() => {
  if (!enabledLayers.incidents) return []
  const pulse = wave(0.74, 0.2)
  return incidents.filter((_, index) => pulse > 0.35 || index === 0)
})

const context = computed(() => {
  const pos = avatar.value
  const nearbyStations = enabledLayers.metro
    ? stations.filter((station) => distance(pos, station) < 2.15).map((station) => station.name)
    : []
  const nearbyTrains = enabledLayers.metro
    ? trainStates.value.filter((train) => distance(pos, train) < 2.1).map((train) => train.name)
    : []
  const nearbyIncidents = activeIncidents.value
    .filter((incident) => distance(pos, incident) < 2.5)
    .map((incident) => incident.name)

  return {
    tile: pos.label,
    station: nearbyStations[0] ?? 'none nearby',
    train: nearbyTrains[0] ?? 'no train passing',
    rainfall: enabledLayers.weather ? `${rainfall.value} mm/h` : 'layer off',
    pm25: enabledLayers.air ? `${pm25.value} ug/m3` : 'layer off',
    sensor: enabledLayers.sensors ? `${sensorLoad.value}% signal` : 'layer off',
    incident: enabledLayers.incidents ? nearbyIncidents[0] ?? 'clear' : 'layer off'
  }
})

const liveFreshness = computed(() => (liveMode.value ? 'fresh observation stream' : 'historical replay'))

function wave(offset = 0, scale = 1) {
  return (Math.sin((normalizedTime.value + offset) * Math.PI * 2 * scale) + 1) / 2
}

function livePulse() {
  return ((Date.now() / 18000) % 1 + 1) % 1
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function sampleRail(t) {
  const max = railPath.length - 1
  const scaled = t * max
  const idx = Math.min(Math.floor(scaled), max - 1)
  const local = scaled - idx
  const from = railPath[idx]
  const to = railPath[idx + 1]
  return {
    x: from.x + (to.x - from.x) * local,
    z: from.z + (to.z - from.z) * local
  }
}

function toggleLayer(id) {
  enabledLayers[id] = !enabledLayers[id]
  updateWorld()
}

function nextAvatar() {
  avatarIndex.value = (avatarIndex.value + 1) % avatarTiles.length
  selectedId.value = `avatar-${avatar.value.id}`
  updateWorld()
}

function selectObject(id) {
  selectedId.value = id
}

function makeBox(name, size, color, position, meta = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.04,
    transparent: meta.opacity !== undefined,
    opacity: meta.opacity ?? 1
  })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material)
  mesh.position.set(position.x, position.y, position.z)
  mesh.name = name
  mesh.castShadow = true
  mesh.receiveShadow = true
  if (meta.clickId) {
    mesh.userData.clickId = meta.clickId
    clickableRefs.push(mesh)
  }
  objectRefs.set(name, mesh)
  scene.add(mesh)
  return mesh
}

function buildScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#ecf9fb')
  scene.fog = new THREE.Fog('#ecf9fb', 10, 21)

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(6.6, 7.4, 8.4)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  container.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight('#fff9fb', '#5dac81', 2.25))
  const sun = new THREE.DirectionalLight('#fff0b5', 2.5)
  sun.position.set(2, 8, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  scene.add(sun)

  makeBox('base', { x: 8.8, y: 0.45, z: 6.2 }, '#b5caa0', { x: 0, y: -0.35, z: 0 })
  makeBox('baseShadow', { x: 9.2, y: 0.18, z: 6.6 }, '#d8c8d6', { x: 0, y: -0.64, z: 0 }, { opacity: 0.55 })
  makeBox('river', { x: 7.7, y: 0.08, z: 0.52 }, '#81c7d4', { x: -0.1, y: -0.06, z: 1.55 })

  for (let x = -3.5; x <= 3.5; x += 1) {
    for (let z = -2.2; z <= 2.2; z += 1) {
      const isRoad = Math.abs(z + 0.55 - x * 0.15) < 0.38
      const color = isRoad ? '#d8c8d6' : x % 2 === 0 ? '#a8d8b9' : '#b5caa0'
      makeBox(`tile-${x}-${z}`, { x: 0.82, y: 0.08, z: 0.82 }, color, { x, y: -0.05, z }, { opacity: 0.86 })
    }
  }

  railPath.forEach((point, idx) => {
    makeBox(`rail-${idx}`, { x: 1.1, y: 0.1, z: 0.2 }, '#e16b8c', { x: point.x, y: 0.18, z: point.z })
  })

  stations.forEach((station) => {
    makeBox(`station-${station.id}`, { x: 0.35, y: 0.42, z: 0.35 }, '#58b2dc', { x: station.x, y: 0.33, z: station.z }, { clickId: station.id })
  })

  sensors.forEach((sensor) => {
    makeBox(`sensor-${sensor.id}`, { x: 0.24, y: 0.7, z: 0.24 }, '#5dac81', { x: sensor.x, y: 0.46, z: sensor.z }, { clickId: sensor.id })
  })

  trains.forEach((train) => {
    makeBox(`train-${train.id}`, { x: 0.48, y: 0.32, z: 0.36 }, train.color, { x: 0, y: 0.48, z: 0 }, { clickId: train.id })
  })

  incidents.forEach((incident) => {
    makeBox(`incident-${incident.id}`, { x: 0.36, y: 0.8, z: 0.36 }, '#ffb11b', { x: incident.x, y: 0.58, z: incident.z }, { clickId: incident.id })
  })

  makeBox('avatar', { x: 0.36, y: 0.72, z: 0.36 }, '#2b2330', { x: avatar.value.x, y: 0.58, z: avatar.value.z }, { clickId: 'avatar' })
  makeBox('rainVolume', { x: 5.6, y: 1.1, z: 2.8 }, '#81c7d4', { x: 0, y: 1.22, z: 0.5 }, { opacity: 0.22 })
  makeBox('pmVolume', { x: 4.6, y: 0.72, z: 2.4 }, '#ffb11b', { x: 0.95, y: 0.88, z: -1.15 }, { opacity: 0.18 })
}

function updateWorld() {
  if (!scene) return
  const metroVisible = enabledLayers.metro
  stations.forEach((station) => {
    const mesh = objectRefs.get(`station-${station.id}`)
    if (mesh) mesh.visible = metroVisible
  })
  trains.forEach((train) => {
    const mesh = objectRefs.get(`train-${train.id}`)
    const state = trainStates.value.find((item) => item.id === train.id)
    if (mesh && state) {
      mesh.visible = metroVisible
      mesh.position.set(state.x, 0.52, state.z)
      mesh.scale.y = 1 + state.delay / 28
    }
  })
  sensors.forEach((sensor) => {
    const mesh = objectRefs.get(`sensor-${sensor.id}`)
    if (mesh) {
      mesh.visible = enabledLayers.sensors
      mesh.scale.y = 0.65 + sensorLoad.value / 70
    }
  })
  incidents.forEach((incident) => {
    const mesh = objectRefs.get(`incident-${incident.id}`)
    if (mesh) {
      mesh.visible = activeIncidents.value.some((item) => item.id === incident.id)
      mesh.scale.y = 0.85 + wave(0.9, 1.5) * 0.45
    }
  })
  const rain = objectRefs.get('rainVolume')
  if (rain) {
    rain.visible = enabledLayers.weather
    rain.material.opacity = 0.08 + rainfall.value / 240
    rain.scale.y = 0.65 + rainfall.value / 80
  }
  const pm = objectRefs.get('pmVolume')
  if (pm) {
    pm.visible = enabledLayers.air
    pm.material.opacity = 0.08 + pm25.value / 170
    pm.scale.y = 0.75 + pm25.value / 60
  }
  const avatarMesh = objectRefs.get('avatar')
  if (avatarMesh) {
    avatarMesh.position.set(avatar.value.x, 0.62 + wave(0.4, 2) * 0.08, avatar.value.z)
  }
}

function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(clickableRefs, false)[0]
  if (!hit) return
  const clickId = hit.object.userData.clickId
  if (clickId === 'avatar') nextAvatar()
  else selectedId.value = clickId
}

function animate(now) {
  frameId = requestAnimationFrame(animate)
  if (playing.value && !liveMode.value) {
    const delta = Math.min(now - lastTick, 80)
    worldTime.value = (worldTime.value + delta * 0.0028 * speed.value) % 100
  }
  lastTick = now
  updateWorld()
  renderer.render(scene, camera)
}

function resize() {
  if (!container.value || !renderer || !camera) return
  const rect = container.value.getBoundingClientRect()
  renderer.setSize(rect.width, rect.height, false)
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
}

watch([worldTime, liveMode, speed, avatarIndex], updateWorld)

onMounted(() => {
  buildScene()
  resize()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container.value)
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  frameId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
  renderer?.dispose()
})
</script>

<template>
  <main class="app-shell">
    <section class="world-panel">
      <div ref="container" class="world-canvas" aria-label="TWFoundry diorama interaction canvas"></div>
      <div class="corner-hud top-left">
        <span class="hud-kicker">Avatar Context</span>
        <strong>{{ context.tile }}</strong>
        <dl>
          <div><dt>Station</dt><dd>{{ context.station }}</dd></div>
          <div><dt>Train</dt><dd>{{ context.train }}</dd></div>
          <div><dt>Rain</dt><dd>{{ context.rainfall }}</dd></div>
          <div><dt>PM2.5</dt><dd>{{ context.pm25 }}</dd></div>
          <div><dt>Sensor</dt><dd>{{ context.sensor }}</dd></div>
          <div><dt>Incident</dt><dd>{{ context.incident }}</dd></div>
        </dl>
      </div>
      <div class="corner-hud top-right">
        <span class="hud-kicker">World Time</span>
        <strong>{{ clockLabel }}</strong>
        <small>{{ liveFreshness }}</small>
      </div>
      <div class="tip-strip">Click avatar to move tile. Click train or incident to inspect ontology relationships.</div>
    </section>

    <aside class="side-hud">
      <section class="hud-box selected-box">
        <span class="hud-kicker">Ontology Object</span>
        <h1>{{ selectedObject?.name ?? 'Voxel Avatar' }}</h1>
        <p>{{ selectedObject?.type ?? 'Avatar local context' }}</p>
        <div class="relation-list" v-if="selectedObject?.relationships">
          <button
            v-for="([rel, target], index) in selectedObject.relationships"
            :key="`${rel}-${target}-${index}`"
            class="relation-chip"
          >
            <span>{{ rel }}</span>
            <strong>{{ target }}</strong>
          </button>
        </div>
        <div class="relation-list" v-else>
          <button class="relation-chip"><span>located_at</span><strong>{{ context.tile }}</strong></button>
          <button class="relation-chip"><span>exposed_to</span><strong>{{ context.rainfall }} / {{ context.pm25 }}</strong></button>
          <button class="relation-chip"><span>near</span><strong>{{ context.station }}</strong></button>
        </div>
      </section>

      <section class="hud-box controls">
        <span class="hud-kicker">Timeline</span>
        <div class="transport">
          <button :class="{ active: playing }" @click="playing = !playing">{{ playing ? 'Pause' : 'Play' }}</button>
          <button :class="{ active: liveMode }" @click="liveMode = !liveMode">Live</button>
          <button @click="nextAvatar">Move Avatar</button>
        </div>
        <input v-model.number="worldTime" type="range" min="0" max="100" step="0.1" :disabled="liveMode" />
        <div class="speed-row">
          <button v-for="item in [0.5, 1, 2, 4]" :key="item" :class="{ active: speed === item }" @click="speed = item">
            {{ item }}x
          </button>
        </div>
      </section>

      <section class="hud-box layers">
        <span class="hud-kicker">Layers</span>
        <button
          v-for="layer in layers"
          :key="layer.id"
          class="layer-toggle"
          :class="{ off: !enabledLayers[layer.id] }"
          :style="{ '--tone': layer.tone }"
          @click="toggleLayer(layer.id)"
        >
          <i></i>
          <span>{{ layer.label }}</span>
        </button>
      </section>
    </aside>
  </main>
</template>
