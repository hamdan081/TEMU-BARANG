import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCoordinate,
  hasValidCoordinates,
  haversineDistanceMeters,
  isInsideGeofence,
} from '../utils/locationMath.mjs';

test('Week 10 Task 01 — validasi koordinat GPS dan format koordinat', () => {
  assert.equal(hasValidCoordinates({ latitude: -7.9666, longitude: 112.6326 }), true);
  assert.equal(hasValidCoordinates({ latitude: 91, longitude: 112 }), false);
  assert.equal(hasValidCoordinates({ latitude: null, longitude: null }), false);
  assert.equal(hasValidCoordinates({ latitude: -7, longitude: '' }), false);
  assert.equal(formatCoordinate(-7.9666), '-7.966600');
});

test('Week 10 Task 03 — menghitung jarak dan mendeteksi geofence', () => {
  const center = { latitude: -7.9666, longitude: 112.6326 };
  const samePoint = { latitude: -7.9666, longitude: 112.6326 };
  const nearbyPoint = { latitude: -7.9670, longitude: 112.6326 };
  const farPoint = { latitude: -7.9800, longitude: 112.6326 };

  assert.equal(haversineDistanceMeters(center, samePoint), 0);
  assert.equal(haversineDistanceMeters({ latitude: null, longitude: null }, center), Infinity);
  assert.ok(haversineDistanceMeters(center, nearbyPoint) < 100);
  assert.equal(isInsideGeofence(nearbyPoint, center, 150), true);
  assert.equal(isInsideGeofence(farPoint, center, 300), false);
  assert.equal(isInsideGeofence(nearbyPoint, center, 0), false);
});
