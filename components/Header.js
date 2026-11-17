import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function Header({ userName }) {
  return (
    <View style={styles.root}>
      <View style={styles.inner} accessibilityRole="header">
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>TEMUBARANG • LAYANAN KAMPUS</Text>
          <Text style={styles.hello}>Halo,</Text>
          <Text style={styles.name} numberOfLines={1}>{userName || 'Mahasiswa'} <Text style={styles.wave}>👋</Text></Text>
        </View>
        <View style={styles.avatar} accessibilityLabel="Profil pengguna">
          <Ionicons name="person-outline" size={22} color={theme.colors.primary} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 17 },
  inner: { maxWidth: 860, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#8A98AB', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 6 },
  hello: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  name: { color: theme.colors.text, fontSize: 22, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 },
  wave: { fontSize: 19 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: '#D9E7FB', alignItems: 'center', justifyContent: 'center' },
});
