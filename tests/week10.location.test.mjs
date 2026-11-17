import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCoordinate,
  formatAccuracy,
  hasValidCoordinates,
  haversineDistanceMeters,
  isInsideGeofence,
  isValidAccuracy,
} from '../utils/locationMath.mjs';

test('Week 10 Task 01 — validasi koordinat GPS dan format koordinat', () => {
  // Valid coordinates
  assert.equal(hasValidCoordinates({ latitude: -7.9666, longitude: 112.6326 }), true);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(hasValidCoordinates({ latitude: -90, longitude: -180 }), true);
  assert.equal(hasValidCoordinates({ latitude: 90, longitude: 180 }), true);

  // Invalid coordinates (out of range / null / non-numeric)
  assert.equal(hasValidCoordinates({ latitude: 91, longitude: 112 }), false);
  assert.equal(hasValidCoordinates({ latitude: -91, longitude: 112 }), false);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: 181 }), false);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: -181 }), false);
  assert.equal(hasValidCoordinates({ latitude: null, longitude: null }), false);
  assert.equal(hasValidCoordinates({ latitude: -7, longitude: '' }), false);
  assert.equal(hasValidCoordinates(null), false);
  assert.equal(hasValidCoordinates(undefined), false);

  // Formatting coordinate
  assert.equal(formatCoordinate(-7.9666), '-7.966600');
  assert.equal(formatCoordinate(112.63261234), '112.632612');
  assert.equal(formatCoordinate(null), '-');
  assert.equal(formatCoordinate('invalid'), '-');
});

test('Week 10 Task 01 — validasi dan format akurasi GPS perangkat', () => {
  // Accuracy validation
  assert.equal(isValidAccuracy(5), true);
  assert.equal(isValidAccuracy(0), true);
  assert.equal(isValidAccuracy(150.8), true);
  assert.equal(isValidAccuracy(-1), false);
  assert.equal(isValidAccuracy(null), false);
  assert.equal(isValidAccuracy(undefined), false);
  assert.equal(isValidAccuracy('abc'), false);

  // Accuracy formatting
  assert.equal(formatAccuracy(8), '±8 meter (Sangat Baik)');
  assert.equal(formatAccuracy(25), '±25 meter (Sangat Baik)');
  assert.equal(formatAccuracy(45.4), '±45 meter (Cukup)');
  assert.equal(formatAccuracy(95), '±95 meter (Cukup)');
  assert.equal(formatAccuracy(120), '±120 meter (Rendah)');
  assert.equal(formatAccuracy(null), 'Tidak tersedia');
  assert.equal(formatAccuracy(-5), 'Tidak tersedia');
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
