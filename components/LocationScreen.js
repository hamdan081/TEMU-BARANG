import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLocationWithAddress } from '../services/location';
import { formatCoordinate, hasValidCoordinates, haversineDistanceMeters, isInsideGeofence } from '../utils/locationMath';
import { theme } from '../theme';

const FALLBACK_REGION = {
  // Titik awal peta dari contoh koordinat pada materi Week 10; bukan lokasi GPS pengguna.
  latitude: -7.9666,
  longitude: 112.6326,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};
const RADIUS_OPTIONS = [150, 300, 500];

function ActionButton({ title, onPress, disabled = false, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>
    </Pressable>
  );
}

function InfoCard({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function LocationScreen({ items = [], focusItem = null, onSelectItem, userId }) {
  const mapRef = useRef(null);
  const watchRef = useRef(null);
  const wasInsideRef = useRef(null);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [geofenceCenter, setGeofenceCenter] = useState(null);
  const [geofenceRadius, setGeofenceRadius] = useState(300);
  const [tracking, setTracking] = useState(false);
  const [insideGeofence, setInsideGeofence] = useState(null);
  const [geofenceMessage, setGeofenceMessage] = useState('');
  const [lastEvent, setLastEvent] = useState('');
  const [loadedSettingsKey, setLoadedSettingsKey] = useState(null);
  const settingsKey = useMemo(() => `temubarang.geofence.settings.v1.${userId ?? 'guest'}`, [userId]);

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

  useEffect(() => {
    if (loadedSettingsKey !== settingsKey) return;
    AsyncStorage.setItem(settingsKey, JSON.stringify({ center: geofenceCenter, radius: geofenceRadius }))
      .catch(() => {});
  }, [loadedSettingsKey, settingsKey, geofenceCenter, geofenceRadius]);

  const mappedItems = useMemo(
    () => items.filter(item => hasValidCoordinates(item)),
    [items]
  );

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

  const moveMapTo = useCallback((coordinate, delta = 0.012) => {
    if (!coordinate || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: Number(coordinate.latitude),
      longitude: Number(coordinate.longitude),
      latitudeDelta: delta,
      longitudeDelta: delta,
    }, 650);
  }, []);

  const captureCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      const result = await getCurrentLocationWithAddress();
      setCurrentLocation(result);
      moveMapTo(result, 0.012);
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
  }, [moveMapTo]);

  const stopTracking = useCallback(() => {
    watchRef.current?.remove?.();
    watchRef.current = null;
    wasInsideRef.current = null;
    setInsideGeofence(null);
    setTracking(false);
  }, []);

  useEffect(() => {
    if (hasValidCoordinates(focusItem)) {
      moveMapTo(focusItem, 0.012);
    }
  }, [focusItem?.id, focusItem?.latitude, focusItem?.longitude, moveMapTo]);

  useEffect(() => () => {
    // Hentikan subscription saat pengguna meninggalkan halaman Peta.
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
    moveMapTo(center, 0.012);
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

      // Mode foreground untuk demo Expo Go; update dibatasi interval dan jarak agar hemat baterai.
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

          // Abaikan sampel dengan akurasi buruk agar batas geofence tidak memicu alarm palsu.
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Lokasi & Peta TemuBarang</Text>
      <Text style={styles.description}>
        Tandai lokasi terakhir barang hilang atau lokasi barang ditemukan, lihat laporan pada peta, dan pantau area sekitar.
      </Text>

      <InfoCard title="Task 1 — GPS Location">
        <Text style={styles.bodyText}>Ambil koordinat perangkat dengan izin lokasi saat aplikasi digunakan.</Text>
        {currentLocation ? (
          <View style={styles.coordinateBox}>
            <Text style={styles.coordinateLabel}>Latitude</Text>
            <Text style={styles.coordinateValue}>{formatCoordinate(currentLocation.latitude)}</Text>
            <Text style={styles.coordinateLabel}>Longitude</Text>
            <Text style={styles.coordinateValue}>{formatCoordinate(currentLocation.longitude)}</Text>
            <Text style={styles.coordinateLabel}>Accuracy</Text>
            <Text style={styles.coordinateValue}>
              {Number.isFinite(currentLocation.accuracy) ? `±${Math.round(currentLocation.accuracy)} meter` : 'Tidak tersedia'}
            </Text>
            <Text style={styles.addressText}>
              {currentLocation.address || 'Alamat belum tersedia. Koordinat GPS tetap dapat digunakan.'}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>Lokasi perangkat belum diambil.</Text>
        )}
        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
        <ActionButton
          title={locationLoading ? 'Mengambil lokasi...' : 'Ambil Lokasi Saya'}
          onPress={captureCurrentLocation}
          disabled={locationLoading}
        />
        {locationLoading ? <ActivityIndicator color="#1565C0" style={styles.spinner} /> : null}
      </InfoCard>

      <InfoCard title="Task 2 — Lokasi Laporan pada Peta">
        <Text style={styles.bodyText}>
          Marker merah menunjukkan laporan barang hilang, marker hijau menunjukkan barang ditemukan, dan marker biru menunjukkan posisi perangkat.
        </Text>
        <View style={styles.mapFrame}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            onLongPress={handleMapLongPress}
            toolbarEnabled
            loadingEnabled
            showsCompass
            showsScale
          >
            {hasValidCoordinates(currentLocation) ? (
              <Marker
                coordinate={{ latitude: Number(currentLocation.latitude), longitude: Number(currentLocation.longitude) }}
                title="Lokasi Saya"
                description={currentLocation.address || 'Posisi perangkat saat ini'}
                pinColor="#1565C0"
              />
            ) : null}

            {mappedItems.map(item => (
              <Marker
                key={`barang-${item.id}`}
                coordinate={{ latitude: Number(item.latitude), longitude: Number(item.longitude) }}
                title={item.nama}
                description={`${item.jenisLaporan === 'Hilang' ? 'Barang Hilang' : 'Barang Ditemukan'} • ${item.lokasi}${item.locationPrecision === 'approximate' ? ' • lokasi perkiraan untuk privasi' : ''}`}
                pinColor={item.jenisLaporan === 'Hilang' ? '#DC2626' : '#16A34A'}
                onCalloutPress={() => onSelectItem?.(item)}
              />
            ))}

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
                  pinColor="#7C3AED"
                />
              </>
            ) : null}
          </MapView>
        </View>
        <View style={styles.legendRow}>
          <Text style={styles.legendText}>🔵 Lokasi saya</Text>
          <Text style={styles.legendText}>🔴 Barang hilang</Text>
          <Text style={styles.legendText}>🟢 Barang ditemukan</Text>
        </View>
        <Text style={styles.muted}>
          {mappedItems.length
            ? `${mappedItems.length} laporan memiliki koordinat GPS. Tekan balon marker untuk membuka detail laporan.`
            : 'Belum ada laporan dengan koordinat GPS. Laporan lama tetap tampil di daftar barang, tetapi belum memiliki marker peta.'}
        </Text>
        <Text style={styles.hint}>Tekan lama pada peta untuk memilih pusat area pantauan.</Text>
      </InfoCard>

      <InfoCard title="Task 3 — Reverse Geocoding & Geofencing">
        <Text style={styles.sectionLabel}>Reverse Geocoding</Text>
        <Text style={styles.bodyText}>
          Koordinat GPS diterjemahkan menjadi alamat yang lebih mudah dibaca ketika pengguna mengambil lokasi. Proses ini dijalankan saat diminta, bukan setiap pembaruan GPS.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Geofencing — Area Pantauan</Text>
        <Text style={styles.bodyText}>
          Pilih pusat area dengan menekan lama peta atau gunakan lokasi saat ini. Aplikasi memberi peringatan saat perangkat masuk atau keluar dari radius yang dipilih.
        </Text>
        <ActionButton
          title="Gunakan Lokasi Saya sebagai Pusat Area"
          onPress={setCenterToCurrentLocation}
          secondary
          disabled={!hasValidCoordinates(currentLocation)}
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
          <Text style={styles.muted}>Pusat area belum ditentukan.</Text>
        )}
        {geofenceMessage ? <Text style={styles.successText}>{geofenceMessage}</Text> : null}
        {lastEvent ? <Text style={styles.eventText}>Peristiwa terakhir: {lastEvent}</Text> : null}
        <ActionButton
          title={tracking ? 'Hentikan Pemantauan Area' : 'Mulai Pemantauan Area'}
          onPress={tracking ? stopTracking : startTracking}
          disabled={locationLoading}
          secondary={tracking}
        />
        <Text style={styles.hint}>
          Pemantauan berjalan saat halaman Peta terbuka (foreground). Pusat area dan radius disimpan pada perangkat. Sampel GPS dengan akurasi lebih buruk dari 100 meter diabaikan dan batas area memakai toleransi agar notifikasi tidak berulang karena GPS bergeser sedikit. Subscription dihentikan saat halaman ditinggalkan untuk menghemat baterai. Pemantauan latar belakang memerlukan development build dan izin tambahan.
        </Text>
      </InfoCard>

      <InfoCard title="Battery Optimization — Efisiensi GPS">
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Akurasi</Text>
          <Text style={styles.optimizationValue}>Balanced</Text>
        </View>
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Interval pembaruan</Text>
          <Text style={styles.optimizationValue}>10 detik</Text>
        </View>
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Jarak minimum update</Text>
          <Text style={styles.optimizationValue}>25 meter</Text>
        </View>
        <View style={styles.optimizationRow}>
          <Text style={styles.optimizationTitle}>Mode pemantauan</Text>
          <Text style={styles.optimizationValue}>Foreground</Text>
        </View>
        <Text style={styles.hint}>
          GPS tidak dipantau terus-menerus. Akurasi dan interval disesuaikan dengan kebutuhan, reverse geocoding hanya dilakukan saat diminta, dan listener dibersihkan ketika tidak digunakan.
        </Text>
      </InfoCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 28, paddingTop: 2 },
  heading: { fontSize: 23, fontWeight: '900', color: theme.colors.text, marginBottom: 5, letterSpacing: -0.5 },
  description: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 19, marginBottom: 15 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 15, marginBottom: 12, shadowColor: '#17365D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 2 },
  cardTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900', marginBottom: 9, letterSpacing: -0.15 },
  bodyText: { color: '#596A80', fontSize: 11, lineHeight: 18, marginBottom: 8 },
  muted: { color: '#7C899B', fontSize: 11, lineHeight: 18, marginVertical: 7 },
  coordinateBox: { backgroundColor: '#F7FAFE', borderRadius: 13, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: '#E7EDF5' },
  coordinateLabel: { color: '#8290A3', fontSize: 10, fontWeight: '800', marginTop: 4 },
  coordinateValue: { color: theme.colors.text, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  addressText: { color: theme.colors.primary, fontSize: 11, lineHeight: 18, marginTop: 8 },
  button: { minHeight: 48, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 10, marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: '#D6E4F7' },
  secondaryButtonText: { color: theme.colors.primary },
  disabledButton: { opacity: 0.5 },
  spinner: { marginTop: 8 },
  errorText: { color: theme.colors.danger, fontSize: 11, lineHeight: 18, marginVertical: 5, backgroundColor: theme.colors.dangerSoft, borderRadius: 10, padding: 9 },
  successText: { color: theme.colors.success, fontSize: 11, lineHeight: 18, marginTop: 7, backgroundColor: theme.colors.successSoft, padding: 9, borderRadius: 10 },
  mapFrame: { height: 310, overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#DFE7F0', marginTop: 7 },
  map: { width: '100%', height: '100%' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  legendText: { color: '#53647A', fontSize: 10, fontWeight: '700' },
  hint: { color: '#8390A2', fontSize: 10, lineHeight: 17, marginTop: 8 },
  sectionLabel: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '900', marginTop: 4, marginBottom: 5 },
  divider: { height: 1, backgroundColor: '#EDF1F6', marginVertical: 11 },
  label: { color: '#53647A', fontSize: 11, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  radiusRow: { flexDirection: 'row', gap: 8, marginBottom: 7 },
  radiusChip: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: '#DFE7F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  radiusChipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  radiusText: { color: '#53647A', fontWeight: '800', fontSize: 11 },
  radiusTextSelected: { color: '#FFFFFF' },
  geofenceInfo: { backgroundColor: theme.colors.violetSoft, borderRadius: 13, borderWidth: 1, borderColor: '#E4DDF4', padding: 11, marginTop: 8 },
  geofenceState: { color: theme.colors.violet, fontSize: 11, fontWeight: '900', marginTop: 5 },
  eventText: { color: '#8D5B19', fontSize: 11, fontWeight: '700', marginTop: 6 },
  optimizationRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' },
  optimizationTitle: { color: '#718096', fontSize: 11 },
  optimizationValue: { color: theme.colors.text, fontSize: 11, fontWeight: '800' },
});
