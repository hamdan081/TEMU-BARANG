/**
 * Week 10 — Layanan lokasi perangkat TemuBarang.
 * Menggunakan expo-location dengan akurasi Balanced dan reverse geocoding
 * hanya saat diminta pengguna agar penggunaan GPS dan baterai tetap efisien.
 */
import * as Location from 'expo-location';
import { formatGeocodedAddress } from '../utils/locationMath';

export { formatGeocodedAddress };

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
 * Week 10 Task 03: Reverse Geocoding mandiri untuk koordinat latitude dan longitude.
 * Mengubah koordinat numerik menjadi alamat yang dapat dibaca manusia.
 */
export async function reverseGeocodeCoordinates(coords) {
  if (!coords || !Number.isFinite(Number(coords.latitude)) || !Number.isFinite(Number(coords.longitude))) {
    return {
      success: false,
      latitude: null,
      longitude: null,
      address: '',
      place: null,
      warning: 'Koordinat tidak valid untuk proses reverse geocoding.',
    };
  }

  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results?.[0] || null;
    const address = formatGeocodedAddress(place);
    return {
      success: Boolean(address),
      latitude,
      longitude,
      address,
      place,
      warning: address ? '' : 'Alamat tidak ditemukan untuk koordinat tersebut.',
    };
  } catch (error) {
    return {
      success: false,
      latitude,
      longitude,
      address: '',
      place: null,
      warning: error?.message || 'Layanan geocoding tidak dapat memuat alamat untuk titik ini.',
    };
  }
}

/**
 * Mengambil lokasi GPS terkini beserta alamat hasil reverse geocoding.
 */
export async function getCurrentLocationWithAddress() {
  const coords = await getGPSCoordinates();
  const { latitude, longitude, accuracy, timestamp } = coords;

  const geocodeResult = await reverseGeocodeCoordinates({ latitude, longitude });

  return {
    latitude,
    longitude,
    accuracy,
    address: geocodeResult.address,
    geocodingWarning: geocodeResult.warning,
    timestamp,
  };
}

export function getLocationAccuracyBalanced() {
  return Location.Accuracy.Balanced;
}

/**
 * Konfigurasi standar Location Battery Optimization (Materi Pendukung Week 10)
 */
export function getBatteryOptimizationConfig() {
  return {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000, // 10 detik
    distanceInterval: 25, // 25 meter
    accuracyThreshold: 100, // filter sampel > 100m
  };
}
