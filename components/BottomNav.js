import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';

export default function BottomNav() {
  const { width } = useWindowDimensions();
  const isTabletOrLandscape = width >= 768;
  const contentMaxWidth = isTabletOrLandscape ? 800 : '100%';

  return (
    <View style={styles.bottomNavWrapper}>
      <View style={[styles.bottomNavContent, { maxWidth: contentMaxWidth }]}>
        <Pressable 
          style={styles.navItem}
          accessibilityRole="tab"
          accessibilityLabel="Beranda"
          accessibilityState={{ selected: true }} 
        >
          <Text style={[styles.navIcon, styles.navActiveText]} importantForAccessibility="no">🏠</Text>
          <Text style={[styles.navText, styles.navActiveText]} importantForAccessibility="no">Beranda</Text>
          <View style={styles.activeIndicator} />
        </Pressable>
        
        <Pressable 
          style={styles.navItem}
          accessibilityRole="tab"
          accessibilityLabel="Daftar"
          accessibilityState={{ selected: false }}
        >
          <Text style={styles.navIcon} importantForAccessibility="no">📋</Text>
          <Text style={styles.navText} importantForAccessibility="no">Daftar</Text>
        </Pressable>

        <Pressable 
          style={styles.navItem}
          accessibilityRole="tab"
          accessibilityLabel="Lapor"
          accessibilityState={{ selected: false }}
        >
          <Text style={styles.navIcon} importantForAccessibility="no">➕</Text>
          <Text style={styles.navText} importantForAccessibility="no">Lapor</Text>
        </Pressable>

        <Pressable 
          style={styles.navItem}
          accessibilityRole="tab"
          accessibilityLabel="Profil"
          accessibilityState={{ selected: false }}
        >
          <Text style={styles.navIcon} importantForAccessibility="no">👤</Text>
          <Text style={styles.navText} importantForAccessibility="no">Profil</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavWrapper: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0',
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  bottomNavContent: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    width: '100%', alignSelf: 'center', paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center', justifyContent: 'center', padding: 5, minWidth: 60, minHeight: 50,
  },
  navIcon: { fontSize: 20, marginBottom: 4, color: '#777' },
  navText: { fontSize: 12, color: '#777', fontWeight: '500' },
  navActiveText: { color: '#1565C0', fontWeight: 'bold' },
  activeIndicator: { width: 20, height: 4, backgroundColor: '#1565C0', borderRadius: 2, marginTop: 4, position: 'absolute', bottom: -5 }
});
