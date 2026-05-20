import assert from 'node:assert/strict';
import {
  activeOverlayCount,
  defaultOverlayVisibility,
  overlayCategories,
  overlayLayerControls,
  overlayRegistry,
  overlaysByCategory,
} from '../src/overlayRegistry.js';
import {
  applyRegisteredOverlayVisibility,
  mrtRouteLayerIds,
  mrtStationLayerIds,
} from '../src/mapOverlayRenderers.js';

const requiredCategories = ['moving', 'station', 'route', 'environment', 'incident', 'analytics'];
assert.deepEqual(overlayCategories.map((category) => category.id), requiredCategories);

const ids = overlayRegistry.map((overlay) => overlay.id);
assert.equal(new Set(ids).size, ids.length, 'overlay ids must be unique');
assert.ok(ids.includes('mrt-routes'));
assert.ok(ids.includes('mrt-stations'));
assert.ok(ids.includes('population-analytics'));

for (const overlay of overlayRegistry) {
  assert.ok(requiredCategories.includes(overlay.category), `${overlay.id} category is registered`);
  assert.ok(overlay.visibility && typeof overlay.visibility.defaultVisible === 'boolean');
  assert.ok(overlay.renderer?.provider, `${overlay.id} declares renderer provider`);
  assert.ok(Array.isArray(overlay.dataDependencies), `${overlay.id} declares dependencies`);
}

const defaults = defaultOverlayVisibility();
assert.equal(defaults['mrt-routes'], true);
assert.equal(defaults['mrt-stations'], true);
assert.equal(defaults['population-analytics'], false);
assert.equal(activeOverlayCount(defaults), overlayRegistry.filter((overlay) => overlay.visibility.defaultVisible).length);

const grouped = overlaysByCategory(overlayLayerControls);
assert.deepEqual(grouped.map((group) => group.id), requiredCategories);
assert.ok(grouped.find((group) => group.id === 'station').overlays.length >= 3);
assert.ok(grouped.find((group) => group.id === 'environment').overlays.length >= 2);

const visibilityWrites = [];
const fakeMap = {
  getLayer(id) {
    return [...mrtRouteLayerIds, ...mrtStationLayerIds].includes(id);
  },
  setLayoutProperty(id, property, value) {
    visibilityWrites.push({ id, property, value });
  },
};

applyRegisteredOverlayVisibility(fakeMap, {
  'mrt-routes': false,
  'mrt-stations': true,
});

assert.ok(mrtRouteLayerIds.every((id) => visibilityWrites.some((write) => (
  write.id === id && write.property === 'visibility' && write.value === 'none'
))));
assert.ok(mrtStationLayerIds.every((id) => visibilityWrites.some((write) => (
  write.id === id && write.property === 'visibility' && write.value === 'visible'
))));

console.log('overlayRegistry tests passed');
