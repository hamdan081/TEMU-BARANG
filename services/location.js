/**
 * Week 10 — layanan lokasi perangkat TemuBarang.
 * Menggunakan akurasi Balanced dan reverse geocoding hanya saat diminta pengguna
 * agar penggunaan GPS dan baterai tetap efisien.
 */
import * as Location from 'expo-location';

function joinUnique(parts) {
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
  return joinUnique([
    [place.street, place.streetNumber].filter(Boolean).join(' '),
    place.district,
    place.subregion,
    place.city,
    place.region,
    place.postalCode,
    place.country,
  ]);
}

export async function getCurrentLocationWithAddress() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    const reason = permission.canAskAgain
      ? 'Izin lokasi belum diberikan. Izinkan TemuBarang mengakses lokasi saat aplikasi digunakan.'
      : 'Izin lokasi ditolak. Aktifkan izin lokasi TemuBarang melalui Pengaturan perangkat.';
    throw new Error(reason);
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    mayShowUserSettingsDialog: true,
  });

  const { latitude, longitude, accuracy } = position.coords;
  let address = '';
  let geocodingWarning = '';

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    address = formatGeocodedAddress(results?.[0]);
    if (!address) geocodingWarning = 'Alamat belum tersedia dari layanan geocoding.';
  } catch {
    geocodingWarning = 'Koordinat berhasil diambil, tetapi alamat tidak dapat dimuat.';
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    address,
    geocodingWarning,
    timestamp: position.timestamp || Date.now(),
  };
}

export async function requestForegroundLocationPermission() {
  return Location.requestForegroundPermissionsAsync();
}

export function getLocationAccuracyBalanced() {
  return Location.Accuracy.Balanced;
}
