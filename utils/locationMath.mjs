/**
 * Fungsi geometri lokasi murni untuk TemuBarang.
 * Tidak bergantung pada perangkat sehingga dapat diuji dengan Node.js.
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
