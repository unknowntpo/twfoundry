import assert from 'node:assert/strict';
import { buildMapAlignmentDiagnostics } from '../src/mapAlignmentDiagnostics.js';

const basePayload = {
  objects: [],
  chunks: [{
    id: 'chunk-test',
    staticFeatures: [{
      id: 'building-source-matched',
      ontologyObjectId: 'obj-source-matched',
      kind: 'department-store',
      footprintSource: 'openfreemap:building/1',
      sourceGeometry: {
        type: 'Polygon',
        coordinates: [[
          [121.5200, 25.0520],
          [121.5201, 25.0520],
          [121.5201, 25.0521],
          [121.5200, 25.0521],
          [121.5200, 25.0520],
        ]],
      },
      visualState: { label: '新光三越', derivedFrom: 'maplibre-rendered-feature' },
    }, {
      id: 'building-misaligned',
      ontologyObjectId: 'obj-misaligned',
      kind: 'bookstore-mall',
      footprintSource: 'curated:bookstore',
      sourceGeometry: {
        type: 'Point',
        coordinates: [121.5210, 25.0520],
      },
      visualState: { label: '誠品南西' },
    }, {
      id: 'building-curated-only',
      ontologyObjectId: 'obj-curated-only',
      kind: 'lane-shop',
      footprintSource: 'curated:chifeng',
      sourceGeometry: {
        type: 'Point',
        coordinates: [121.5190, 25.0520],
      },
      visualState: { label: '赤峰街' },
    }, {
      id: 'station-alias',
      ontologyObjectId: 'obj-station-alias',
      kind: 'station-anchor',
      sourceGeometry: {
        type: 'Point',
        coordinates: [121.5206, 25.0527],
      },
      visualState: { label: '捷運中山站', aliases: ['中山'] },
    }, {
      id: 'building-unnamed',
      ontologyObjectId: 'obj-unnamed',
      kind: 'lane-shop',
      footprintSource: 'curated:unnamed',
      sourceGeometry: {
        type: 'Point',
        coordinates: [121.5190, 25.0520],
      },
      visualState: { sign: false },
    }],
  }],
};

const featureCatalog = {
  roads: [],
  areas: [],
  pois: [{
    id: 'poi-eslite',
    properties: { name: '誠品南西', sourceRef: 'openfreemap:poi/eslite' },
    geometry: { type: 'Point', coordinates: [121.5230, 25.0520] },
  }, {
    id: 'poi-zhongshan',
    properties: { name: '中山', sourceRef: 'openfreemap:poi/zhongshan-station' },
    geometry: { type: 'Point', coordinates: [121.5206, 25.0527] },
  }],
  buildings: [{
    id: 'building-shin-kong',
    properties: { name: '新光三越', sourceRef: 'openfreemap:building/1' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [121.5200, 25.0520],
        [121.5201, 25.0520],
        [121.5201, 25.0521],
        [121.5200, 25.0521],
        [121.5200, 25.0520],
      ]],
    },
  }],
};

const report = buildMapAlignmentDiagnostics(basePayload, featureCatalog, { thresholdMeters: 15 });
assert.equal(report.total, 4);
assert.equal(report.statusCounts.SOURCE_MATCHED, 2);
assert.equal(report.statusCounts.MISALIGNED, 1);
assert.equal(report.statusCounts.CURATED_ONLY, 1);

const sourceMatched = report.diagnostics.find((item) => item.id === 'building-source-matched');
assert.equal(sourceMatched.status, 'SOURCE_MATCHED');
assert.equal(sourceMatched.matchSourceRef, 'openfreemap:building/1');

const misaligned = report.diagnostics.find((item) => item.id === 'building-misaligned');
assert.equal(misaligned.status, 'MISALIGNED');
assert.equal(misaligned.matchName, '誠品南西');
assert.equal(misaligned.matchType, 'name');
assert.ok(misaligned.distanceMeters > 15);

const curatedOnly = report.diagnostics.find((item) => item.id === 'building-curated-only');
assert.equal(curatedOnly.status, 'CURATED_ONLY');
assert.equal(curatedOnly.matchSourceRef, null);

const stationAlias = report.diagnostics.find((item) => item.id === 'station-alias');
assert.equal(stationAlias.status, 'SOURCE_MATCHED');
assert.equal(stationAlias.matchName, '中山');

