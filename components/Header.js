import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';

export default function Header() {
  const { width } = useWindowDimensions();
  const isTabletOrLandscape = width >= 768;
  const contentMaxWidth = isTabletOrLandscape ? 800 : '100%';
  const screenPadding = isTabletOrLandscape ? 40 : 20;

  return (
    <View style={[styles.header, { paddingHorizontal: screenPadding }]} accessible={false}>
      <View style={[styles.headerInner, { maxWidth: contentMaxWidth }]}>
        <View accessible={true} accessibilityLabel="Halo, Mahasiswa" accessibilityRole="header">
          <Text style={styles.greeting}>Halo,</Text>
          <Text style={[styles.userName, { fontSize: isTabletOrLandscape ? 24 : 20 }]}>
            Mahasiswa 👋
          </Text>
        </View>
        
        <Pressable 
          style={styles.notificationBtn}
          accessibilityRole="button"
          accessibilityLabel="Notifikasi"
          accessibilityHint="Membuka daftar notifikasi Anda"
        >
          <Text style={styles.notificationIcon} importantForAccessibility="no">🔔</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF', paddingTop: 15, paddingBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 3,
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', alignSelf: 'center' },
  greeting: { fontSize: 14, color: '#444' },
  userName: { fontWeight: 'bold', color: '#1565C0' },
  notificationBtn: { backgroundColor: '#F0F4F8', borderRadius: 50, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  notificationIcon: { fontSize: 18 },
});

// update
