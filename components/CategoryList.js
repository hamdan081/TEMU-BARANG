import React from 'react';
import { View, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categories } from '../models/Barang';
import { theme } from '../theme';

const categoryIcons = {
  Elektronik: 'phone-portrait-outline',
  Dokumen: 'document-text-outline',
  Pakaian: 'shirt-outline',
  Aksesoris: 'key-outline',
  Perlengkapan: 'briefcase-outline',
  Lainnya: 'cube-outline',
};

export default function CategoryList({ onSelect }) {
  const { width } = useWindowDimensions();
  const cols = width < 350 ? 2 : width >= 768 ? 6 : 3;
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.title} accessibilityRole="header">Kategori Barang</Text>
        <Text style={styles.caption}>Pilih kategori</Text>
      </View>
      <View style={styles.grid}>
        {categories.map(cat => (
          <Pressable key={cat} onPress={() => onSelect(cat)} accessibilityRole="button" accessibilityLabel={`Kategori ${cat}`} style={[styles.category, { width: `${100 / cols - 2}%` }]}>
            <View style={styles.iconWrap}><Ionicons name={categoryIcons[cat] || 'grid-outline'} size={21} color={theme.colors.primary} /></View>
            <Text style={styles.label}>{cat}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  caption: { color: '#8A98AB', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  category: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 15, minHeight: 88, backgroundColor: theme.colors.surface, marginBottom: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, paddingVertical: 10, gap: 7, ...theme.shadow.card },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: '#34445A', textAlign: 'center', fontWeight: '700' },
});
