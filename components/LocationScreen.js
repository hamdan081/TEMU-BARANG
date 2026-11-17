import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLocationWithAddress } from '../services/location';
import {
  calculateBoundingRegion,
  formatAccuracy,
  formatCoordinate,
  formatMarkerInfo,
  getMarkerPinColor,
  hasValidCoordinates,
  haversineDistanceMeters,
  isInsideGeofence,
} from '../utils/locationMath';
import { theme } from '../theme';

const FALLBACK_REGION = {
  // Titik awal peta default (Kota Malang / Kampus); bukan lokasi GPS hardcoded pengguna.
  latitude: -7.9666,
  longitude: 112.6326,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};
const RADIUS_OPTIONS = [150, 300, 500];

function ActionButton({ title, onPress, disabled = false, secondary = false, icon = null }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton]}
    >
      <View style={styles.buttonInner}>
        {icon && <Ionicons name={icon} size={15} color={secondary ? theme.colors.primary : '#FFFFFF'} style={styles.buttonIcon} />}
        <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>
      </View>
    </Pressable>
  );
}

function InfoCard({ title, badge = null, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        {badge && (
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

export default function LocationScreen({ items = [], focusItem = null, onSelectItem, userId }) {
  const mapRef = useRef(null);
  const watchRef = useRef(null);
  const wasInsideRef = useRef(null);

  // State lokasi & GPS
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // State peta & camera position
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [cameraCenter, setCameraCenter] = useState(FALLBACK_REGION);
  const [currentZoom, setCurrentZoom] = useState(15);
  const [is3D, setIs3D] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'Hilang' | 'Ditemukan'

  // State Geofencing (Task 3)
  const [geofenceCenter, setGeofenceCenter] = useState(null);
  const [geofenceRadius, setGeofenceRadius] = useState(300);
  const [tracking, setTracking] = useState(false);
  const [insideGeofence, setInsideGeofence] = useState(null);
  const [geofenceMessage, setGeofenceMessage] = useState('');
  const [lastEvent, setLastEvent] = useState('');
  const [loadedSettingsKey, setLoadedSettingsKey] = useState(null);
  const settingsKey = useMemo(() => `temubarang.geofence.settings.v1.${userId ?? 'guest'}`, [userId]);

  // Load geofence settings dari AsyncStorage
  useEffect(() => {
    let active = true;
    setLoadedSettingsKey(null);
    setGeofenceCenter(null);
    setGeofenceRadius(300);
    AsyncStorage.getItem(settingsKey)
      .then(raw => {
        if (!active || !raw) return;
        const saved = JSON.parse(raw);
        if (hasValidCoordinates(saved.center)) setGeofenceCenter(saved.center);
        if (RADIUS_OPTIONS.includes(Number(saved.radius))) setGeofenceRadius(Number(saved.radius));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadedSettingsKey(settingsKey); });
    return () => { active = false; };
  }, [settingsKey]);

  // Simpan geofence settings ke AsyncStorage
  useEffect(() => {
    if (loadedSettingsKey !== settingsKey) return;
    AsyncStorage.setItem(settingsKey, JSON.stringify({ center: geofenceCenter, radius: geofenceRadius }))
      .catch(() => {});
  }, [loadedSettingsKey, settingsKey, geofenceCenter, geofenceRadius]);

  // Laporan yang valid koordinatnya
  const mappedItems = useMemo(
    () => items.filter(item => hasValidCoordinates(item)),
    [items]
  );

  const lostCount = useMemo(() => mappedItems.filter(i => i.jenisLaporan === 'Hilang').length, [mappedItems]);
  const foundCount = useMemo(() => mappedItems.filter(i => i.jenisLaporan === 'Ditemukan').length, [mappedItems]);

  // Filter laporan aktif pada peta
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return mappedItems;
    return mappedItems.filter(item => item.jenisLaporan === filterType);
  }, [mappedItems, filterType]);

  // Region awal peta
  const initialRegion = useMemo(() => {
    if (hasValidCoordinates(focusItem)) {
      return {
        latitude: Number(focusItem.latitude),
        longitude: Number(focusItem.longitude),
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };
    }
    if (mappedItems.length) {
      return {
        latitude: Number(mappedItems[0].latitude),
        longitude: Number(mappedItems[0].longitude),
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
    }
    return FALLBACK_REGION;
  }, [focusItem?.id, focusItem?.latitude, focusItem?.longitude, mappedItems]);

  // Camera Controller: Animasi perpindahan kamera & region
  const moveCameraTo = useCallback((coordinate, options = {}) => {
    if (!coordinate || !mapRef.current) return;
    const target = {
      latitude: Number(coordinate.latitude),
      longitude: Number(coordinate.longitude),
    };
    const zoom = options.zoom ?? (is3D ? 17 : 16);
    const pitch = options.pitch ?? (is3D ? 45 : 0);
    const heading = options.heading ?? 0;
    const delta = options.delta || 0.012;

    try {
      if (typeof mapRef.current.animateCamera === 'function') {
        mapRef.current.animateCamera(
          {
            center: target,
            zoom,
            pitch,
            heading,
          },
          { duration: options.duration || 600 }
        );
      } else if (typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion(
          {
            ...target,
            latitudeDelta: delta,
            longitudeDelta: delta,
          },
          options.duration || 600
        );
      }
    } catch {
      if (typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion(
          {
            ...target,
            latitudeDelta: delta,
            longitudeDelta: delta,
          },
          options.duration || 600
        );
      }
    }
    setCameraCenter(target);
  }, [is3D]);

  // Ambil lokasi GPS perangkat aktual
  const captureCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      const result = await getCurrentLocationWithAddress();
      setCurrentLocation(result);
      moveCameraTo(result, { zoom: 16, delta: 0.012 });
      if (result.geocodingWarning) setLocationError(result.geocodingWarning);
      return result;
    } catch (error) {
      const message = error?.message || 'Lokasi perangkat tidak dapat diambil.';
      setLocationError(message);
      Alert.alert('Lokasi Tidak Tersedia', message);
      return null;
    } finally {
      setLocationLoading(false);
    }
  }, [moveCameraTo]);

  // Pusatkan peta ke koordinat GPS pengguna
  const centerToGPS = useCallback(async () => {
    if (hasValidCoordinates(currentLocation)) {
      moveCameraTo(currentLocation, { zoom: 16 });
      setSelectedMarker({
        type: 'user',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        address: currentLocation.address,
      });
    } else {
      const loc = await captureCurrentLocation();
      if (loc && hasValidCoordinates(loc)) {
        moveCameraTo(loc, { zoom: 16 });
        setSelectedMarker({
          type: 'user',
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          address: loc.address,
        });
      }
    }
  }, [currentLocation, captureCurrentLocation, moveCameraTo]);

  // Pusatkan ke seluruh marker laporan
  const fitAllMarkers = useCallback(() => {
    const coords = [];
    if (hasValidCoordinates(currentLocation)) {
      coords.push({ latitude: Number(currentLocation.latitude), longitude: Number(currentLocation.longitude) });
    }
    filteredItems.forEach(item => {
      if (hasValidCoordinates(item)) {
        coords.push({ latitude: Number(item.latitude), longitude: Number(item.longitude) });
      }
    });
    if (hasValidCoordinates(geofenceCenter)) {
      coords.push({ latitude: Number(geofenceCenter.latitude), longitude: Number(geofenceCenter.longitude) });
    }
    if (!coords.length) {
      moveCameraTo(FALLBACK_REGION);
      return;
    }
    if (typeof mapRef.current?.fitToCoordinates === 'function') {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    } else {
      const bounding = calculateBoundingRegion(coords);
      mapRef.current?.animateToRegion(bounding, 600);
    }
  }, [currentLocation, filteredItems, geofenceCenter, moveCameraTo]);

  // Zoom control
  const handleZoom = useCallback((direction) => {
    const deltaFactor = direction > 0 ? 1 : -1;
    if (!mapRef.current) return;
    if (typeof mapRef.current.getCamera === 'function') {
      mapRef.current.getCamera().then(cam => {
        if (!cam) return;
        const nextZoom = Math.min(20, Math.max(3, (cam.zoom || 15) + deltaFactor));
        mapRef.current.animateCamera({ ...cam, zoom: nextZoom }, { duration: 300 });
        setCurrentZoom(nextZoom);
      }).catch(() => {
        const delta = deltaFactor > 0 ? 0.007 : 0.035;
        const center = cameraCenter || initialRegion;
        mapRef.current.animateToRegion({
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }, 300);
      });
    } else {
      const delta = deltaFactor > 0 ? 0.007 : 0.035;
      const center = cameraCenter || initialRegion;
      mapRef.current?.animateToRegion({
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      }, 300);
    }
  }, [cameraCenter, initialRegion]);

  // Toggle mode kamera 2D / 3D perspektif
  const toggle3D = useCallback(() => {
    const next3D = !is3D;
    setIs3D(next3D);
    if (!mapRef.current) return;
    const center = selectedMarker || currentLocation || cameraCenter || initialRegion;
    if (typeof mapRef.current.animateCamera === 'function') {
      mapRef.current.animateCamera({
        center: { latitude: Number(center.latitude), longitude: Number(center.longitude) },
        pitch: next3D ? 45 : 0,
        heading: 0,
        zoom: currentZoom || 16,
      }, { duration: 500 });
    }
  }, [is3D, selectedMarker, currentLocation, cameraCenter, initialRegion, currentZoom]);

  // Reset arah kamera ke Utara
  const resetNorth = useCallback(() => {
    if (!mapRef.current) return;
    const center = selectedMarker || currentLocation || cameraCenter || initialRegion;
    if (typeof mapRef.current.animateCamera === 'function') {
      mapRef.current.animateCamera({
        center: { latitude: Number(center.latitude), longitude: Number(center.longitude) },
        pitch: is3D ? 45 : 0,
        heading: 0,
        zoom: currentZoom || 16,
      }, { duration: 500 });
    }
  }, [is3D, selectedMarker, currentLocation, cameraCenter, initialRegion, currentZoom]);

  // Handle pemilihan marker
  const handleSelectMarker = useCallback((markerData) => {
    setSelectedMarker(markerData);
    moveCameraTo(markerData, { zoom: 16.5, delta: 0.008 });
  }, [moveCameraTo]);

  // Efek fokus pada item saat diarahkan dari Detail Barang
  useEffect(() => {
    if (hasValidCoordinates(focusItem)) {
      setSelectedMarker(focusItem);
      moveCameraTo(focusItem, { zoom: 16.5, delta: 0.010 });
    }
  }, [focusItem?.id, focusItem?.latitude, focusItem?.longitude, moveCameraTo]);

  // Geofencing tracking cleanup saat unmount
  const stopTracking = useCallback(() => {
    watchRef.current?.remove?.();
    watchRef.current = null;
    wasInsideRef.current = null;
    setInsideGeofence(null);
    setTracking(false);
  }, []);

  useEffect(() => () => {
    watchRef.current?.remove?.();
    watchRef.current = null;
  }, []);

  const setCenterToCurrentLocation = () => {
    if (!hasValidCoordinates(currentLocation)) {
      Alert.alert('Lokasi Belum Tersedia', 'Ambil lokasi GPS terlebih dahulu.');
      return;
    }
    if (tracking) stopTracking();
    const center = {
      latitude: Number(currentLocation.latitude),
      longitude: Number(currentLocation.longitude),
    };
    setGeofenceCenter(center);
    wasInsideRef.current = null;
    setInsideGeofence(null);
    setGeofenceMessage('Pusat area pantauan menggunakan lokasi GPS saat ini.');
    moveCameraTo(center, { zoom: 16, delta: 0.012 });
  };

  const handleMapLongPress = event => {
    if (tracking) stopTracking();
    const coordinate = event?.nativeEvent?.coordinate;
    if (!hasValidCoordinates(coordinate)) return;
    const center = {
      latitude: Number(coordinate.latitude),
      longitude: Number(coordinate.longitude),
    };
    setGeofenceCenter(center);
    wasInsideRef.current = null;
    setInsideGeofence(null);
    setGeofenceMessage('Pusat area pantauan dipilih dari titik pada peta.');
    setSelectedMarker({
      type: 'geofence',
      latitude: center.latitude,
      longitude: center.longitude,
      radius: geofenceRadius,
    });
  };

  const startTracking = async () => {
    if (tracking) return;
    setLocationError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Izin lokasi diperlukan untuk memantau area. Aktifkan izin lokasi saat aplikasi digunakan.');
      }

      let baseline = currentLocation;
      if (!hasValidCoordinates(baseline)) {
        baseline = await captureCurrentLocation();
      }
      if (!hasValidCoordinates(baseline)) return;

      let center = geofenceCenter;
      if (!hasValidCoordinates(center)) {
        center = {
          latitude: Number(baseline.latitude),
          longitude: Number(baseline.longitude),
        };
        setGeofenceCenter(center);
        setGeofenceMessage('Pusat area pantauan otomatis menggunakan lokasi GPS saat ini.');
      }

      if (Number.isFinite(baseline.accuracy) && baseline.accuracy > 100) {
        setLocationError('Akurasi GPS masih rendah. Tunggu di area terbuka atau pilih titik yang lebih akurat sebelum memulai pemantauan.');
        return;
      }
      const initialInside = isInsideGeofence(baseline, center, geofenceRadius);
      wasInsideRef.current = initialInside;
      setInsideGeofence(initialInside);
      setLastEvent(initialInside ? 'Perangkat berada di dalam area pantauan.' : 'Perangkat berada di luar area pantauan.');

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 25,
          mayShowUserSettingsDialog: true,
        },
        position => {
          const nextLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp || Date.now(),
          };
          setCurrentLocation(previous => ({
            ...previous,
            ...nextLocation,
          }));

          if (Number.isFinite(nextLocation.accuracy) && nextLocation.accuracy > 100) {
            setLocationError('Sinyal GPS kurang akurat; sampel ini tidak dipakai untuk mengubah status area.');
            return;
          }
          const distance = haversineDistanceMeters(nextLocation, center);
          const hysteresis = Math.max(10, Math.min(25, geofenceRadius * 0.1));
          const threshold = wasInsideRef.current ? geofenceRadius + hysteresis : Math.max(0, geofenceRadius - hysteresis);
          const nowInside = distance <= threshold;
          if (wasInsideRef.current === null) {
            wasInsideRef.current = nowInside;
            setInsideGeofence(nowInside);
            return;
          }

          if (wasInsideRef.current !== nowInside) {
            const eventTitle = nowInside ? 'Memasuki Area Pantauan' : 'Keluar dari Area Pantauan';
            const eventMessage = nowInside
              ? 'Perangkat terdeteksi memasuki area pantauan TemuBarang.'
              : 'Perangkat terdeteksi keluar dari area pantauan TemuBarang.';
            wasInsideRef.current = nowInside;
            setInsideGeofence(nowInside);
            setLastEvent(`${eventTitle} • ${new Date().toLocaleTimeString('id-ID')}`);
            Alert.alert(eventTitle, eventMessage);
          }
        },
        message => setLocationError(message || 'Pembaruan lokasi mengalami kendala.')
      );

      watchRef.current = subscription;
      setTracking(true);
      setGeofenceMessage('Pemantauan area aktif selama halaman Peta terbuka.');
    } catch (error) {
      const message = error?.message || 'Pemantauan area tidak dapat dimulai.';
      setLocationError(message);
      Alert.alert('Geofencing Tidak Aktif', message);
    }
  };

  const changeRadius = nextRadius => {
    if (tracking) stopTracking();
    setGeofenceRadius(nextRadius);
    setInsideGeofence(null);
    wasInsideRef.current = null;
    setGeofenceMessage('Radius diperbarui. Aktifkan kembali pemantauan area.');
  };

  const currentDistance = useMemo(() => {
    if (!hasValidCoordinates(currentLocation) || !hasValidCoordinates(geofenceCenter)) return null;
    return haversineDistanceMeters(currentLocation, geofenceCenter);
  }, [currentLocation, geofenceCenter]);

  // Selected Marker Info metadata
  const selectedInfo = useMemo(() => formatMarkerInfo(selectedMarker), [selectedMarker]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Lokasi & Peta TemuBarang</Text>
      <Text style={styles.description}>
        Tandai lokasi terakhir barang hilang atau lokasi barang ditemukan, jelajahi laporan pada peta, dan pantau area sekitar secara interaktif.
      </Text>

      {/* ============================================================== */}
      {/* TASK 2: MAP VIEW, CAMERA POSITION, MARKER & LOCATION INFO     */}
      {/* ============================================================== */}
      <InfoCard title="Task 2 — Peta & Lokasi Laporan" badge={`${mappedItems.length} Titik Terdata`}>
        <Text style={styles.bodyText}>
          Peta interaktif menggunakan Maps SDK untuk memvisualisasikan posisi pengguna (marker biru), barang hilang (marker merah), dan barang ditemukan (marker hijau).
        </Text>

        {/* Filter Chip Row */}
        <View style={styles.filterChipRow}>
          {[
            { key: 'all', label: `Semua (${mappedItems.length})` },
            { key: 'Hilang', label: `Hilang (${lostCount})`, color: '#DC2626' },
            { key: 'Ditemukan', label: `Temuan (${foundCount})`, color: '#16A34A' },
          ].map(f => {
            const active = filterType === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilterType(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                {f.color ? <View style={[styles.filterDot, { backgroundColor: f.color }]} /> : null}
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Container Peta dengan HUD dan Kontrol Kamera */}
        <View style={styles.mapFrame}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            onMapReady={() => {
              setMapReady(true);
              setMapError('');
            }}
            onRegionChangeComplete={(region) => {
              setCameraCenter(region);
              if (region.latitudeDelta) {
                // Konversi perkiraan delta ke level zoom 1-20
                const zoom = Math.round(Math.log(360 / region.latitudeDelta) / Math.LN2);
                setCurrentZoom(Math.min(20, Math.max(3, zoom)));
              }
            }}
            onLongPress={handleMapLongPress}
            toolbarEnabled
            loadingEnabled
            loadingIndicatorColor={theme.colors.primary}
            loadingBackgroundColor="#F8FAFC"
            showsCompass={false}
            showsScale
          >
            {/* Marker Lokasi Pengguna (Aktual dari GPS) */}
            {hasValidCoordinates(currentLocation) ? (
              <>
                {Number.isFinite(currentLocation.accuracy) && (
                  <Circle
                    center={{ latitude: Number(currentLocation.latitude), longitude: Number(currentLocation.longitude) }}
                    radius={Math.min(250, Math.max(20, Number(currentLocation.accuracy)))}
                    strokeColor="rgba(21, 101, 192, 0.45)"
                    fillColor="rgba(21, 101, 192, 0.12)"
                    strokeWidth={1.5}
                  />
                )}
                <Marker
                  coordinate={{ latitude: Number(currentLocation.latitude), longitude: Number(currentLocation.longitude) }}
                  title="Lokasi Pengguna (Saya)"
                  description={currentLocation.address || `Lat: ${formatCoordinate(currentLocation.latitude)}, Lng: ${formatCoordinate(currentLocation.longitude)}`}
                  pinColor={getMarkerPinColor('user')}
                  onPress={() => handleSelectMarker({
                    type: 'user',
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    accuracy: currentLocation.accuracy,
                    address: currentLocation.address,
                  })}
                >
                  <Callout onPress={() => handleSelectMarker({
                    type: 'user',
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    accuracy: currentLocation.accuracy,
                    address: currentLocation.address,
                  })}>
                    <View style={styles.calloutBox}>
                      <Text style={styles.calloutTitle}>🔵 Lokasi Pengguna (Saya)</Text>
                      <Text style={styles.calloutDesc}>{currentLocation.address || 'Posisi perangkat GPS saat ini'}</Text>
                      <Text style={styles.calloutCoords}>{formatCoordinate(currentLocation.latitude)}, {formatCoordinate(currentLocation.longitude)}</Text>
                    </View>
                  </Callout>
                </Marker>
              </>
            ) : null}

            {/* Marker Laporan Barang Hilang & Barang Ditemukan */}
            {filteredItems.map(item => {
              const isLost = item.jenisLaporan === 'Hilang';
              const pinColor = getMarkerPinColor(item.jenisLaporan);
              return (
                <Marker
                  key={`barang-${item.id}`}
                  coordinate={{ latitude: Number(item.latitude), longitude: Number(item.longitude) }}
                  title={item.nama}
                  description={`${isLost ? '🔴 Barang Hilang' : '🟢 Barang Ditemukan'} • ${item.lokasi || ''}`}
                  pinColor={pinColor}
                  onPress={() => handleSelectMarker(item)}
                >
                  <Callout onPress={() => {
                    handleSelectMarker(item);
                    onSelectItem?.(item);
                  }}>
                    <View style={styles.calloutBox}>
                      <Text style={styles.calloutTitle}>{isLost ? '🔴' : '🟢'} {item.nama}</Text>
                      <Text style={styles.calloutDesc}>{item.lokasi || 'Lokasi kejadian'}</Text>
                      <Text style={styles.calloutCoords}>{formatCoordinate(item.latitude)}, {formatCoordinate(item.longitude)}</Text>
                      <Text style={styles.calloutActionText}>Ketuk untuk buka detail →</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}

            {/* Marker & Radius Geofence (Task 3) */}
            {hasValidCoordinates(geofenceCenter) ? (
              <>
                <Circle
                  center={geofenceCenter}
                  radius={geofenceRadius}
                  strokeColor="rgba(124, 58, 237, 0.9)"
                  fillColor="rgba(124, 58, 237, 0.16)"
                  strokeWidth={2}
                />
                <Marker
                  coordinate={geofenceCenter}
                  title="Pusat Area Pantauan"
                  description={`Radius ${geofenceRadius} meter`}
                  pinColor={getMarkerPinColor('geofence')}
                  onPress={() => handleSelectMarker({
                    type: 'geofence',
                    latitude: geofenceCenter.latitude,
                    longitude: geofenceCenter.longitude,
                    radius: geofenceRadius,
                  })}
                />
              </>
            ) : null}
          </MapView>

          {/* Loading Overlay saat peta diinisialisasi */}
          {!mapReady && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.mapLoadingText}>Memuat peta...</Text>
            </View>
          )}

          {/* HUD: Posisi Kamera & Koordinat Live */}
          <View style={styles.mapHud}>
            <View style={styles.hudBadge}>
              <Ionicons name="compass-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.hudText} numberOfLines={1}>
                {formatCoordinate(cameraCenter.latitude)}, {formatCoordinate(cameraCenter.longitude)}
                {is3D ? ' • 3D 45°' : ''}
              </Text>
            </View>
          </View>

          {/* Kontrol Kamera Melayang (Floating Camera Controls) */}
          <View style={styles.mapControlsOverlay}>
            <Pressable
              onPress={centerToGPS}
              style={[styles.mapControlBtn, hasValidCoordinates(currentLocation) && styles.mapControlBtnActive]}
              accessibilityLabel="Pusatkan peta ke lokasi GPS pengguna"
              accessibilityRole="button"
            >
              <Ionicons
                name="locate"
                size={20}
                color={hasValidCoordinates(currentLocation) ? theme.colors.primary : '#4B5563'}
              />
            </Pressable>

            <Pressable
              onPress={fitAllMarkers}
              style={styles.mapControlBtn}
              accessibilityLabel="Pusatkan peta untuk melihat semua marker"
              accessibilityRole="button"
            >
              <Ionicons name="scan-outline" size={19} color="#4B5563" />
            </Pressable>

            <Pressable
              onPress={toggle3D}
              style={[styles.mapControlBtn, is3D && styles.mapControlBtnActive]}
              accessibilityLabel="Beralih sudut pandang 2D dan 3D"
              accessibilityRole="button"
            >
              <Text style={[styles.controlBtnText, is3D && styles.controlBtnTextActive]}>3D</Text>
            </Pressable>

            <Pressable
              onPress={resetNorth}
              style={styles.mapControlBtn}
              accessibilityLabel="Arahkan peta ke Utara"
              accessibilityRole="button"
            >
              <Ionicons name="compass" size={19} color="#4B5563" />
            </Pressable>

            <Pressable
              onPress={() => handleZoom(1)}
              style={styles.mapControlBtn}
              accessibilityLabel="Perbesar peta"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color="#4B5563" />
            </Pressable>

            <Pressable
              onPress={() => handleZoom(-1)}
              style={styles.mapControlBtn}
              accessibilityLabel="Perkecil peta"
              accessibilityRole="button"
            >
              <Ionicons name="remove" size={20} color="#4B5563" />
            </Pressable>
          </View>
        </View>

        {/* Legend Row */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1565C0' }]} />
            <Text style={styles.legendText}>Lokasi Saya</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Barang Hilang ({lostCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>Barang Ditemukan ({foundCount})</Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* KARTU INFORMASI MARKER TERPILIH                                */}
        {/* ============================================================== */}
        {selectedMarker ? (
          <View style={styles.selectedMarkerCard}>
            <View style={styles.selectedMarkerHeader}>
              <View
                style={[
                  styles.markerBadge,
                  {
                    backgroundColor:
                      selectedMarker.type === 'user'
                        ? '#E3F2FD'
                        : selectedMarker.type === 'geofence'
                        ? '#F3E8FF'
                        : selectedMarker.jenisLaporan === 'Hilang'
                        ? '#FEE2E2'
                        : '#DCFCE7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.markerBadgeText,
                    {
                      color:
                        selectedMarker.type === 'user'
                          ? '#1565C0'
                          : selectedMarker.type === 'geofence'
                          ? '#7C3AED'
                          : selectedMarker.jenisLaporan === 'Hilang'
                          ? '#DC2626'
                          : '#16A34A',
                    },
                  ]}
                >
                  {selectedInfo?.typeLabel || 'Titik Laporan'}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedMarker(null)}
                hitSlop={10}
                style={styles.closeMarkerBtn}
                accessibilityLabel="Tutup informasi marker"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.selectedMarkerTitle}>{selectedInfo?.title}</Text>

            {selectedMarker.kategori ? (
              <Text style={styles.selectedMarkerCategory}>Kategori: {selectedMarker.kategori}</Text>
            ) : null}

            {/* Tampilan Koordinat Latitude & Longitude Presisi */}
            <View style={styles.selectedCoordsBox}>
              <View style={styles.coordCol}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordVal}>{selectedInfo?.latitude}</Text>
              </View>
              <View style={styles.coordDivider} />
              <View style={styles.coordCol}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordVal}>{selectedInfo?.longitude}</Text>
              </View>
            </View>

            <Text style={styles.selectedMarkerAddress}>
              📍 {selectedInfo?.address || 'Lokasi koordinat pada peta.'}
            </Text>

            {selectedInfo?.accuracy ? (
              <Text style={styles.selectedMarkerAccuracy}>
                Akurasi GPS: {selectedInfo.accuracy}
              </Text>
            ) : null}

            {selectedMarker.pelapor ? (
              <Text style={styles.selectedMarkerMeta}>
                Pelapor: {selectedMarker.pelapor} {selectedMarker.tanggal ? `• ${selectedMarker.tanggal}` : ''}
              </Text>
            ) : null}

            <View style={styles.selectedMarkerActions}>
              <Pressable
                onPress={() => moveCameraTo(selectedMarker, { zoom: 17 })}
                style={styles.markerActionSecondary}
                accessibilityRole="button"
              >
                <Ionicons name="locate" size={15} color={theme.colors.primary} style={{ marginRight: 5 }} />
                <Text style={styles.markerActionSecondaryText}>Pusatkan Kamera</Text>
              </Pressable>
              {selectedMarker.type !== 'user' && selectedMarker.type !== 'geofence' && (
                <Pressable
                  onPress={() => onSelectItem?.(selectedMarker)}
                  style={styles.markerActionPrimary}
                  accessibilityRole="button"
                >
                  <Text style={styles.markerActionPrimaryText}>Buka Detail Laporan →</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptySelectionBox}>
            <Ionicons name="information-circle-outline" size={18} color="#7C8BA0" style={{ marginRight: 6 }} />
            <Text style={styles.emptySelectionText}>
              Ketuk salah satu marker pada peta untuk melihat koordinat presisi dan informasi detail laporan.
            </Text>
          </View>
        )}

        <Text style={styles.hint}>
          {mappedItems.length
            ? `${mappedItems.length} laporan memiliki koordinat GPS. Tekan marker untuk melihat koordinat presisi dan membuka detail barang.`
            : 'Belum ada laporan dengan koordinat GPS. Laporan lama tetap dapat dicari pada daftar, dan laporan baru dapat ditambahkan koordinatnya saat melapor.'}
        </Text>
        <Text style={styles.hint}>Tekan lama pada peta untuk menentukan pusat area pantauan geofence.</Text>
      </InfoCard>

      {/* ============================================================== */}
      {/* TASK 1: GPS LOCATION SENSOR & COORDINATE DISPLAY               */}
      {/* ============================================================== */}
      <InfoCard title="Task 1 — GPS Location Perangkat">
        <Text style={styles.bodyText}>
          Ambil koordinat perangkat aktual menggunakan Location API (expo-location) dengan akurasi Balanced.
        </Text>
        {currentLocation ? (
          <View style={styles.coordinateBox}>
            <View style={styles.coordinateGrid}>
              <View style={styles.coordCol}>
                <Text style={styles.coordinateLabel}>Latitude</Text>
                <Text style={styles.coordinateValue}>{formatCoordinate(currentLocation.latitude)}</Text>
              </View>
              <View style={styles.coordDivider} />
              <View style={styles.coordCol}>
                <Text style={styles.coordinateLabel}>Longitude</Text>
                <Text style={styles.coordinateValue}>{formatCoordinate(currentLocation.longitude)}</Text>
              </View>
            </View>
            <Text style={styles.coordinateLabel}>Akurasi GPS</Text>
            <Text style={styles.coordinateValue}>
              {formatAccuracy(currentLocation.accuracy)}
            </Text>
            <Text style={styles.addressText}>
              {currentLocation.address || 'Alamat hasil reverse geocoding belum tersedia. Koordinat GPS tetap akurat dan tersimpan.'}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>Lokasi perangkat belum diambil. Tekan tombol di bawah untuk membaca GPS aktual.</Text>
        )}

        {locationError ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        ) : null}

        <View style={styles.gpsActionRow}>
          <ActionButton
            title={locationLoading ? 'Mengambil GPS...' : '📍 Ambil Lokasi Saya'}
            onPress={captureCurrentLocation}
            disabled={locationLoading}
            icon="navigate-outline"
          />
          {hasValidCoordinates(currentLocation) && (
            <ActionButton
              title="Pusatkan Peta ke Saya"
              onPress={centerToGPS}
              secondary
              icon="locate-outline"
            />
          )}
        </View>
        {locationLoading ? <ActivityIndicator color="#1565C0" style={styles.spinner} /> : null}
      </InfoCard>

      {/* ============================================================== */}
      {/* TASK 3: REVERSE GEOCODING & GEOFENCING                         */}
      {/* ============================================================== */}
      <InfoCard title="Task 3 — Reverse Geocoding & Geofencing">
        <Text style={styles.sectionLabel}>Reverse Geocoding</Text>
        <Text style={styles.bodyText}>
          Koordinat GPS diterjemahkan menjadi alamat yang mudah dibaca ketika diminta oleh pengguna, menjaga efisiensi baterai dan layanan geocoding.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Geofencing — Area Pantauan</Text>
        <Text style={styles.bodyText}>
          Tentukan pusat area pantauan dengan menekan lama pada peta atau gunakan lokasi GPS saat ini. Aplikasi memberi peringatan saat perangkat masuk atau keluar area.
        </Text>
        <ActionButton
          title="Gunakan Lokasi Saya sebagai Pusat Area"
          onPress={setCenterToCurrentLocation}
          secondary
          disabled={!hasValidCoordinates(currentLocation)}
          icon="radio-outline"
        />
        <Text style={styles.label}>Radius area</Text>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map(option => (
            <Pressable
              key={option}
              onPress={() => changeRadius(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: geofenceRadius === option }}
              style={[styles.radiusChip, geofenceRadius === option && styles.radiusChipSelected]}
            >
              <Text style={[styles.radiusText, geofenceRadius === option && styles.radiusTextSelected]}>{option} m</Text>
            </Pressable>
          ))}
        </View>
        {geofenceCenter ? (
          <View style={styles.geofenceInfo}>
            <Text style={styles.bodyText}>Pusat: {formatCoordinate(geofenceCenter.latitude)}, {formatCoordinate(geofenceCenter.longitude)}</Text>
            {currentDistance !== null ? (
              <Text style={styles.bodyText}>Jarak perangkat ke pusat: {Math.round(currentDistance)} meter</Text>
            ) : null}
            <Text style={styles.geofenceState}>
              {insideGeofence === null ? 'Status area belum dipantau' : insideGeofence ? '● Di dalam area pantauan' : '○ Di luar area pantauan'}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>Pusat area belum ditentukan. Tekan lama peta atau gunakan lokasi saya.</Text>
        )}
        {geofenceMessage ? <Text style={styles.successText}>{geofenceMessage}</Text> : null}
        {lastEvent ? <Text style={styles.eventText}>Peristiwa terakhir: {lastEvent}</Text> : null}
        <ActionButton
          title={tracking ? 'Hentikan Pemantauan Area' : 'Mulai Pemantauan Area'}
          onPress={tracking ? stopTracking : startTracking}
          disabled={locationLoading}
          secondary={tracking}
          icon={tracking ? 'stop-circle-outline' : 'play-circle-outline'}
        />
        <Text style={styles.hint}>
          Pemantauan berjalan di foreground selama halaman Peta terbuka. Pusat area dan radius tersimpan di AsyncStorage perangkat. Toleransi hysteresis mencegah alarm palsu akibat drift sinyal GPS.
        </Text>
      </InfoCard>

      {/* ============================================================== */}
      {/* BATTERY OPTIMIZATION & RESOURCE MANAGEMENT                    */}
      {/* ============================================================== */}
      <InfoCard title="Battery Optimization — Efisiensi GPS">
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Akurasi Sensor</Text>
          <Text style={styles.optimizationValue}>Location.Accuracy.Balanced</Text>
        </View>
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Interval Pembaruan</Text>
          <Text style={styles.optimizationValue}>10 detik</Text>
        </View>
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Jarak Minimum Pembaruan</Text>
          <Text style={styles.optimizationValue}>25 meter</Text>
        </View>
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Filter Sinyal Rendah</Text>
          <Text style={styles.optimizationValue}>Akurasi &gt; 100m diabaikan</Text>
        </View>
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Pembersihan Listener</Text>
          <Text style={styles.optimizationValue}>Otomatis saat keluar halaman</Text>
        </View>
        <Text style={styles.hint}>
          Sensor lokasi tidak dipantau terus-menerus. Reverse geocoding hanya dijalankan sesuai kebutuhan dan subscription dilepas ketika pengguna beralih halaman untuk menghemat baterai.
        </Text>
      </InfoCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32, paddingTop: 2 },
  heading: { fontSize: 24, fontWeight: '900', color: theme.colors.text, marginBottom: 5, letterSpacing: -0.5 },
  description: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 19, marginBottom: 15 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 15, marginBottom: 14, shadowColor: '#17365D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900', letterSpacing: -0.15 },
  cardBadge: { backgroundColor: theme.colors.primarySoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  cardBadgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: '800' },
  bodyText: { color: '#596A80', fontSize: 11, lineHeight: 18, marginBottom: 8 },
  muted: { color: '#7C899B', fontSize: 11, lineHeight: 18, marginVertical: 6 },

  // Filter chips
  filterChipRow: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  filterChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF' },

  // Map Frame & MapView
  mapFrame: { height: 320, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#DFE7F0', position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248, 250, 252, 0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  mapLoadingText: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 8 },

  // Map HUD
  mapHud: { position: 'absolute', top: 10, left: 10, zIndex: 5 },
  hudBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.78)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  hudText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Map Floating Controls
  mapControlsOverlay: { position: 'absolute', right: 10, top: 10, gap: 6, zIndex: 5 },
  mapControlBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#E2E8F0' },
  mapControlBtnActive: { backgroundColor: '#EFF6FF', borderColor: theme.colors.primary },
  controlBtnText: { fontSize: 11, fontWeight: '900', color: '#4B5563' },
  controlBtnTextActive: { color: theme.colors.primary },

  // Callout
  calloutBox: { width: 190, padding: 4 },
  calloutTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginBottom: 2 },
  calloutDesc: { fontSize: 10, color: '#475569', lineHeight: 14 },
  calloutCoords: { fontSize: 9, color: '#94A3B8', marginTop: 3, fontVariant: ['tabular-nums'] },
  calloutActionText: { fontSize: 10, color: theme.colors.primary, fontWeight: '800', marginTop: 4 },

  // Legend
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: '#53647A', fontSize: 10, fontWeight: '700' },

  // Selected Marker Card
  selectedMarkerCard: { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 13, marginTop: 12 },
  selectedMarkerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  markerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  markerBadgeText: { fontSize: 10, fontWeight: '800' },
  closeMarkerBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  selectedMarkerTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text, marginBottom: 3 },
  selectedMarkerCategory: { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 8 },
  selectedCoordsBox: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 8, marginVertical: 6 },
  coordCol: { flex: 1, alignItems: 'center' },
  coordDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  coordLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  coordVal: { fontSize: 12, fontWeight: '900', color: theme.colors.text, fontVariant: ['tabular-nums'], marginTop: 1 },
  selectedMarkerAddress: { fontSize: 11, color: theme.colors.primaryDark, lineHeight: 17, marginTop: 4 },
  selectedMarkerAccuracy: { fontSize: 10, color: '#64748B', marginTop: 3 },
  selectedMarkerMeta: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  selectedMarkerActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  markerActionSecondary: { flex: 1, minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  markerActionSecondaryText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  markerActionPrimary: { flex: 1.4, minHeight: 40, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  markerActionPrimaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  // Empty Selection Hint
  emptySelectionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 11, borderWidth: 1, borderColor: '#EDF2F7', padding: 10, marginTop: 10 },
  emptySelectionText: { flex: 1, color: '#64748B', fontSize: 10.5, lineHeight: 16 },

  // Coordinate display
  coordinateBox: { backgroundColor: '#F7FAFE', borderRadius: 13, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: '#E7EDF5' },
  coordinateGrid: { flexDirection: 'row', marginBottom: 6 },
  coordinateLabel: { color: '#8290A3', fontSize: 10, fontWeight: '800', marginTop: 4 },
  coordinateValue: { color: theme.colors.text, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  addressText: { color: theme.colors.primary, fontSize: 11, lineHeight: 18, marginTop: 8 },

  // Buttons
  button: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonIcon: { marginRight: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: '#D6E4F7' },
  secondaryButtonText: { color: theme.colors.primary },
  disabledButton: { opacity: 0.5 },
  gpsActionRow: { gap: 4, marginTop: 4 },
  spinner: { marginTop: 8 },

  // Errors & Alerts
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.dangerSoft, borderRadius: 10, padding: 9, marginVertical: 6 },
  errorText: { flex: 1, color: theme.colors.danger, fontSize: 11, lineHeight: 16 },
  successText: { color: theme.colors.success, fontSize: 11, lineHeight: 18, marginTop: 7, backgroundColor: theme.colors.successSoft, padding: 9, borderRadius: 10 },
  hint: { color: '#8390A2', fontSize: 10, lineHeight: 17, marginTop: 7 },

  // Geofence Task 3
  sectionLabel: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '900', marginTop: 4, marginBottom: 5 },
  divider: { height: 1, backgroundColor: '#EDF1F6', marginVertical: 11 },
  label: { color: '#53647A', fontSize: 11, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  radiusRow: { flexDirection: 'row', gap: 8, marginBottom: 7 },
  radiusChip: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#DFE7F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  radiusChipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  radiusText: { color: '#53647A', fontWeight: '800', fontSize: 11 },
  radiusTextSelected: { color: '#FFFFFF' },
  geofenceInfo: { backgroundColor: theme.colors.violetSoft, borderRadius: 13, borderWidth: 1, borderColor: '#E4DDF4', padding: 11, marginTop: 8 },
  geofenceState: { color: theme.colors.violet, fontSize: 11, fontWeight: '900', marginTop: 5 },
  eventText: { color: '#8D5B19', fontSize: 11, fontWeight: '700', marginTop: 6 },

  // Battery Optimization
  optimizationRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' },
  optimizationTitle: { color: '#718096', fontSize: 11 },
  optimizationValue: { color: theme.colors.text, fontSize: 11, fontWeight: '800' },
});