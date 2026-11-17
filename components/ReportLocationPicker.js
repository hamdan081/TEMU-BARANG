import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../theme';
import { formatGeocodedAddress, getCurrentLocationWithAddress } from '../services/location';
import { hasValidCoordinates } from '../utils/locationMath';

const DEFAULT_REGION = {
  latitude: -7.9666,
  longitude: 112.6326,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export default function ReportLocationPicker({ visible, initialCoordinate, initialAddress = '', initialAccuracy = null, onClose, onSelect }) {
  const mapRef = useRef(null);
  const geocodeSequence = useRef(0);
  const [coordinate, setCoordinate] = useState(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [address, setAddress] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [accuracy, setAccuracy] = useState(null);

  const validInitial = useMemo(() => hasValidCoordinates(initialCoordinate), [
    initialCoordinate?.latitude,
    initialCoordinate?.longitude,
  ]);

  useEffect(() => {
    if (!visible) {
      geocodeSequence.current += 1;
      setResolving(false);
      return;
    }
    const start = validInitial
      ? { latitude: Number(initialCoordinate.latitude), longitude: Number(initialCoordinate.longitude) }
      : { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };
    setCoordinate(validInitial ? start : null);
    setRegion({ ...start, latitudeDelta: 0.012, longitudeDelta: 0.012 });
    setAddress(validInitial ? (initialAddress || '') : '');
    setAccuracy(validInitial && Number.isFinite(initialAccuracy) ? initialAccuracy : null);
    setError('');
    setResolving(false);
    if (validInitial && !initialAddress) {
      const sequence = ++geocodeSequence.current;
      setResolving(true);
      Location.reverseGeocodeAsync(start)
        .then(places => {
          if (sequence !== geocodeSequence.current) return;
          const nextAddress = formatGeocodedAddress(places?.[0]);
          setAddress(nextAddress);
          if (!nextAddress) setError('Alamat tidak tersedia. Koordinat tetap dapat digunakan.');
        })
        .catch(() => {
          if (sequence === geocodeSequence.current) setError('Alamat tidak dapat dimuat. Koordinat tetap dapat digunakan.');
        })
        .finally(() => {
          if (sequence === geocodeSequence.current) setResolving(false);
        });
    }
  }, [visible, validInitial, initialCoordinate?.latitude, initialCoordinate?.longitude, initialAddress, initialAccuracy]);

  const resolveAddress = async point => {
    const sequence = ++geocodeSequence.current;
    setResolving(true);
    setError('');
    try {
      const places = await Location.reverseGeocodeAsync(point);
      const nextAddress = formatGeocodedAddress(places?.[0]);
      if (sequence !== geocodeSequence.current) return;
      setAddress(nextAddress);
      if (!nextAddress) setError('Alamat tidak tersedia. Koordinat tetap dapat digunakan.');
    } catch {
      if (sequence !== geocodeSequence.current) return;
      setAddress('');
      setError('Alamat tidak dapat dimuat. Koordinat tetap dapat digunakan.');
    } finally {
      if (sequence === geocodeSequence.current) setResolving(false);
    }
  };

  const handleMapPress = event => {
    const point = event?.nativeEvent?.coordinate;
    if (!hasValidCoordinates(point)) return;
    const next = { latitude: Number(point.latitude), longitude: Number(point.longitude) };
    setCoordinate(next);
    setAccuracy(null);
    setRegion(current => ({ ...current, ...next }));
    resolveAddress(next);
  };

  const useDeviceLocation = async () => {
    const sequence = ++geocodeSequence.current;
    setResolving(true);
    setError('');
    try {
      const result = await getCurrentLocationWithAddress();
      if (sequence !== geocodeSequence.current) return;
      const next = { latitude: result.latitude, longitude: result.longitude };
      setCoordinate(next);
      setRegion({ ...next, latitudeDelta: 0.012, longitudeDelta: 0.012 });
      setAddress(result.address || '');
      setAccuracy(result.accuracy);
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 450);
      if (result.geocodingWarning) setError(result.geocodingWarning);
    } catch (locationError) {
      if (sequence === geocodeSequence.current) setError(locationError?.message || 'Lokasi perangkat tidak dapat diambil.');
    } finally {
      if (sequence === geocodeSequence.current) setResolving(false);
    }
  };

  const confirm = () => {
    if (!hasValidCoordinates(coordinate)) {
      setError('Pilih titik pada peta terlebih dahulu.');
      return;
    }
    const readableAddress = address || `Koordinat ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
    geocodeSequence.current += 1;
    onSelect?.({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      accuracy,
      address,
      lokasi: readableAddress,
    });
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Pilih Lokasi Barang</Text>
            <Text style={styles.subtitle}>Ketuk peta untuk menentukan lokasi terakhir atau lokasi barang ditemukan.</Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Tutup pemilih lokasi" style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.mapFrame}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
            showsCompass
            showsScale
            toolbarEnabled
          >
            {hasValidCoordinates(coordinate) ? (
              <Marker
                coordinate={coordinate}
                draggable
                onDragEnd={event => handleMapPress({ nativeEvent: { coordinate: event.nativeEvent.coordinate } })}
                title="Lokasi Barang"
                description="Geser marker untuk menyesuaikan titik lokasi"
                pinColor="#1565C0"
              />
            ) : null}
          </MapView>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Titik yang dipilih</Text>
          {hasValidCoordinates(coordinate) ? (
            <>
              <Text style={styles.coordinate}>Lat: {coordinate.latitude.toFixed(6)}  •  Lng: {coordinate.longitude.toFixed(6)}</Text>
              <Text style={styles.address}>{resolving ? 'Mencari alamat...' : address || 'Alamat belum tersedia; koordinat tetap akan disimpan.'}</Text>
              {Number.isFinite(accuracy) ? <Text style={styles.accuracy}>Akurasi GPS: ±{Math.round(accuracy)} meter</Text> : null}
            </>
          ) : <Text style={styles.subtitle}>Belum ada titik dipilih.</Text>}
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          {resolving ? <ActivityIndicator color="#1565C0" style={styles.spinner} /> : null}
          <Pressable onPress={useDeviceLocation} disabled={resolving} style={[styles.secondaryButton, resolving && styles.disabled]}>
            <Text style={styles.secondaryText}>◎ Gunakan Lokasi GPS Saya</Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable onPress={confirm} disabled={!hasValidCoordinates(coordinate) || resolving} style={[styles.confirmButton, (!hasValidCoordinates(coordinate) || resolving) && styles.disabled]}>
              <Text style={styles.confirmText}>Gunakan Titik Ini</Text>
            </Pressable>
          </View>
          <Text style={styles.privacyNote}>Pilih area umum seperti gedung, perpustakaan, atau kantin. Hindari mencantumkan alamat rumah dan titik pribadi yang sensitif.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 44 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  closeButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EAF0F7', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#42536A', fontSize: 18, fontWeight: '800' },
  mapFrame: { flex: 1, marginHorizontal: 14, overflow: 'hidden', borderRadius: 17, borderWidth: 1, borderColor: '#DFE7F0' },
  map: { flex: 1 },
  panel: { padding: 17, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E6ECF3', gap: 9 },
  panelTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  coordinate: { color: theme.colors.text, fontSize: 11, fontWeight: '800' },
  address: { color: theme.colors.primary, fontSize: 11, lineHeight: 17 },
  accuracy: { color: theme.colors.textMuted, fontSize: 10 },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSoft, padding: 9, borderRadius: 10, fontSize: 10, lineHeight: 16 },
  spinner: { marginVertical: 2 },
  secondaryButton: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: '#D6E4F7', backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: theme.colors.primary, fontWeight: '800', fontSize: 11 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 2 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#DFE7F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cancelText: { color: '#596A80', fontWeight: '800', fontSize: 12 },
  confirmButton: { flex: 1.5, minHeight: 48, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  disabled: { opacity: 0.5 },
  privacyNote: { color: '#8491A3', fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
