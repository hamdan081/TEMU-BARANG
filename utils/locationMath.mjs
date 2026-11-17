/**
 * Fungsi geometri dan kalkulasi lokasi murni untuk TemuBarang.
 * Tidak bergantung pada runtime native perangkat sehingga dapat diuji dengan Node.js.
 */
const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(from, to) {
  if (!hasValidCoordinates(from) || !hasValidCoordinates(to)) return Infinity;
  const values = [from.latitude, from.longitude, to.latitude, to.longitude].map(Number);
  if (!values.every(Number.isFinite)) return Infinity;

  const [lat1, lon1, lat2, lon2] = values;
  const toRadians = value => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);
  const rawA =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLongitude / 2) ** 2;
  const a = Math.min(1, Math.max(0, rawA));

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGeofence(location, center, radiusMeters) {
  const radius = Number(radiusMeters);
  if (!Number.isFinite(radius) || radius <= 0) return false;
  return haversineDistanceMeters(location, center) <= radius;
}

export function hasValidCoordinates(value) {
  if (!value || value.latitude === null || value.latitude === undefined || value.latitude === '' ||
      value.longitude === null || value.longitude === undefined || value.longitude === '') return false;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function formatCoordinate(value) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : '-';
}

export function isValidAccuracy(accuracy) {
  if (accuracy === null || accuracy === undefined || accuracy === '') return false;
  const num = Number(accuracy);
  return Number.isFinite(num) && num >= 0;
}

export function isAccuracyAcceptable(accuracy, threshold = 100) {
  if (!isValidAccuracy(accuracy)) return false;
  return Number(accuracy) <= threshold;
}

export function formatAccuracy(accuracy) {
  if (!isValidAccuracy(accuracy)) return 'Tidak tersedia';
  const rounded = Math.round(Number(accuracy));
  if (rounded <= 30) return `±${rounded} meter (Sangat Baik)`;
  if (rounded <= 100) return `±${rounded} meter (Cukup)`;
  return `±${rounded} meter (Rendah)`;
}

export function getMarkerPinColor(jenisLaporan) {
  if (jenisLaporan === 'Hilang') return '#DC2626';
  if (jenisLaporan === 'Ditemukan') return '#16A34A';
  if (jenisLaporan === 'user') return '#1565C0';
  if (jenisLaporan === 'geofence') return '#7C3AED';
  return '#64748B';
}

export function calculateBoundingRegion(coordinates = [], padding = 1.25) {
  const valid = coordinates.filter(hasValidCoordinates);
  if (!valid.length) {
    return {
      latitude: -7.9666,
      longitude: 112.6326,
      latitudeDelta: 0.035,
      longitudeDelta: 0.035,
    };
  }
  if (valid.length === 1) {
    return {
      latitude: Number(valid[0].latitude),
      longitude: Number(valid[0].longitude),
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    };
  }
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const c of valid) {
    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latDelta = Math.max(0.008, (maxLat - minLat) * padding);
  const lngDelta = Math.max(0.008, (maxLng - minLng) * padding);

  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: Math.min(latDelta, 0.5),
    longitudeDelta: Math.min(lngDelta, 0.5),
  };
}

export function formatMarkerInfo(item) {
  if (!item) return null;
  const isUser = item.type === 'user';
  const isGeofence = item.type === 'geofence';
  const pinColor = isUser ? '#1565C0' : isGeofence ? '#7C3AED' : getMarkerPinColor(item.jenisLaporan);
  const title = isUser ? 'Lokasi Pengguna (Saya)' : isGeofence ? 'Pusat Area Pantauan' : (item.nama || 'Laporan Barang');
  const typeLabel = isUser
    ? 'Posisi Perangkat'
    : isGeofence
    ? 'Geofence'
    : item.jenisLaporan === 'Hilang'
    ? 'Barang Hilang'
    : 'Barang Ditemukan';
  const subtitle = isUser
    ? (item.address || 'Posisi perangkat GPS saat ini')
    : isGeofence
    ? `Radius ${item.radius || 300} meter`
    : `${typeLabel} • ${item.lokasi || ''}${item.locationPrecision === 'approximate' ? ' • lokasi perkiraan untuk privasi' : ''}`;

  return {
    title,
    typeLabel,
    subtitle,
    pinColor,
    latitude: formatCoordinate(item.latitude),
    longitude: formatCoordinate(item.longitude),
    rawLatitude: Number(item.latitude),
    rawLongitude: Number(item.longitude),
    accuracy: item.accuracy ? formatAccuracy(item.accuracy) : null,
    address: item.alamat || item.address || item.lokasi || '',
  };
}

