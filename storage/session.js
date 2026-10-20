import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const PROFILE_KEY = 'temukampus_profile';
const PREF_KEY = 'temukampus_preferences';

/**
 * Week 5 Task 01 & Task 03:
 * Token sensitif (access_token & refresh_token) HANYA disimpan melalui Expo SecureStore.
 * AsyncStorage DILARANG untuk menyimpan token, hanya digunakan untuk profil & preferensi UI.
 */
export async function saveSession(token, user, refreshToken = null) {
  if (!token || !user) throw new Error('Token atau pengguna tidak valid.');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
}

export async function saveTokens(accessToken, refreshToken = null) {
  if (accessToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
  await AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
}

export async function hasToken() {
  const token = await getToken();
  return Boolean(token);
}

export async function savePreference(preference) {
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify(preference));
}

export async function getPreference() {
  const result = await AsyncStorage.getItem(PREF_KEY);
  return result ? JSON.parse(result) : { compactMode: false };
}
