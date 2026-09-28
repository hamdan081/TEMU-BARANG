import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';

export default function LatestItems() {
  const { width } = useWindowDimensions();
  const isTabletOrLandscape = width >= 768;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">Barang Terbaru</Text>
      <View style={{ flexDirection: isTabletOrLandscape ? 'row' : 'column', justifyContent: 'space-between' }}>
        
        <Pressable 
          style={[styles.itemCard, isTabletOrLandscape && { flex: 1, marginRight: 10, marginBottom: 0 }]}
          accessibilityRole="button"
          accessibilityLabel="Dompet Hitam, status Hilang, lokasi Gedung A"
          accessibilityHint="Melihat detail barang Dompet Hitam"
        >
          <View style={styles.itemImagePlaceholder} accessible={true} accessibilityLabel="Gambar dompet hitam yang dilaporkan hilang">
            <Text style={styles.placeholderText} importantForAccessibility="no">Gambar</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} importantForAccessibility="no">Dompet Hitam</Text>
            <Text style={styles.itemLocation} importantForAccessibility="no">📍 Gedung A</Text>
            <View style={[styles.statusBadge, styles.statusLostBadge]}>
              <Text style={styles.statusLostText} importantForAccessibility="no">Hilang</Text>
            </View>
          </View>
        </Pressable>

        <Pressable 
          style={[styles.itemCard, isTabletOrLandscape && { flex: 1, marginLeft: 10, marginBottom: 0 }]}
          accessibilityRole="button"
          accessibilityLabel="Kunci Motor, status Ditemukan, lokasi Area Parkir"
          accessibilityHint="Melihat detail barang Kunci Motor"
        >
          <View style={styles.itemImagePlaceholder} accessible={true} accessibilityLabel="Gambar kunci motor yang ditemukan">
            <Text style={styles.placeholderText} importantForAccessibility="no">Gambar</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} importantForAccessibility="no">Kunci Motor</Text>
            <Text style={styles.itemLocation} importantForAccessibility="no">📍 Area Parkir</Text>
            <View style={[styles.statusBadge, styles.statusFoundBadge]}>
              <Text style={styles.statusFoundText} importantForAccessibility="no">Ditemukan</Text>
            </View>
          </View>
        </Pressable>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  itemCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', minHeight: 80,
  },
  itemImagePlaceholder: { width: 80, height: 80, backgroundColor: '#E0E0E0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  placeholderText: { fontSize: 12, color: '#555' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  itemLocation: { fontSize: 13, color: '#555', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  statusLostBadge: { backgroundColor: '#FFEBEE' },
  statusFoundBadge: { backgroundColor: '#E8F5E9' },
  statusLostText: { fontSize: 12, color: '#C62828', fontWeight: 'bold' },
  statusFoundText: { fontSize: 12, color: '#1B5E20', fontWeight: 'bold' },
});

// update
