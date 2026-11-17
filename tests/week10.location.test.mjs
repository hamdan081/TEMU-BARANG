import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCoordinate,
  formatAccuracy,
  hasValidCoordinates,
  haversineDistanceMeters,
  isInsideGeofence,
  isValidAccuracy,
  isAccuracyAcceptable,
  getMarkerPinColor,
  calculateBoundingRegion,
  formatMarkerInfo,
  formatGeocodedAddress,
  calculateGeofenceTransition,
  CAMPUS_PRESETS,
  formatGeofenceEventLog,
  getBatteryOptimizationSettings,
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

test('Week 10 Task 03 — menghitung jarak Haversine dan isInsideGeofence', () => {
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

test('Week 10 Task 03 — Reverse Geocoding: format alamat dari objek geocoding', () => {
  // Objek geocoding lengkap
  const placeFull = {
    street: 'Jl. Veteran',
    streetNumber: 'No. 8',
    district: 'Lowokwaru',
    subregion: 'Malang',
    city: 'Kota Malang',
    region: 'Jawa Timur',
    postalCode: '65145',
    country: 'Indonesia',
  };
  const addressFull = formatGeocodedAddress(placeFull);
  assert.ok(addressFull.includes('Jl. Veteran No. 8'));
  assert.ok(addressFull.includes('Lowokwaru'));
  assert.ok(addressFull.includes('Kota Malang'));
  assert.ok(addressFull.includes('Jawa Timur'));
  assert.ok(addressFull.includes('65145'));
  assert.ok(addressFull.includes('Indonesia'));

  // Objek parsial tanpa nama jalan/nomor
  const placePartial = {
    district: 'Klojen',
    city: 'Malang',
    region: 'Jawa Timur',
    country: 'Indonesia',
  };
  const addressPartial = formatGeocodedAddress(placePartial);
  assert.equal(addressPartial, 'Klojen, Malang, Jawa Timur, Indonesia');

  // Objek kosong atau null
  assert.equal(formatGeocodedAddress(null), '');
  assert.equal(formatGeocodedAddress(undefined), '');
  assert.equal(formatGeocodedAddress({}), '');

  // Deduping bagian alamat yang identik (case-insensitive)
  const placeDuplicate = {
    street: 'Kampus',
    district: 'Malang',
    city: 'malang',
    country: 'Indonesia',
  };
  const addressDedup = formatGeocodedAddress(placeDuplicate);
  assert.equal(addressDedup, 'Kampus, Malang, Indonesia');
});

test('Week 10 Task 03 — Geofencing: deteksi transisi Enter Event dan Exit Event', () => {
  const center = { latitude: -7.9666, longitude: 112.6326 };
  const insidePoint = { latitude: -7.9667, longitude: 112.6326 }; // ~11 meter
  const outsidePoint = { latitude: -7.9710, longitude: 112.6326 }; // ~489 meter

  // 1. Initial State Check (wasInside = null)
  const initialInside = calculateGeofenceTransition({
    wasInside: null,
    currentLocation: insidePoint,
    center,
    radius: 300,
  });
  assert.equal(initialInside.nowInside, true);
  assert.equal(initialInside.event, null); // Belum ada transisi karena ini status awal

  const initialOutside = calculateGeofenceTransition({
    wasInside: null,
    currentLocation: outsidePoint,
    center,
    radius: 300,
  });
  assert.equal(initialOutside.nowInside, false);
  assert.equal(initialOutside.event, null);

  // 2. ENTER Event (sebelumnya di luar, sekarang masuk ke dalam)
  const enterTransition = calculateGeofenceTransition({
    wasInside: false,
    currentLocation: insidePoint,
    center,
    radius: 300,
  });
  assert.equal(enterTransition.nowInside, true);
  assert.equal(enterTransition.event, 'ENTER');

  // 3. EXIT Event (sebelumnya di dalam, sekarang keluar)
  const exitTransition = calculateGeofenceTransition({
    wasInside: true,
    currentLocation: outsidePoint,
    center,
    radius: 300,
  });
  assert.equal(exitTransition.nowInside, false);
  assert.equal(exitTransition.event, 'EXIT');

  // 4. No Event (tetap di dalam)
  const stayInside = calculateGeofenceTransition({
    wasInside: true,
    currentLocation: insidePoint,
    center,
    radius: 300,
  });
  assert.equal(stayInside.nowInside, true);
  assert.equal(stayInside.event, null);

  // 5. No Event (tetap di luar)
  const stayOutside = calculateGeofenceTransition({
    wasInside: false,
    currentLocation: outsidePoint,
    center,
    radius: 300,
  });
  assert.equal(stayOutside.nowInside, false);
  assert.equal(stayOutside.event, null);
});

test('Week 10 Task 03 — Geofencing: mekanisme Hysteresis mencegah flapping di perbatasan', () => {
  const center = { latitude: -7.9666, longitude: 112.6326 };
  // 1 deg lat ~ 111,000 m. Jarak 305 meter: ~ 0.002747 deg
  const radius = 300;
  const hysteresis = 20; // threshold keluar: 320m, threshold masuk: 280m

  // Titik berada di jarak 308 meter (tepat di luar radius 300m tapi masih dalam buffer hysteresis 320m)
  const nearBorderPoint = { latitude: -7.9666 + 308 / 111000, longitude: 112.6326 };
  const dist = haversineDistanceMeters(nearBorderPoint, center);
  assert.ok(dist > 300 && dist < 320, `Jarak (${dist}m) harus antara 300m dan 320m`);

  // Jika sebelumnya perangkat di DALAM (wasInside = true):
  // Karena dist <= (300 + 20 = 320m), perangkat tetap dianggap di dalam (mencegah false EXIT akibat GPS jitter)
  const transitionInside = calculateGeofenceTransition({
    wasInside: true,
    currentLocation: nearBorderPoint,
    center,
    radius,
    hysteresis,
  });
  assert.equal(transitionInside.nowInside, true);
  assert.equal(transitionInside.event, null);

  // Jika sebelumnya perangkat di LUAR (wasInside = false):
  // Untuk memicu ENTER, perangkat harus masuk lebih dalam dari (300 - 20 = 280m).
  // Karena 308m > 280m, perangkat tetap di luar (mencegah false ENTER)
  const transitionOutside = calculateGeofenceTransition({
    wasInside: false,
    currentLocation: nearBorderPoint,
    center,
    radius,
    hysteresis,
  });
  assert.equal(transitionOutside.nowInside, false);
  assert.equal(transitionOutside.event, null);
});

test('Week 10 Task 03 — Preset area kampus TemuBarang dan format log peristiwa', () => {
  // Validasi presets kampus
  assert.ok(CAMPUS_PRESETS.length >= 4);
  for (const preset of CAMPUS_PRESETS) {
    assert.ok(preset.id);
    assert.ok(preset.name);
    assert.ok(hasValidCoordinates(preset));
    assert.ok(preset.defaultRadius > 0);
  }

  // Format log peristiwa
  const enterLog = formatGeofenceEventLog('ENTER', 1700000000000);
  assert.ok(enterLog.includes('Memasuki Area (ENTER)'));

  const exitLog = formatGeofenceEventLog('EXIT', 1700000000000);
  assert.ok(exitLog.includes('Keluar dari Area (EXIT)'));
});

test('Week 10 Task 03 — Location Battery Optimization: parameter dan validasi filter sinyal rendah', () => {
  const settings = getBatteryOptimizationSettings();
  assert.equal(settings.accuracyMode, 'Balanced');
  assert.equal(settings.timeIntervalMs, 10000);
  assert.equal(settings.distanceIntervalMeters, 25);
  assert.equal(settings.maxLowAccuracyFilterMeters, 100);

  // Filter akurasi rendah (> 100m)
  assert.equal(isAccuracyAcceptable(15), true);
  assert.equal(isAccuracyAcceptable(80), true);
  assert.equal(isAccuracyAcceptable(100), true);
  assert.equal(isAccuracyAcceptable(101), false);
  assert.equal(isAccuracyAcceptable(250), false);
  assert.equal(isAccuracyAcceptable(null), false);
});
