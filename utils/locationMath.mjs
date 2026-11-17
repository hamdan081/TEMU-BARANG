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
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : '-';
}
