/**
 * Week 10 — layanan lokasi perangkat TemuBarang.
 * Menggunakan expo-location dengan akurasi Balanced dan reverse geocoding
 * hanya saat diminta pengguna agar penggunaan GPS dan baterai tetap efisien.
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

/**
 * Memeriksa apakah layanan GPS / Location Services aktif pada perangkat.
 */
export async function isLocationServiceEnabled() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return true;
  }
}

/**
 * Meminta izin akses lokasi foreground secara eksplisit.
 */
export async function requestForegroundLocationPermission() {
  return Location.requestForegroundPermissionsAsync();
}

/**
 * Mengambil koordinat GPS terkini (latitude, longitude, accuracy).
 * Dilengkapi pengecekan service GPS dan penanganan status izin.
 */
export async function getGPSCoordinates(options = {}) {
  const serviceEnabled = await isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw new Error('Layanan GPS/lokasi pada perangkat tidak aktif. Mohon aktifkan GPS perangkat Anda terlebih dahulu.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    const reason = permission.canAskAgain
      ? 'Izin lokasi belum diberikan. Izinkan TemuBarang mengakses lokasi saat aplikasi digunakan.'
      : 'Izin lokasi ditolak. Aktifkan izin lokasi TemuBarang melalui Pengaturan perangkat.';
    throw new Error(reason);
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: options.accuracy || Location.Accuracy.Balanced,
    mayShowUserSettingsDialog: true,
  });

  const { latitude, longitude, accuracy } = position.coords;
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    timestamp: position.timestamp || Date.now(),
  };
}

/**
 * Mengambil lokasi GPS terkini beserta alamat hasil reverse geocoding.
 */
export async function getCurrentLocationWithAddress() {
  const coords = await getGPSCoordinates();
  const { latitude, longitude, accuracy, timestamp } = coords;
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
    accuracy,
    address,
    geocodingWarning,
    timestamp,
  };
}

export function getLocationAccuracyBalanced() {
  return Location.Accuracy.Balanced;
}