const waitingForCatalog = buildMapAlignmentDiagnostics(basePayload, null);
assert.equal(waitingForCatalog.status, 'WAITING_FOR_CATALOG');
assert.equal(waitingForCatalog.total, 0);

const waitingForPayload = buildMapAlignmentDiagnostics(null, featureCatalog);
assert.equal(waitingForPayload.status, 'WAITING_FOR_PAYLOAD');
assert.equal(waitingForPayload.total, 0);

const broadNameMatchPayload = {
  ...basePayload,
  chunks: [{
    id: 'chunk-test',
    staticFeatures: [{
      id: 'station-without-alias',
      ontologyObjectId: 'obj-station-without-alias',
      kind: 'station-anchor',
      sourceGeometry: { type: 'Point', coordinates: [121.5206, 25.0527] },
      visualState: { label: '捷運中山站' },
    }],
  }],
};
const broadNameReport = buildMapAlignmentDiagnostics(broadNameMatchPayload, featureCatalog);
assert.equal(broadNameReport.diagnostics[0].status, 'CURATED_ONLY');

const externalSourceSameNamePayload = {
  ...basePayload,
  chunks: [{
    id: 'chunk-test',
    staticFeatures: [{
      id: 'external-station-anchor',
      ontologyObjectId: 'external-station-object',
      kind: 'station-anchor',
      sourceGeometry: { type: 'Point', coordinates: [121.5170, 25.0463] },
      visualState: { label: '台北車站', sourceRef: 'tdx:mrt-station/R10-BL13' },
    }],
  }],
};
const externalSourceSameNameReport = buildMapAlignmentDiagnostics(externalSourceSameNamePayload, {
  roads: [],
  areas: [],
  buildings: [],
  pois: [{
    id: 'poi-taipei-main-station',
    properties: { name: '台北車站', sourceRef: 'openfreemap:poi/taipei-main-station' },
    geometry: { type: 'Point', coordinates: [121.5208, 25.0463] },
  }],
}, { thresholdMeters: 15 });
assert.equal(externalSourceSameNameReport.diagnostics[0].status, 'CURATED_ONLY');
assert.equal(externalSourceSameNameReport.diagnostics[0].matchSourceRef, null);

const externalSourceSameGeometryPayload = {
  objects: [],
  chunks: [{
    id: 'chunk-external-geometry',
    staticFeatures: [{
      id: 'external-polygon-anchor',
      ontologyObjectId: 'external-polygon-object',
      kind: 'department-store',
      footprintSource: 'tdx:external-polygon/1',
      sourceGeometry: {
        type: 'Polygon',
        coordinates: [[
          [121.5200, 25.0520],
          [121.5204, 25.0520],
          [121.5204, 25.0524],
          [121.5200, 25.0524],
          [121.5200, 25.0520],
        ]],
      },
      visualState: { label: '外部來源建物' },
    }],
  }],
};
const externalSourceSameGeometryReport = buildMapAlignmentDiagnostics(externalSourceSameGeometryPayload, {
  roads: [],
  areas: [],
  pois: [],
  buildings: [{
    id: 'same-geometry-building',
    properties: { name: '外部來源建物', sourceRef: 'openfreemap:building/same-geometry' },
    geometry: externalSourceSameGeometryPayload.chunks[0].staticFeatures[0].sourceGeometry,
  }],
}, { thresholdMeters: 15 });
assert.equal(externalSourceSameGeometryReport.diagnostics[0].status, 'CURATED_ONLY');
assert.equal(externalSourceSameGeometryReport.diagnostics[0].matchSourceRef, null);

