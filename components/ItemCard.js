import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveImageUrl } from '../services/api';
import { theme } from '../theme';

const statusPalette = {
  'Belum Ditemukan': { bg: '#FFF5E4', fg: '#98621A' },
  'Menunggu Pemilik': { bg: '#EAF2FF', fg: '#245CA5' },
  'Menunggu Pengambilan': { bg: '#F2EEFA', fg: '#7050B3' },
  'Selesai Dikembalikan': { bg: '#E9F7F1', fg: '#147653' },
};
const typePalette = { Hilang: { bg: '#FFF0F2', fg: '#B9384B' }, Ditemukan: { bg: '#E9F7F1', fg: '#13845D' } };

export default function ItemCard({ item, onPress, compact = false }) {
  const colors = statusPalette[item.status] || statusPalette['Belum Ditemukan'];
  const typeColors = typePalette[item.jenisLaporan] || typePalette.Hilang;
  const [imgError, setImgError] = useState(false);
  const resolvedUri = resolveImageUrl(item.image);
  const showImage = Boolean(resolvedUri && !imgError && /^(https?:|file:)/.test(resolvedUri));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.nama}, jenis laporan ${item.jenisLaporan}, status penanganan ${item.status}, lokasi ${item.lokasi}`} accessibilityHint="Lihat informasi detail dan perkembangan penanganan barang" style={styles.card}>
      {showImage ? <Image source={{ uri: resolvedUri }} style={styles.image} accessibilityLabel={`Foto ${item.nama}`} onError={() => setImgError(true)} /> : (
        <View style={styles.imagePlaceholder}><Ionicons name="cube-outline" size={28} color={theme.colors.primary} /></View>
      )}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={compact ? 1 : 2}>{item.nama}</Text>
        <View style={styles.metaRow}><Ionicons name="location-outline" size={13} color="#8290A3" /><Text style={styles.desc} numberOfLines={1}>{item.lokasi}</Text></View>
        {!compact && <Text style={styles.desc}>{item.kategori} · {item.tanggal}</Text>}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: typeColors.bg }]}><Text style={{ color: typeColors.fg, fontWeight: '800', fontSize: 10 }}>Barang {item.jenisLaporan}</Text></View>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 10 }}>{item.status}</Text></View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#9AA6B5" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 17, borderColor: theme.colors.border, borderWidth: 1, padding: 11, marginBottom: 10, flexDirection: 'row', alignItems: 'center', minHeight: 100, gap: 11, ...theme.shadow.card },
  image: { width: 74, height: 74, borderRadius: 12, backgroundColor: '#F0F4F9' },
  imagePlaceholder: { width: 74, height: 74, borderRadius: 12, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, color: theme.colors.text, fontWeight: '800', marginBottom: 5, letterSpacing: -0.15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  desc: { flexShrink: 1, fontSize: 11, color: '#65748A', marginBottom: 3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  badge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 7, borderRadius: 7 },
});
