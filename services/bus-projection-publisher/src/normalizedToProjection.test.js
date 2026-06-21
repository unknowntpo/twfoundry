import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProjectionFromNormalizedRows,
  groupRowsBySlot,
  normalizedRowToTdxShape,
  slotMetaFromRow,
} from './normalizedToProjection.js';

const sampleRow = {
  schema: 'twfoundry.normalized.tdx.bus_vehicle_position.v1',
  slot_key: '2026-06-19T11:45+08:00',
  service_date: '2026-06-19',
  slot_label: '11:45',
  city: 'Taipei',
  vehicle_id: '020-U3',
  route_uid: 'TPE10872',
  route_name: '46',
  direction: 0,
  longitude: 121.568485,
  latitude: 25.032742,
  speed_kph: 22,
  azimuth_deg: 140,
  gps_time: '2026-06-19T15:10:15+08:00',
  update_time: '2026-06-19T15:10:29+08:00',
  freshness: 'fresh',
  completeness: 1,
  ingested_at: '2026-06-19T07:10:32.318Z',
};

test('normalizedRowToTdxShape maps lake fields to projection contract input', () => {
  const mapped = normalizedRowToTdxShape(sampleRow);
  assert.equal(mapped.PlateNumb, '020-U3');
  assert.equal(mapped.RouteUID, 'TPE10872');
  assert.equal(mapped.BusPosition.PositionLon, 121.568485);
});

test('groupRowsBySlot groups by slot_key', () => {
  const other = { ...sampleRow, slot_key: '2026-06-19T11:40+08:00', vehicle_id: '999' };
  const groups = groupRowsBySlot([sampleRow, other, { ...sampleRow, vehicle_id: '021' }]);
  assert.equal(groups.size, 2);
  assert.equal(groups.get('2026-06-19T11:45+08:00').length, 2);
});

test('buildProjectionFromNormalizedRows produces contract-shaped projection', () => {
  const slot = slotMetaFromRow(sampleRow);
  const projection = buildProjectionFromNormalizedRows([sampleRow], slot, sampleRow.ingested_at);
  assert.equal(projection.layerId, 'bus_vehicles');
  assert.equal(projection.projectionType, 'vehicle_position_projection');
  assert.equal(projection.features.length, 1);
  assert.equal(projection.features[0].vehicleId, '020-U3');
  assert.equal(projection.source.mode, 'homelab-lake-publisher');
});