const largeFootprintPayload = {
  objects: [],
  chunks: [{
    id: 'chunk-large',
    staticFeatures: [{
      id: 'large-footprint',
      ontologyObjectId: 'large-footprint-object',
      kind: 'department-store',
      footprintSource: 'openfreemap:building/large',
      sourceGeometry: {
        type: 'Polygon',
        coordinates: [[
          [121.5200, 25.0520],
          [121.5205, 25.0520],
          [121.5205, 25.0525],
          [121.5200, 25.0525],
          [121.5200, 25.0520],
        ]],
      },
      visualState: { label: '大型建物' },
    }],
  }],
};
const largeFootprintCatalog = {
  buildings: [{
    id: 'large-footprint-rendered',
    properties: { name: '大型建物', sourceRef: 'openfreemap:building/large' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [121.5200, 25.0520],
        [121.5205, 25.0520],
        [121.5205, 25.0525],
        [121.5200, 25.0525],
        [121.5200, 25.0520],
      ]],
    },
  }],
  roads: [],
  areas: [],
  pois: [],
};
const largeFootprintReport = buildMapAlignmentDiagnostics(largeFootprintPayload, largeFootprintCatalog, { thresholdMeters: 15 });
assert.equal(largeFootprintReport.diagnostics[0].status, 'SOURCE_MATCHED');
assert.equal(largeFootprintReport.diagnostics[0].distanceMeters, 0);

const reversedRingCatalog = {
  ...largeFootprintCatalog,
  buildings: [{
    ...largeFootprintCatalog.buildings[0],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [121.5200, 25.0520],
        [121.5200, 25.0525],
        [121.5205, 25.0525],
        [121.5205, 25.0520],
        [121.5200, 25.0520],
      ]],
    },
  }],
};
const reversedRingReport = buildMapAlignmentDiagnostics(largeFootprintPayload, reversedRingCatalog, { thresholdMeters: 15 });
assert.equal(reversedRingReport.diagnostics[0].status, 'SOURCE_MATCHED');

const emptyCatalogReport = buildMapAlignmentDiagnostics(basePayload, {
  roads: [],
  buildings: [],
  areas: [],
  pois: [],
  summary: { roads: 0, buildings: 0, areas: 0, pois: 0 },
});
assert.equal(emptyCatalogReport.status, 'EMPTY_CATALOG');
assert.equal(emptyCatalogReport.total, 0);
assert.ok(emptyCatalogReport.warnings.includes('rendered map catalog has no usable features'));

const sourceRefWrongKindCatalog = {
  buildings: [],
  areas: [],
  pois: [],
  roads: [{
    id: 'source-ref-wrong-kind',
    properties: { name: '另一條路', sourceRef: 'openfreemap:building/large' },
    geometry: { type: 'LineString', coordinates: [[121.5200, 25.0520], [121.5205, 25.0520]] },
  }],
};
const sourceRefWrongKindReport = buildMapAlignmentDiagnostics(largeFootprintPayload, sourceRefWrongKindCatalog);
assert.equal(sourceRefWrongKindReport.diagnostics[0].status, 'NO_MAP_MATCH');
assert.ok(sourceRefWrongKindReport.warnings.some((warning) => warning.includes('department-store (building/poi)')));

const buildingOnlyCatalogReport = buildMapAlignmentDiagnostics(largeFootprintPayload, {
  buildings: largeFootprintCatalog.buildings,
  roads: [],
  areas: [],
  pois: [],
});
assert.equal(buildingOnlyCatalogReport.diagnostics[0].status, 'SOURCE_MATCHED');
assert.deepEqual(buildingOnlyCatalogReport.warnings, []);

const geometryVerifiedPayload = {
  objects: [],
  chunks: [{
    id: 'chunk-geometry',
    staticFeatures: [{
      id: 'fixture-footprint',
      ontologyObjectId: 'fixture-footprint-object',
      kind: 'department-store',
      footprintSource: 'fixture-osm:way/local-building',
      sourceGeometry: largeFootprintPayload.chunks[0].staticFeatures[0].sourceGeometry,
      visualState: { label: '本地商場' },
    }],
  }],
};
const geometryVerifiedReport = buildMapAlignmentDiagnostics(geometryVerifiedPayload, largeFootprintCatalog, { thresholdMeters: 15 });
assert.equal(geometryVerifiedReport.diagnostics[0].status, 'GEOMETRY_VERIFIED');
assert.equal(geometryVerifiedReport.diagnostics[0].matchType, 'geometry');
assert.equal(geometryVerifiedReport.diagnostics[0].distanceMeters, 0);

const geometryMisalignedReport = buildMapAlignmentDiagnostics(geometryVerifiedPayload, {
  buildings: [{
    id: 'far-footprint',
    properties: { name: '遠方商場', sourceRef: 'openfreemap:building/far' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [121.5250, 25.0580],
        [121.5255, 25.0580],
        [121.5255, 25.0585],
        [121.5250, 25.0585],
        [121.5250, 25.0580],
      ]],
    },
  }],
  roads: [],
  areas: [],
  pois: [],
}, { thresholdMeters: 15 });
assert.equal(geometryMisalignedReport.diagnostics[0].status, 'MISALIGNED');

