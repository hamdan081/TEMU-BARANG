import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function SearchBar({ value, onChangeText }) {
  return (
    <View style={styles.root}>
      <Ionicons name="search-outline" size={20} color="#8290A3" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Cari nama atau kategori barang..."
        placeholderTextColor="#929EAE"
        accessibilityLabel="Cari barang berdasarkan nama, kategori, atau lokasi"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 54, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 16, marginTop: 16, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 11, ...theme.shadow.card },
  input: { flex: 1, color: theme.colors.text, fontSize: 14, minHeight: 50, paddingVertical: 8 },
});
