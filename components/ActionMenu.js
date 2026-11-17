import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function ActionMenu({ onLost, onFound }) {
  const { width } = useWindowDimensions();
  const narrow = width < 350;
  const actions = [
    { icon: 'megaphone-outline', title: 'Barang Hilang', desc: 'Laporkan barang milikmu yang hilang', color: theme.colors.danger, bg: theme.colors.dangerSoft, onPress: onLost, cta: 'Buat laporan' },
    { icon: 'cube-outline', title: 'Barang Temuan', desc: 'Bantu pemilik menemukan barangnya', color: theme.colors.success, bg: theme.colors.successSoft, onPress: onFound, cta: 'Buat laporan' },
  ];
  return (
    <View style={[styles.row, { flexDirection: narrow ? 'column' : 'row' }]}>
      {actions.map(action => (
        <Pressable key={action.title} onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.title} accessibilityHint={action.desc} style={[styles.card, { backgroundColor: action.bg, marginBottom: narrow ? 10 : 0 }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#FFFFFFB8' }]}><Ionicons name={action.icon} size={23} color={action.color} /></View>
          <Text style={[styles.title, { color: action.color }]}>{action.title}</Text>
          <Text style={styles.desc}>{action.desc}</Text>
          <View style={styles.ctaRow}><Text style={[styles.cta, { color: action.color }]}>{action.cta}</Text><Ionicons name="arrow-forward" size={14} color={action.color} /></View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  card: { flex: 1, minWidth: 0, borderRadius: 18, padding: 15, minHeight: 164, borderWidth: 1, borderColor: '#FFFFFF', justifyContent: 'space-between' },
  iconWrap: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 5, letterSpacing: -0.2 },
  desc: { color: '#58677A', fontSize: 11, lineHeight: 16, minHeight: 32 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  cta: { fontSize: 11, fontWeight: '800' },
});
