import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const tabs = [
  ['home', 'home-outline', 'Beranda'],
  ['list', 'albums-outline', 'Daftar'],
  ['report', 'add-circle-outline', 'Lapor'],
  ['map', 'map-outline', 'Peta'],
  ['more', 'grid-outline', 'Lainnya'],
];

export default function BottomNav({ active, onSelect }) {
  return (
    <View style={styles.base}>
      <View style={styles.row}>
        {tabs.map(([key, icon, label]) => {
          const selected = active === key;
          return (
            <Pressable key={key} onPress={() => onSelect(key)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} style={styles.tab}>
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                <Ionicons name={selected ? icon.replace('-outline', '') : icon} size={21} color={selected ? theme.colors.primary : '#8996A8'} />
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: '#FFFFFF', borderTopColor: '#E8EDF4', borderTopWidth: 1, paddingTop: 7, paddingBottom: 4, shadowColor: '#19365B', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 8 },
  row: { maxWidth: 860, width: '100%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-around' },
  tab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, paddingVertical: 2, gap: 2 },
  iconWrap: { width: 48, height: 31, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconWrapSelected: { backgroundColor: theme.colors.primarySoft },
  label: { fontSize: 10, color: '#8996A8', fontWeight: '600' },
  labelSelected: { color: theme.colors.primary, fontWeight: '800' },
});
