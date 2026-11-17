import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCoordinate,
  formatAccuracy,
  hasValidCoordinates,
  haversineDistanceMeters,
  isInsideGeofence,
  isValidAccuracy,
  getMarkerPinColor,
  calculateBoundingRegion,
  formatMarkerInfo,
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

test('Week 10 Task 02 — Map marker pin colors, camera bounding region, dan marker info', () => {
  // 1. Marker Pin Colors
  assert.equal(getMarkerPinColor('Hilang'), '#DC2626'); // Merah untuk Barang Hilang
  assert.equal(getMarkerPinColor('Ditemukan'), '#16A34A'); // Hijau untuk Barang Ditemukan
  assert.equal(getMarkerPinColor('user'), '#1565C0'); // Biru untuk Lokasi Pengguna
  assert.equal(getMarkerPinColor('geofence'), '#7C3AED'); // Ungu untuk Geofence Center
  assert.equal(getMarkerPinColor('unknown'), '#64748B');

  // 2. Camera Bounding Region
  const emptyRegion = calculateBoundingRegion([]);
  assert.equal(emptyRegion.latitude, -7.9666);
  assert.equal(emptyRegion.longitude, 112.6326);

  const singleCoord = [{ latitude: -7.95, longitude: 112.60 }];
  const singleRegion = calculateBoundingRegion(singleCoord);
  assert.equal(singleRegion.latitude, -7.95);
  assert.equal(singleRegion.longitude, 112.60);

  const multiCoords = [
    { latitude: -7.90, longitude: 112.60 },
    { latitude: -8.00, longitude: 112.70 },
  ];
  const multiRegion = calculateBoundingRegion(multiCoords);
  assert.equal(multiRegion.latitude, -7.95);
  assert.equal(multiRegion.longitude, 112.65);
  assert.ok(multiRegion.latitudeDelta > 0.1);
  assert.ok(multiRegion.longitudeDelta > 0.1);

  // 3. Marker Info Formatting
  const lostItem = {
    id: 1,
    nama: 'Kunci Motor Honda',
    jenisLaporan: 'Hilang',
    lokasi: 'Parkiran Gedung F',
    latitude: -7.966612,
    longitude: 112.632634,
    accuracy: 12,
  };
  const lostInfo = formatMarkerInfo(lostItem);
  assert.equal(lostInfo.title, 'Kunci Motor Honda');
  assert.equal(lostInfo.typeLabel, 'Barang Hilang');
  assert.equal(lostInfo.pinColor, '#DC2626');
  assert.equal(lostInfo.latitude, '-7.966612');
  assert.equal(lostInfo.longitude, '112.632634');
  assert.equal(lostInfo.accuracy, '±12 meter (Sangat Baik)');

  const foundItem = {
    id: 2,
    nama: 'Tumbler Eiger Hitam',
    jenisLaporan: 'Ditemukan',
    lokasi: 'Perpustakaan Lt 2',
    latitude: -7.965500,
    longitude: 112.631100,
  };
  const foundInfo = formatMarkerInfo(foundItem);
  assert.equal(foundInfo.title, 'Tumbler Eiger Hitam');
  assert.equal(foundInfo.typeLabel, 'Barang Ditemukan');
  assert.equal(foundInfo.pinColor, '#16A34A');

  const userMarker = {
    type: 'user',
    latitude: -7.967000,
    longitude: 112.630000,
    address: 'Jl. Veteran No. 8',
    accuracy: 8,
  };
  const userInfo = formatMarkerInfo(userMarker);
  assert.equal(userInfo.title, 'Lokasi Pengguna (Saya)');
  assert.equal(userInfo.pinColor, '#1565C0');
  assert.equal(userInfo.address, 'Jl. Veteran No. 8');
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
