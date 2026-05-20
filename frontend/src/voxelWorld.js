import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorldViewBaseLayer, createWorldViewLayer } from './worldViewRenderModules.js';

const MAP_REFERENCE_DISTANCE = 92;

const COLORS = {
  sky: '#D8EEF8',
  sakuraMist: '#EAF8FF',
  rose: '#E16B8C',
};

function makeRng(seed) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

export class VoxelWorld {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 620);
    this.camera.position.set(52, 50, 68);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 2.35, -3.6);
    this.controls.enabled = true;
    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.panSpeed = 1.22;
    this.controls.rotateSpeed = 0.72;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 205;
    this.controls.maxPolarAngle = Math.PI / 2.04;
    this.controls.minPolarAngle = Math.PI / 7.5;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDown = null;
    this.suppressNextClick = false;
    this.layers = {};
    this.clickables = [];
    this.trains = [];
    this.rainBars = [];
    this.pmPuffs = [];
    this.petals = [];
    this.incidentMarkers = [];
    this.pipelineNodes = {};
    this.objectAnchors = new Map();
    this.payloadObjects = [];
    this.payloadLayer = null;
    this.worldViewPayload = null;
    this.mapReference = null;
    this.mapReferencePlane = null;
    this.selected = null;
    this.selectedObjectId = null;
    this.hovered = null;
    this.worldMinutes = 610;
    this.pipelineFocus = 'tiles';
    this.mapBaseVisible = true;
    this.viewLod = 'map-reference';
    this.layerVisibility = {
      tiles: true,
      mrt: true,
      bus: true,
      ubike: true,
      rain: true,
      pm25: true,
      incident: true,
    };

    this.initScene();
    this.bindEvents();
    this.resize();
    this.animate();
  }

  initScene() {
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.FogExp2(COLORS.sakuraMist, 0.0035);

    this.ambient = new THREE.AmbientLight('#FFF7FA', 1.18);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight('#EAF8FF', '#FFD7E6', 0.76);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#FFFAF8', 1.65);
    this.sun.position.set(26, 48, 28);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(2048);
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    this.scene.add(this.sun);

    this.roseFill = new THREE.DirectionalLight('#FFB7C5', 0.42);
    this.roseFill.position.set(-38, 18, -20);
    this.scene.add(this.roseFill);

    this.terrain = [];
    this.layers.tiles = this.emptyLayer('legacy tile layer disabled in payload mode');
    this.layers.map = this.emptyLayer('payload map layer pending');
    this.layers.mrt = this.emptyLayer('payload mrt layer pending');
    this.layers.rain = this.emptyLayer('payload rain layer pending');
    this.layers.pm25 = this.emptyLayer('payload pm25 layer pending');
    this.layers.incident = this.emptyLayer('payload incident layer pending');
    this.layers.pipeline = this.emptyLayer('legacy pipeline miniature disabled in payload mode');
    this.layers.petals = this.buildPetals();
    this.layers.avatar = this.emptyLayer('legacy avatar disabled in payload mode');

    this.scene.add(this.layers.tiles);
    this.scene.add(this.layers.map);
    this.scene.add(this.layers.mrt);
    this.scene.add(this.layers.rain);
    this.scene.add(this.layers.pm25);
    this.scene.add(this.layers.incident);
    this.scene.add(this.layers.pipeline);
    this.scene.add(this.layers.petals);
    this.scene.add(this.layers.avatar);

    this.setMapBaseVisible(true);
    this.callbacks.onReady?.({
      visibleChunks: 9,
      observations: 128,
      ontologyObjects: 0,
      voxelEntities: 0,
    });
  }

  emptyLayer(name) {
    const group = new THREE.Group();
    group.name = name;
    return group;
  }

  buildPetals() {
    const group = new THREE.Group();
    const rng = makeRng(777);
    const geo = new THREE.PlaneGeometry(0.36, 0.24);
    const cols = ['#FFB7C5', '#FF95B5', '#FFD6E4', '#FFE4EE', '#F596AA'];
    for (let i = 0; i < 180; i++) {
      const petal = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: cols[Math.floor(rng() * cols.length)],
        transparent: true,
        opacity: 0.46 + rng() * 0.34,
        side: THREE.DoubleSide,
      }));
      const spread = 40;
      petal.position.set((rng() - 0.5) * spread * 2, rng() * 23 + 4, (rng() - 0.5) * spread * 2);
      petal.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      petal.userData = {
        vx: (rng() - 0.5) * 0.018,
        vy: -(0.012 + rng() * 0.016),
        vz: (rng() - 0.5) * 0.018,
        phase: rng() * Math.PI * 2,
      };
      this.petals.push(petal);
      group.add(petal);
    }
    return group;
  }

  bindEvents() {
    this.onResize = () => this.resize();
    this.onPointerDown = (event) => this.handlePointerDown(event);
    this.onPointerUp = (event) => this.handlePointerUp(event);
    this.onPointerMove = (event) => this.handlePointerMove(event);
    this.onPointerLeave = () => this.clearHover();
    this.onClick = (event) => this.handleClick(event);
    this.onContextMenu = (event) => event.preventDefault();
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.addEventListener('click', this.onClick);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  registerAnchor(id, object3d) {
    if (!id || this.objectAnchors.has(id)) return;
    this.objectAnchors.set(id, object3d);
  }

  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  pickSelectable() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickables, true);
    return hits.map((item) => this.findSelectableAncestor(item.object)).find(Boolean);
  }

  handlePointerMove(event) {
    this.updatePointer(event);
    if (this.pointerDown) return;
    const obj = this.pickSelectable();
    const hoverObject = obj?.userData?.twObject ?? null;
    if (obj !== this.hovered) {
      this.hovered = obj ?? null;
    }
    this.callbacks.onHover?.(hoverObject, hoverObject ? { x: event.clientX, y: event.clientY } : null);
  }

  clearHover() {
    this.hovered = null;
    this.callbacks.onHover?.(null, null);
  }

  handlePointerDown(event) {
    this.pointerDown = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
    };
    this.suppressNextClick = false;
  }

  handlePointerUp(event) {
    if (!this.pointerDown) return;
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    const distance = Math.hypot(dx, dy);
    this.suppressNextClick = distance > 7;
    this.pointerDown = null;
  }

  handleClick(event) {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    this.updatePointer(event);
    const obj = this.pickSelectable();
    if (!obj) return;

    const selected = obj.userData.twObject;
    this.setSelected(obj, selected);
    if (obj.userData.pipelineKey) this.applyPipelineFocus(obj.userData.pipelineKey);
    this.callbacks.onSelect?.(selected);
  }

  findSelectableAncestor(object3d) {
    let obj = object3d;
    let selectable = null;
    while (obj) {
      if (!obj.visible) return null;
      if (!selectable && (obj.userData?.twObject || obj.userData?.pipelineKey)) {
        selectable = obj;
      }
      obj = obj.parent;
    }
    return selectable;
  }

  setSelected(mesh, object, options = {}) {
    if (this.selected?.material?.emissiveIntensity !== undefined) {
      this.selected.material.emissiveIntensity = this.selected.userData.previousEmissive ?? this.selected.material.emissiveIntensity;
    }
    this.selected = mesh;
    this.selectedObjectId = object?.id ?? mesh.userData?.twObject?.id ?? this.selectedObjectId;
    if (mesh.material?.emissiveIntensity !== undefined) {
      mesh.userData.previousEmissive = mesh.material.emissiveIntensity;
      mesh.material.emissive = new THREE.Color(COLORS.gold);
      mesh.material.emissiveIntensity = 0.55;
    }
    if (options.focus !== false) {
      this.focusMesh(mesh, options.mix ?? 0.35);
    }
  }

  focusObject(id) {
    const anchor = this.objectAnchors.get(id);
    if (!anchor) return;
    this.setSelected(anchor, anchor.userData?.twObject, { focus: false });
    this.focusMesh(anchor, 1);
  }

  setOntologyObjects(objects) {
    this.payloadObjects = objects;
    const byId = new Map(objects.map((object) => [object.id, object]));
    this.clickables.forEach((object3d) => {
      const current = object3d.userData?.twObject;
      if (current?.id && byId.has(current.id)) {
        object3d.userData.twObject = byId.get(current.id);
      }
    });
    this.objectAnchors.forEach((object3d, id) => {
      if (byId.has(id)) {
        object3d.userData.twObject = byId.get(id);
      }
    });
  }

  setWorldViewPayload(payload, objects = this.payloadObjects) {
    this.worldViewPayload = payload;
    const baseLayer = createWorldViewBaseLayer(payload, objects, {
      mapReference: this.mapBaseVisible ? this.mapReference : null,
    });
    const mapAligned = this.mapBaseVisible && Boolean(this.mapReference);
    const nextLayer = createWorldViewLayer(payload, objects, { mapAligned });
    this.clearPayloadOverlayAnimationState();
    const overlayKeys = Object.keys(this.layerVisibility).filter((key) => key !== 'tiles');
    const overlayGroups = Object.fromEntries(overlayKeys.map((key) => [key, new THREE.Group()]));

    this.replaceLayer('map', baseLayer);
    baseLayer.traverse((object3d) => {
      if (object3d.userData?.twObject) {
        this.registerAnchor(object3d.userData.twObject.id, object3d);
        this.clickables.push(object3d);
      }
    });

    nextLayer.children.slice().forEach((child) => {
      const overlay = child.userData?.overlay;
      if (overlayGroups[overlay]) {
        overlayGroups[overlay].add(child);
      }
    });

    Object.entries(overlayGroups).forEach(([key, group]) => {
      group.name = `payload ${key} overlay`;
      this.replaceLayer(key, group);
      group.traverse((object3d) => {
        if (object3d.userData?.twObject) {
          this.registerAnchor(object3d.userData.twObject.id, object3d);
          this.clickables.push(object3d);
        }
      });
      group.visible = this.layerVisibility[key] ?? true;
    });

    if (this.selectedObjectId && this.objectAnchors.has(this.selectedObjectId)) {
      const anchor = this.objectAnchors.get(this.selectedObjectId);
      this.setSelected(anchor, anchor.userData?.twObject, { focus: false });
    }

    this.payloadLayer = nextLayer;
    this.applySceneLodVisibility();
  }

  setMapReference(mapReference) {
    if (this.updateMapReferencePlaneTexture(mapReference)) {
      this.mapReference = mapReference;
      return;
    }
    this.mapReference = mapReference;
    if (this.worldViewPayload) {
      this.setWorldViewPayload(this.worldViewPayload, this.payloadObjects);
    }
  }

  clearPayloadOverlayAnimationState() {
    this.trains = [];
    this.rainBars = [];
    this.pmPuffs = [];
    this.incidentMarkers = [];
  }

  replaceLayer(key, group) {
    const previous = this.layers[key];
    if (previous) {
      this.scene.remove(previous);
      this.removeClickablesForRoot(previous);
      this.disposeObjectTree(previous);
    }
    this.layers[key] = group;
    this.scene.add(group);
    if (key === 'map') {
      this.mapReferencePlane = this.findMapReferencePlane(group);
    }
  }

  findMapReferencePlane(root) {
    let plane = null;
    root?.traverse((object3d) => {
      if (!plane && object3d.userData?.mapReferencePlane) plane = object3d;
    });
    return plane;
  }

  updateMapReferencePlaneTexture(mapReference) {
    if (!this.mapReferencePlane || !mapReference?.canvas || !this.sameMapReferenceFrame(this.mapReference?.frame, mapReference.frame)) {
      return false;
    }
    const material = this.mapReferencePlane.material;
    const texture = material?.map;
    if (!texture) return false;
    if (texture.image === mapReference.canvas) {
      texture.needsUpdate = true;
      return true;
    }
    if (texture.userData?.layerOwned) texture.dispose();
    const nextTexture = new THREE.CanvasTexture(mapReference.canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    nextTexture.userData.layerOwned = true;
    nextTexture.needsUpdate = true;
    material.map = nextTexture;
    material.needsUpdate = true;
    this.mapReferencePlane.userData.mapReferenceFrame = {
      ...(this.mapReferencePlane.userData.mapReferenceFrame ?? {}),
      bounds: mapReference.frame?.bounds ?? null,
      corners: mapReference.frame?.corners ?? null,
      pixelSize: mapReference.frame?.pixelSize ?? null,
      projection: mapReference.frame?.projection ?? null,
    };
    return true;
  }

  sameMapReferenceFrame(left, right) {
    if (!left || !right) return false;
    if (!this.sameBounds(left.bounds, right.bounds)) return false;
    return this.sameCornerSet(left.corners, right.corners)
      && this.samePixelSize(left.pixelSize, right.pixelSize)
      && (left.projection ?? null) === (right.projection ?? null);
  }

  sameCornerSet(left, right) {
    if (!left || !right) return false;
    return ['northwest', 'northeast', 'southeast', 'southwest'].every((key) => this.sameLngLat(left[key], right[key]));
  }

  sameLngLat(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    const epsilon = 0.0000001;
    return Math.abs(left[0] - right[0]) < epsilon && Math.abs(left[1] - right[1]) < epsilon;
  }

  samePixelSize(left, right) {
    if (!left || !right) return false;
    return left.width === right.width
      && left.height === right.height
      && left.cssWidth === right.cssWidth
      && left.cssHeight === right.cssHeight;
  }

  sameBounds(left, right) {
    if (!left || !right) return false;
    const epsilon = 0.0000001;
    return Math.abs(left.west - right.west) < epsilon
      && Math.abs(left.south - right.south) < epsilon
      && Math.abs(left.east - right.east) < epsilon
      && Math.abs(left.north - right.north) < epsilon;
  }

  disposeObjectTree(root) {
    root.traverse((object3d) => {
      object3d.geometry?.dispose?.();
      const materials = Array.isArray(object3d.material)
        ? object3d.material
        : [object3d.material].filter(Boolean);
      materials.forEach((material) => {
        ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach((key) => {
          const texture = material[key];
          if (texture?.userData?.layerOwned) texture.dispose();
        });
        material.dispose?.();
      });
    });
  }

  removeClickablesForRoot(root) {
    const removed = new Set();
    root.traverse((object3d) => removed.add(object3d));
    this.clickables = this.clickables.filter((object3d) => !removed.has(object3d));
    this.objectAnchors.forEach((object3d, id) => {
      if (removed.has(object3d)) {
        this.objectAnchors.delete(id);
      }
    });
  }

  focusMesh(mesh, mix = 1) {
    const position = new THREE.Vector3();
    mesh.getWorldPosition(position);
    const target = position.clone();
    target.y = Math.max(1.4, position.y * 0.45);
    this.controls.target.lerp(target, mix);

    const offset = this.mapBaseVisible && this.mapReference
      ? new THREE.Vector3(9.8, 9.4, 12.2)
      : new THREE.Vector3(28, 26, 34);
    const desired = target.clone().add(offset);
    this.camera.position.lerp(desired, Math.min(1, mix * 0.85));
    this.controls.update();
  }

  setLayer(key, visible) {
    this.layerVisibility[key] = visible;
    if (this.layers[key]) {
      this.layers[key].visible = visible;
    }
  }

  setMapBaseVisible(visible) {
    this.mapBaseVisible = visible;
    if (this.worldViewPayload) {
      this.setWorldViewPayload(this.worldViewPayload, this.payloadObjects);
    }
    this.applySceneLodVisibility();
    if (visible) {
      this.scene.background = new THREE.Color(COLORS.sky);
      this.renderer.setClearColor(COLORS.sky, 1);
      return;
    }
    this.scene.background = new THREE.Color('#FFF7FA');
    this.scene.fog.color.set('#FFF7FA');
    this.scene.fog.density = 0.0018;
    this.renderer.setClearColor('#FFF7FA', 1);
    this.frameVoxelDiorama();
  }

  frameVoxelDiorama() {
    this.controls.target.set(0, 1.35, -0.45);
    this.camera.position.set(12.5, 10.5, 15.5);
    this.controls.update();
  }

  applySceneLodVisibility() {
    const showVoxelWorld = true;
    const hideLegacySceneProps = Boolean(this.worldViewPayload);
    if (this.layers.tiles) this.layers.tiles.visible = false;
    if (this.layers.map) this.layers.map.visible = showVoxelWorld;
    if (this.layers.pipeline) this.layers.pipeline.visible = showVoxelWorld && !hideLegacySceneProps;
    if (this.layers.avatar) this.layers.avatar.visible = showVoxelWorld && !hideLegacySceneProps;
    ['mrt', 'bus', 'ubike', 'rain', 'pm25', 'incident'].forEach((key) => {
      if (this.layers[key]) this.layers[key].visible = showVoxelWorld && (this.layerVisibility[key] ?? true);
    });
  }

  setTime(minutes) {
    this.worldMinutes = minutes;
    this.updateSkyForTime(minutes);
  }

  applyPipelineFocus(key) {
    this.pipelineFocus = key;
    Object.entries(this.pipelineNodes).forEach(([nodeKey, mesh]) => {
      const focused = nodeKey === key;
      mesh.scale.setScalar(focused ? 1.22 : 1);
      mesh.material.emissiveIntensity = focused ? 0.52 : 0.08;
    });
  }

  resize() {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / Math.max(clientHeight, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  animate() {
    this.frame = requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const daylight = this.updateSkyForTime(this.worldMinutes);
    this.updateViewLod();

    this.trains.forEach((train) => {
      train.progress = (train.progress + dt * train.speed * (0.75 + daylight * 0.6)) % 1;
      const p = train.curve.getPointAt(train.progress);
      const p2 = train.curve.getPointAt((train.progress + 0.01) % 1);
      train.mesh.position.copy(p);
      train.mesh.rotation.y = Math.atan2(p2.x - p.x, p2.z - p.z);
    });

    this.rainBars.forEach((bar) => {
      const h = bar.userData.baseHeight * (0.74 + Math.sin(t * 1.2 + bar.userData.phase) * 0.12 + daylight * 0.08);
      bar.scale.y = Math.max(0.4, h);
      bar.position.y = bar.userData.base + Math.max(0.4, h) / 2;
    });

    this.pmPuffs.forEach((puff) => {
      puff.position.x += Math.sin(t + puff.userData.phase) * 0.002 * puff.userData.drift;
      puff.position.z += Math.cos(t * 0.8 + puff.userData.phase) * 0.002 * puff.userData.drift;
      puff.rotation.y += dt * 0.3;
    });

    this.incidentMarkers.forEach((marker) => {
      const pulse = 1 + Math.sin(t * 3 + marker.userData.phase) * 0.12;
      marker.scale.set(pulse, 1 + (pulse - 1) * 0.4, pulse);
    });

    this.petals.forEach((petal) => {
      petal.position.x += petal.userData.vx + Math.sin(t + petal.userData.phase) * 0.01;
      petal.position.y += petal.userData.vy;
      petal.position.z += petal.userData.vz;
      petal.rotation.x += dt * 0.9;
      petal.rotation.z += dt * 0.7;
      if (petal.position.y < 1) petal.position.y = 24;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateViewLod() {
    const distance = this.camera.position.distanceTo(this.controls.target);
    const next = distance > MAP_REFERENCE_DISTANCE ? 'map-reference' : 'voxel-diorama';
    if (next === this.viewLod) return;
    this.viewLod = next;
    this.callbacks.onLodChange?.(next);
  }

  updateSkyForTime(minutes) {
    const hour = (minutes % 1440) / 60;
    const daylight = Math.max(0, Math.sin((hour - 5.6) / 13.8 * Math.PI));
    const dawn = Math.max(0, 1 - Math.abs(hour - 6.2) / 2.2);
    const dusk = Math.max(0, 1 - Math.abs(hour - 18.2) / 2.5);
    const twilight = Math.max(dawn, dusk);
    const night = Math.max(0, 1 - daylight - twilight * 0.28);

    const daySky = new THREE.Color('#78C8F8');
    const noonSky = new THREE.Color('#50B0FF');
    const sunsetSky = new THREE.Color('#F8BBD0');
    const nightSky = new THREE.Color('#16244A');
    const sky = nightSky.clone().lerp(daySky, daylight).lerp(noonSky, Math.max(0, daylight - 0.72) * 0.5).lerp(sunsetSky, twilight * 0.48);
    if (this.mapBaseVisible) {
      this.scene.background = null;
      this.scene.fog.density = 0.0012 + night * 0.002 + twilight * 0.0008;
    } else {
      this.scene.background = sky;
    }

    const fog = this.mapBaseVisible
      ? new THREE.Color('#D8EEF8').lerp(new THREE.Color('#F7FBFE'), daylight * 0.72)
      : new THREE.Color('#2C3260').lerp(new THREE.Color(COLORS.sakuraMist), daylight).lerp(new THREE.Color('#F8C5D6'), twilight * 0.35);
    this.scene.fog.color.copy(fog);
    if (!this.mapBaseVisible) this.scene.fog.density = 0.0025 + night * 0.006 + twilight * 0.0018;

    this.ambient.color.set(new THREE.Color('#AFC8FF').lerp(new THREE.Color('#FFF7FA'), daylight).lerp(new THREE.Color('#FFD6E4'), this.mapBaseVisible ? twilight * 0.12 : twilight * 0.35));
    this.ambient.intensity = 0.54 + daylight * 0.78 + twilight * 0.2;
    this.hemi.color.set(new THREE.Color('#A7C4FF').lerp(new THREE.Color('#EAF8FF'), daylight));
    this.hemi.groundColor.set(new THREE.Color(this.mapBaseVisible ? '#CFE8F1' : '#382D5C').lerp(new THREE.Color(this.mapBaseVisible ? '#F7FBFE' : '#FFD7E6'), daylight));
    this.hemi.intensity = 0.34 + daylight * 0.48;
    this.sun.color.set(new THREE.Color('#F8A7C4').lerp(new THREE.Color('#FFFAF8'), daylight));
    this.sun.intensity = 0.18 + daylight * 1.58 + twilight * 0.42;
    this.roseFill.intensity = 0.2 + twilight * 0.62 + daylight * 0.18;
    this.renderer.toneMappingExposure = 0.92 + daylight * 0.28 + twilight * 0.08;

    return Math.max(0.2, daylight);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
