import { SafeAreaView, ScrollView, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';

import ActionMenu from './components/ActionMenu';
import BottomNav from './components/BottomNav';
import CategoryList from './components/CategoryList';
import Header from './components/Header';
import LatestItems from './components/LatestItems';
import SearchBar from './components/SearchBar';

export default function App() {
  const { width } = useWindowDimensions();
  const isTabletOrLandscape = width >= 768;
  const contentMaxWidth = isTabletOrLandscape ? 800 : '100%';
  const screenPadding = isTabletOrLandscape ? 40 : 20;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screenPadding }]}>
        <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }}>
          <SearchBar />
          <ActionMenu />
          <CategoryList />
          <LatestItems />
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { paddingBottom: 100, paddingTop: 10 },
});
