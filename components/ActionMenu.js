import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';

export default function ActionMenu() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width <= 360;

  return (
    <View style={[styles.actionContainer, { flexDirection: isSmallScreen ? 'column' : 'row' }]}>
      <Pressable 
        style={[styles.actionCard, styles.cardLost, isSmallScreen ? { marginRight: 0, marginBottom: 15 } : { marginRight: 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Lapor kehilangan barang"
        accessibilityHint="Membuka halaman untuk membuat laporan barang yang hilang"
      >
        <View style={styles.actionIconContainer}>
          <Text style={styles.actionIcon} importantForAccessibility="no">📢</Text>
        </View>
        <Text style={styles.actionTitle}>Lapor Kehilangan</Text>
        <Text style={styles.actionDesc}>Laporkan barang yang hilang</Text>
      </Pressable>

      <Pressable 
        style={[styles.actionCard, styles.cardFound, isSmallScreen ? { marginLeft: 0 } : { marginLeft: 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Lapor barang ditemukan"
        accessibilityHint="Membuka halaman untuk membuat laporan barang yang ditemukan"
      >
        <View style={styles.actionIconContainer}>
          <Text style={styles.actionIcon} importantForAccessibility="no">💡</Text>
        </View>
        <Text style={styles.actionTitle}>Lapor Temuan</Text>
        <Text style={styles.actionDesc}>Laporkan barang yang ditemukan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionContainer: { justifyContent: 'space-between', marginBottom: 25 },
  actionCard: {
    flex: 1, padding: 15, borderRadius: 12, borderTopWidth: 4, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardLost: { borderColor: '#D32F2F' },
  cardFound: { borderColor: '#2E7D32' },
  actionIconContainer: { marginBottom: 10 },
  actionIcon: { fontSize: 24 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  actionDesc: { fontSize: 13, color: '#555', lineHeight: 18 },
});