const multiPolygonReport = buildMapAlignmentDiagnostics(geometryVerifiedPayload, {
  buildings: [{
    id: 'multi-footprint',
    properties: { name: '多重建物', sourceRef: 'openfreemap:building/multi' },
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [[[121.5300, 25.0600], [121.5305, 25.0600], [121.5305, 25.0605], [121.5300, 25.0605], [121.5300, 25.0600]]],
        largeFootprintCatalog.buildings[0].geometry.coordinates,
      ],
    },
  }],
  roads: [],
  areas: [],
  pois: [],
}, { thresholdMeters: 15 });
assert.equal(multiPolygonReport.diagnostics[0].status, 'GEOMETRY_VERIFIED');
assert.equal(multiPolygonReport.diagnostics[0].distanceMeters, 0);

const linePayload = {
  objects: [],
  chunks: [{
    id: 'chunk-line',
    staticFeatures: [{
      id: 'road-line',
      ontologyObjectId: 'road-line-object',
      kind: 'road-corridor',
      sourceRef: 'fixture-osm:way/road-line',
      sourceGeometry: { type: 'LineString', coordinates: [[121.5200, 25.0520], [121.5205, 25.0520]] },
      visualState: { label: '測試道路' },
    }],
  }],
};
const multiLineReport = buildMapAlignmentDiagnostics(linePayload, {
  roads: [{
    id: 'multi-road',
    properties: { name: '多重道路', sourceRef: 'openfreemap:road/multi' },
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [[121.5300, 25.0600], [121.5305, 25.0600]],
        [[121.5200, 25.0520], [121.5205, 25.0520]],
      ],
    },
  }],
  buildings: [],
  areas: [],
  pois: [],
}, { thresholdMeters: 15 });
assert.equal(multiLineReport.diagnostics[0].status, 'GEOMETRY_VERIFIED');
assert.equal(multiLineReport.diagnostics[0].distanceMeters, 0);

const duplicateGeometryReport = buildMapAlignmentDiagnostics({
  objects: [],
  chunks: [{
    id: 'chunk-duplicates',
    staticFeatures: [{
      id: 'fixture-footprint-a',
      ontologyObjectId: 'fixture-footprint-a-object',
      kind: 'department-store',
      footprintSource: 'fixture-osm:way/local-building-a',
      sourceGeometry: largeFootprintPayload.chunks[0].staticFeatures[0].sourceGeometry,
      visualState: { label: '本地商場 A' },
    }, {
      id: 'fixture-footprint-b',
      ontologyObjectId: 'fixture-footprint-b-object',
      kind: 'department-store',
      footprintSource: 'fixture-osm:way/local-building-b',
      sourceGeometry: largeFootprintPayload.chunks[0].staticFeatures[0].sourceGeometry,
      visualState: { label: '本地商場 B' },
    }],
  }],
}, largeFootprintCatalog, { thresholdMeters: 15 });
assert.equal(duplicateGeometryReport.statusCounts.GEOMETRY_VERIFIED, 2);
assert.ok(duplicateGeometryReport.warnings.some((warning) => warning.includes('multiple landmarks share rendered map feature openfreemap:building/large')));

const unknownKindReport = buildMapAlignmentDiagnostics({
  objects: [],
  chunks: [{
    id: 'chunk-unknown-kind',
    staticFeatures: [{
      id: 'unknown-feature',
      ontologyObjectId: 'unknown-object',
      kind: 'future-kind',
      sourceRef: 'openfreemap:building/large',
      sourceGeometry: { type: 'Point', coordinates: [121.5200, 25.0520] },
      visualState: { label: '大型建物', derivedFrom: 'maplibre-rendered-feature' },
    }],
  }],
}, largeFootprintCatalog);
assert.equal(unknownKindReport.diagnostics[0].status, 'NO_MAP_MATCH');
assert.ok(unknownKindReport.warnings.some((warning) => warning.includes('future-kind (any)')));

console.log('mapAlignmentDiagnostics tests passed');
