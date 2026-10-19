import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY='access_token';
const PROFILE_KEY='temukampus_profile';
const PREF_KEY='temukampus_preferences';

// Week 3 & 5: token sensitif hanya disimpan melalui SecureStore.
export async function saveSession(token,user) {
  if (!token || !user) throw new Error('Token atau pengguna tidak valid.');
  await SecureStore.setItemAsync(TOKEN_KEY,token);
  await AsyncStorage.setItem(PROFILE_KEY,JSON.stringify(user));
}
export const getToken=()=>SecureStore.getItemAsync(TOKEN_KEY);
export async function clearSession(){
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(PROFILE_KEY);
}
export async function savePreference(preference){
  await AsyncStorage.setItem(PREF_KEY,JSON.stringify(preference));
}
export async function getPreference(){
  const result=await AsyncStorage.getItem(PREF_KEY);
  return result?JSON.parse(result):{compactMode:false};
}
