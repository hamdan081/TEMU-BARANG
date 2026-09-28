import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function SearchBar() {
  return (
    <View style={styles.searchContainer}>
      <Text style={styles.searchIcon} importantForAccessibility="no">🔍</Text>
      <TextInput 
        style={styles.searchInput} 
        placeholder="Cari barang..."
        placeholderTextColor="#555555"
        accessibilityLabel="Cari barang hilang atau ditemukan"
        accessibilityHint="Masukkan nama barang yang ingin dicari, lalu tekan enter"
        accessibilityRole="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 15, borderRadius: 10, marginTop: 10, marginBottom: 25,
    height: 50, borderWidth: 1, borderColor: '#E0E0E0',
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
});

// update
