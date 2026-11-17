import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ItemCard from './ItemCard';
import { theme } from '../theme';

export default function LatestItems({ items, onOpen, onViewAll }) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View><Text style={styles.title} accessibilityRole="header">Barang Terbaru</Text><Text style={styles.subtitle}>Laporan yang baru masuk</Text></View>
        <Pressable onPress={onViewAll} accessibilityRole="button" accessibilityLabel="Lihat semua barang" style={styles.action}>
          <Text style={styles.actionText}>Lihat semua</Text><Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
        </Pressable>
      </View>
      {items.length ? items.slice(0, 3).map(item => <ItemCard key={item.id} item={item} onPress={() => onOpen(item)} compact />) : <Text style={styles.empty}>Belum ada laporan barang.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 22 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  subtitle: { color: '#8996A8', fontSize: 11, marginTop: 3 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 8 },
  actionText: { color: theme.colors.primary, fontWeight: '800', fontSize: 11 },
  empty: { color: theme.colors.textMuted, paddingVertical: 16 },
});
