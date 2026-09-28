import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';

export default function CategoryList() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width <= 360;
  const isTabletOrLandscape = width >= 768;
  const categoryWidth = isTabletOrLandscape ? '15%' : (isSmallScreen ? '48%' : '31%');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">Kategori Barang</Text>
      <View style={styles.categoryContainer}>
        {['📱 Elektronik', '📄 Dokumen', '👕 Pakaian', '🎒 Aksesoris', '✏️ Perlengkapan', '📦 Lainnya'].map((item, index) => {
          const cleanText = item.substring(3);
          return (
            <Pressable 
              key={index} 
              style={[styles.categoryCard, { width: categoryWidth }]}
              accessibilityRole="button"
              accessibilityLabel={`Kategori ${cleanText}`}
              accessibilityHint={`Melihat daftar barang dalam kategori ${cleanText}`}
            >
              <Text style={styles.categoryText} importantForAccessibility="no">{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    backgroundColor: '#FFFFFF', paddingVertical: 15, paddingHorizontal: 5,
    borderRadius: 8, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0',
    minHeight: 48,
  },
  categoryText: { fontSize: 13, color: '#444', textAlign: 'center', marginTop: 5, fontWeight: '500' },
});
