import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  useWindowDimensions, 
  View, 
  Text, 
  TextInput, 
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import ActionMenu from './components/ActionMenu';
import BottomNav from './components/BottomNav';
import CategoryList from './components/CategoryList';
import Header from './components/Header';
import LatestItems from './components/LatestItems';
import SearchBar from './components/SearchBar';

// --- KEYS ---
const USER_PROFILE_KEY = 'TEMU_KAMPUS_USER_PROFILE';
const USER_CREDENTIAL_KEY = 'TEMU_KAMPUS_USER_CREDENTIAL';
const AUTH_TOKEN_KEY = 'TEMU_KAMPUS_AUTH_TOKEN';

export default function App() {
  const { width } = useWindowDimensions();
  const isTabletOrLandscape = width >= 768;
  const contentMaxWidth = isTabletOrLandscape ? 800 : '100%';
  const screenPadding = isTabletOrLandscape ? 40 : 20;

  // Authentication State
  const [currentScreen, setCurrentScreen] = useState('login');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Form States (Register)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState('');

  // Form States (Login)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // ==========================================
  // STORAGE FUNCTIONS
  // ==========================================

  const saveNormalData = async (key, value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (e) {
      Alert.alert("Error", "Terjadi kesalahan. Silakan coba kembali.");
    }
  };

  const getNormalData = async (key) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      Alert.alert("Error", "Terjadi kesalahan. Silakan coba kembali.");
      return null;
    }
  };

  const saveSecureData = async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      Alert.alert("Error", "Terjadi kesalahan. Silakan coba kembali.");
    }
  };

  const getSecureData = async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return null;
    }
  };

  // ==========================================
  // AUTHENTICATION LOGIC
  // ==========================================

  const checkAuthentication = async () => {
    try {
      const token = await getSecureData(AUTH_TOKEN_KEY);
      if (token) {
        const profile = await getNormalData(USER_PROFILE_KEY);
        if (profile) {
          setLoggedInUser(profile);
          setCurrentScreen('home');
        } else {
          setCurrentScreen('login');
        }
      } else {
        setCurrentScreen('login');
      }
    } catch (error) {
      setCurrentScreen('login');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  const handleRegister = async () => {
    setRegError('');
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegError('Semua field wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Konfirmasi password tidak cocok.');
      return;
    }

    const userProfile = { name: regName.trim(), email: regEmail.trim() };
    await saveNormalData(USER_PROFILE_KEY, userProfile);
    await saveSecureData(USER_CREDENTIAL_KEY, regPassword);

    Alert.alert('Berhasil', 'Akun berhasil dibuat. Silakan login.');
    
    setRegName(''); setRegEmail(''); setRegPassword(''); setRegConfirmPassword('');
    setCurrentScreen('login');
  };

  const login = async () => {
    setLoginError('');
    
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Email atau username wajib diisi.');
      return;
    }

    try {
      const savedProfile = await getNormalData(USER_PROFILE_KEY);
      const savedPassword = await getSecureData(USER_CREDENTIAL_KEY);

      if (
        savedProfile && 
        savedProfile.email === loginEmail.trim() && 
        savedPassword === loginPassword
      ) {
        const fakeSessionToken = `SESSION_${new Date().getTime()}`;
        await saveSecureData(AUTH_TOKEN_KEY, fakeSessionToken);
        setLoggedInUser(savedProfile);
        setCurrentScreen('home');
        
        setLoginEmail(''); setLoginPassword('');
      } else {
        setLoginError('Email/username atau password salah.');
      }
    } catch (e) {
      setLoginError('Terjadi kesalahan. Silakan coba kembali.');
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      setLoggedInUser(null);
      setCurrentScreen('login');
    } catch (e) {
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba kembali.');
    }
  };

  const loadDemoAccount = () => {
    setLoginEmail('budi@kampus.ac.id');
    setLoginPassword('rahasia123');
  };

  // ==========================================
  // RENDERING SCREENS
  // ==========================================

  if (isCheckingAuth) {
    return (
      <SafeAreaView style={[styles.authContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1565C0" />
      </SafeAreaView>
    );
  }

  // --- HALAMAN REGISTER ---
  if (currentScreen === 'register') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={[styles.authForm, { maxWidth: 480, padding: screenPadding }]}>
            
            {/* Top Right Tools Icon */}
            <View style={styles.topRightBtnContainer}>
              <View style={styles.topRightIconBg}>
                <Ionicons name="settings-sharp" size={20} color="#666" />
              </View>
            </View>

            {/* Logo & Title */}
            <View style={styles.headerSection}>
              <View style={styles.logoCircle}>
                <Feather name="shield" size={32} color="#1565C0" />
              </View>
              <Text style={styles.appTitle}>TEMUKAMPUS</Text>
              <Text style={styles.subtitle}>Buat Akun Baru & Amankan Data Anda</Text>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Feather name="lock" size={18} color="#1565C0" style={{marginTop: 2}} />
              <Text style={styles.infoText}>
                Kredensial disimpan terenkripsi via Expo Secure Storage (Hardware Keystore/Keychain).
              </Text>
            </View>

            {!!regError && <Text style={styles.errorText} accessibilityRole="alert">{regError}</Text>}

            {/* Input Nama */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputWithIcon}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor="#999"
                  value={regName}
                  onChangeText={setRegName}
                />
              </View>
            </View>

            {/* Input Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email atau Username</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputWithIcon}
                  placeholder="mahasiswa@kampus.ac.id atau username"
                  placeholderTextColor="#999"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password / PIN</Text>
              <View style={styles.inputWrapper}>
                <Feather name="key" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputWithIcon}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor="#999"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry={!showRegPassword}
                />
                <Pressable onPress={() => setShowRegPassword(!showRegPassword)} style={styles.eyeBtn}>
                  <Feather name={showRegPassword ? "eye-off" : "eye"} size={20} color="#888" />
                </Pressable>
              </View>
            </View>

            {/* Input Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Konfirmasi Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputWithIcon}
                  placeholder="Ulangi password"
                  placeholderTextColor="#999"
                  value={regConfirmPassword}
                  onChangeText={setRegConfirmPassword}
                  secureTextEntry={!showRegConfirmPassword}
                />
                <Pressable onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)} style={styles.eyeBtn}>
                  <Feather name={showRegConfirmPassword ? "eye-off" : "eye"} size={20} color="#888" />
                </Pressable>
              </View>
            </View>

            {/* Button */}
            <Pressable style={styles.primaryBtn} onPress={handleRegister}>
              <Text style={styles.primaryBtnText}>Daftar Sekarang</Text>
            </Pressable>

            {/* Bottom Link */}
            <View style={styles.bottomLinkContainer}>
              <Text style={styles.bottomText}>Sudah punya akun? </Text>
              <Pressable onPress={() => setCurrentScreen('login')}>
                <Text style={styles.bottomLink}>Masuk</Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- HALAMAN LOGIN ---
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={[styles.authForm, { maxWidth: 480, padding: screenPadding }]}>
            
            {/* Top Right Tools Icon */}
            <View style={styles.topRightBtnContainer}>
              <View style={styles.topRightIconBg}>
                <Ionicons name="settings-sharp" size={20} color="#666" />
              </View>
              <Text style={styles.topRightText}>Tools</Text>
            </View>

            {/* Logo & Title */}
            <View style={styles.headerSection}>
              <View style={styles.logoCircle}>
                <Ionicons name="search" size={32} color="#1565C0" />
              </View>
              <Text style={styles.appTitle}>TEMUKAMPUS</Text>
              <Text style={styles.subtitle}>Masuk untuk melanjutkan</Text>
            </View>

            {!!loginError && <Text style={styles.errorText} accessibilityRole="alert">{loginError}</Text>}

            {/* Input Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email atau Username</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputWithIcon}
                  placeholder="user@mail.com"
                  placeholderTextColor="#999"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputWithIcon}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showLoginPassword}
                />
                <Pressable onPress={() => setShowLoginPassword(!showLoginPassword)} style={styles.eyeBtn}>
                  <Feather name={showLoginPassword ? "eye-off" : "eye"} size={20} color="#888" />
                </Pressable>
              </View>
            </View>

            {/* Lupa Password */}
            <Pressable style={styles.forgotBtn} onPress={() => Alert.alert('Info', 'Fitur reset password belum tersedia.')}>
              <Text style={styles.forgotText}>Lupa password?</Text>
            </Pressable>

            {/* Masuk Button */}
            <Pressable style={styles.primaryBtn} onPress={login} accessibilityLabel="Masuk ke akun TemuKampus">
              <Text style={styles.primaryBtnText}>Masuk</Text>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Biometrics Row */}
            <View style={styles.biometricsRow}>
              <Pressable style={styles.bioBtn} onPress={() => Alert.alert("Info", "Biometrik belum diatur.")}>
                <Ionicons name="finger-print-outline" size={24} color="#1565C0" style={{marginBottom: 4}} />
                <Text style={styles.bioText}>Biometrik</Text>
              </Pressable>
              <Pressable style={styles.bioBtn} onPress={() => Alert.alert("Info", "Face ID belum diatur.")}>
                <MaterialCommunityIcons name="face-recognition" size={24} color="#1565C0" style={{marginBottom: 4}} />
                <Text style={styles.bioText}>Face ID</Text>
              </Pressable>
            </View>

            {/* Demo Button */}
            <Pressable style={styles.demoBtn} onPress={loadDemoAccount}>
              <Ionicons name="flash-outline" size={18} color="#555" />
              <Text style={styles.demoText}>Gunakan Akun Demo (1-Klik)</Text>
            </Pressable>

            {/* Bottom Link */}
            <View style={styles.bottomLinkContainer}>
              <Text style={styles.bottomText}>Belum punya akun? </Text>
              <Pressable onPress={() => setCurrentScreen('register')}>
                <Text style={styles.bottomLink}>Daftar sekarang</Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- HALAMAN HOME ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <Header userName={loggedInUser?.name} onLogout={logout} />

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 100, paddingTop: 10 },
  
  // -- New Auth UI Styles matching the uploaded design --
  authContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  authForm: {
    width: '100%',
    backgroundColor: '#FAFAFA',
  },
  
  // Top right icon
  topRightBtnContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  topRightIconBg: {
    backgroundColor: '#E2E8F0',
    borderRadius: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginRight: 6
  },

  // Header section
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0E7FF', // Light blue background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A', // Dark slate
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  // Info Box for Register
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF', // Light blue background
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E3A8A',
    marginLeft: 8,
    lineHeight: 18,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    height: 50,
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  inputWithIcon: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#333',
  },
  eyeBtn: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 13,
    color: '#64748B',
  },

  // Buttons
  primaryBtn: {
    backgroundColor: '#1565C0', // Tema TemuKampus
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#94A3B8',
    fontSize: 13,
  },

  // Biometrics
  biometricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bioBtn: {
    flex: 1,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  bioText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },

  // Demo Button
  demoBtn: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 8,
  },

  // Bottom Links
  bottomLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 14,
    color: '#64748B',
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565C0',
  },

  errorText: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
});