/**
 * Week 10 Task 03: Format objek reverse geocoding menjadi alamat terstruktur dan terbaca.
 */
function joinUniqueAddressParts(parts) {
  const seen = new Set();
  return parts
    .map(value => String(value || '').trim())
    .filter(value => {
      if (!value) return false;
      const normalized = value.toLocaleLowerCase('id');
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(', ');
}

export function formatGeocodedAddress(place) {
  if (!place) return '';
  return joinUniqueAddressParts([
    [place.street, place.streetNumber].filter(Boolean).join(' '),
    place.district,
    place.subregion,
    place.city,
    place.region,
    place.postalCode,
    place.country,
  ]);
}

/**
 * Week 10 Task 03: Geofence transition detection dengan Hysteresis buffer.
 * Hysteresis mencegah bouncing/flapping notifikasi akibat GPS jitter di perbatasan radius.
 */
export function calculateGeofenceTransition({
  wasInside = null,
  currentLocation,
  center,
  radius = 300,
  hysteresis = null,
}) {
  if (!hasValidCoordinates(currentLocation) || !hasValidCoordinates(center)) {
    return {
      nowInside: null,
      event: null,
      distance: Infinity,
      threshold: radius,
      hysteresis: 0,
    };
  }

  const rad = Number(radius);
  const distance = haversineDistanceMeters(currentLocation, center);
  const buffer = Number.isFinite(hysteresis)
    ? Number(hysteresis)
    : Math.max(10, Math.min(25, rad * 0.1));

  if (wasInside === null) {
    const initialInside = distance <= rad;
    return {
      nowInside: initialInside,
      event: null,
      distance,
      threshold: rad,
      hysteresis: buffer,
    };
  }

  const threshold = wasInside ? rad + buffer : Math.max(0, rad - buffer);
  const nowInside = distance <= threshold;

  let event = null;
  if (wasInside === false && nowInside === true) {
    event = 'ENTER';
  } else if (wasInside === true && nowInside === false) {
    event = 'EXIT';
  }

  return {
    nowInside,
    event,
    distance,
    threshold,
    hysteresis: buffer,
  };
}

/**
 * Preset Area Pantauan Kampus untuk TemuBarang (Week 10 Context)
 */
export const CAMPUS_PRESETS = [
  {
    id: 'rektorat',
    name: 'Rektorat & Kampus Pusat',
    description: 'Pusat layanan administrasi, rektorat, dan gedung kuliah utama',
    latitude: -7.9666,
    longitude: 112.6326,
    defaultRadius: 300,
  },
  {
    id: 'perpus',
    name: 'Perpustakaan Pusat',
    description: 'Gedung perpustakaan induk, ruang baca, dan area belajar mandiri',
    latitude: -7.9655,
    longitude: 112.6311,
    defaultRadius: 150,
  },
  {
    id: 'filkom',
    name: 'Gedung Informatika & Lab Komputer',
    description: 'Laboratorium riset, ruang praktikum komputer, dan student lounge',
    latitude: -7.9648,
    longitude: 112.6335,
    defaultRadius: 150,
  },
  {
    id: 'gkb',
    name: 'Gedung Kuliah Bersama (GKB)',
    description: 'Kompleks ruang kuliah umum dan auditorium kegiatan mahasiswa',
    latitude: -7.9675,
    longitude: 112.6340,
    defaultRadius: 300,
  },
];

/**
 * Format string log peristiwa geofence untuk ditampilkan di UI
 */
export function formatGeofenceEventLog(event, timestamp = Date.now()) {
  const timeStr = new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  if (event === 'ENTER') {
    return `Memasuki Area (ENTER) • ${timeStr}`;
  }
  if (event === 'EXIT') {
    return `Keluar dari Area (EXIT) • ${timeStr}`;
  }
  return `Status Diperbarui • ${timeStr}`;
}

/**
 * Parameter standar Location Battery Optimization untuk pengujian
 */
export function getBatteryOptimizationSettings() {
  return {
    accuracyMode: 'Balanced',
    timeIntervalMs: 10000,
    distanceIntervalMeters: 25,
    maxLowAccuracyFilterMeters: 100,
    hysteresisMinMeters: 10,
    hysteresisMaxMeters: 25,
  };
}
