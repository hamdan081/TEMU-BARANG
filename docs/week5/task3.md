# Week 5 Task 03 — Protect the Session (Session Management)

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 3):** Fawwaz (`fawwaz` / `icamrz8@gmail.com`)  
**Tanggung Jawab:** Security Developer, Session Management Specialist & Git Specialist  
**Fokus:** Mengamankan dan mengelola siklus hidup sesi (*session lifecycle*) pengguna TemuKampus mulai dari penyimpanan token saat Login, validasi sesi saat aplikasi dibuka kembali, penanganan token kedaluwarsa/invalid, hingga pembersihan token dan data memori saat Logout.

---

## 1. Arsitektur & Mekanisme Penyimpanan Token (SecureStore)

Sesuai standar keamanan mobile app:
- **Token Akses (JWT):** Disimpan secara terisolasi pada hardware keystore/keychain melalui `expo-secure-store` dengan key `'access_token'`. Token tidak pernah disimpan di AsyncStorage biasa untuk mencegah kebocoran data (*data leakage*).
- **Profil Pengguna Non-Sensitif:** Disimpan di `AsyncStorage` dengan key `'temukampus_profile'`.
- **Preferensi Tampilan:** Disimpan di `AsyncStorage` dengan key `'temukampus_preferences'` dan tidak dihapus saat sesi berakhir.
- **Kredensial Kata Sandi:** Tidak pernah disimpan di perangkat.

Implementasi modul [`storage/session.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/storage/session.js):

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const PROFILE_KEY = 'temukampus_profile';
const PREF_KEY = 'temukampus_preferences';

export async function saveSession(token, user) {
  if (!token || !user) throw new Error('Token atau pengguna tidak valid.');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(PROFILE_KEY);
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
```

---

## 2. Fungsi `checkSession()` — Validasi Token Online

Aplikasi **tidak mengasumsikan token pasti valid** hanya karena string token ditemukan di SecureStore. Setiap sesi diverifikasi secara online ke backend endpoint `GET /me`:

```javascript
const checkSession = useCallback(async () => {
  try {
    const token = await getToken();
    if (!token) return null;
    
    // Validasi token langsung ke endpoint backend GET /me
    const profile = await getProfile();
    return profile?.user || null;
  } catch (e) {
    if (e.status === 401) {
      // Token expired atau dicabut server -> hapus sesi lokal
      await clearSession().catch(() => {});
    }
    return null;
  }
}, []);
```

### Logika Penanganan:
1. Jika tidak ada token di SecureStore -> langsung kembalikan `null`.
2. Jika ada token -> kirim HTTP request ke `GET /me` dengan header `Authorization: Bearer <token>`.
3. Jika server membalas HTTP 200 -> kembalikan objek data `user` terverifikasi.
4. Jika server membalas HTTP 401 (token kedaluwarsa atau `jti` telah dicabut) -> otomatis panggil `clearSession()` dan kembalikan `null`.

---

## 3. Fungsi `restoreSession()` — Pemulihan Sesi Saat App Dibuka Ulang

Dijalankan secara otomatis saat komponen aplikasi pertama kali dimuat (*app mount*):

```javascript
const restoreSession = useCallback(async () => {
  try {
    const preferences = await getPreference();
    setCompactMode(Boolean(preferences.compactMode));
    
    const validUser = await checkSession();
    if (validUser) {
      setAuthUser(validUser);
      setScreen('home');
    } else {
      setAuthUser(null);
      setScreen('login');
    }
  } catch (e) {
    await clearSession().catch(() => {});
    setAuthUser(null);
    setScreen('login');
    setError('Tidak dapat memeriksa sesi. Hubungkan kembali ke API dan login.');
  } finally {
    setBooting(false);
  }
}, [checkSession]);

useEffect(() => {
  restoreSession();
}, [restoreSession]);
```

- Selama `booting = true`, aplikasi menampilkan loading spinner `Memeriksa sesi login...`.
- Jika sesi valid -> pengguna langsung masuk ke Beranda (`home`) tanpa perlu login ulang.
- Jika token kedaluwarsa/salah -> pengguna diarahkan ke layar Login (`login`).

---

## 4. Fungsi `logout()` — Pembersihan Sesi Menyeluruh

Dijalankan saat pengguna menekan tombol **"Keluar (Logout)"** pada halaman **Profil**:

```javascript
const logout = async () => {
  setBusy(true);
  setError('');
  let remoteFailed = false;
  
  try {
    // 1. Cabut token pada server (revokasi jti token)
    await logoutAPI();
  } catch (e) {
    remoteFailed = true;
  }
  
  try {
    // 2. Hapus access token dari SecureStore dan profil dari AsyncStorage
    await clearSession();
  } catch (e) {
    setError('Gagal menghapus sesi lokal. Coba kembali.');
    setBusy(false);
    return;
  }
  
  // 3. Bersihkan protected data dan cache dari memory
  setAuthUser(null);
  setItems([]);
  setSelected(null);
  
  // 4. Ubah status dan arahkan ke login (authenticated = false)
  setScreen('login');
  setAuthForm({ name: '', email: '', password: '', confirm: '' });
  setMessage(
    remoteFailed
      ? 'Keluar dari perangkat ini; server tidak terjangkau, token lama akan kedaluwarsa.'
      : 'Kamu berhasil keluar dari akun.'
  );
  setBusy(false);
};
```

---

## 5. Alur Navigasi & Keamanan Pasca-Logout

1. **State `authenticated` Berubah ke `false`:**
   Variabel `authenticated` dihitung melalui `Boolean(authUser)`. Ketika `authUser` di-set ke `null`, `authenticated` bernilai `false`.
2. **Kondisional Rendering Layar:**
   Struktur render di [`App.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/App.js):
   ```jsx
   if (!authenticated) {
     return <AuthScreens ... />;
   }
   return <MainScreens ... />;
   ```
   Layar Beranda, Daftar Barang, dan Detail di-*unmount* sepenuhnya dari pohon komponen. Pengguna **tidak dapat kembali ke Home** hanya dengan tombol Back perangkat.
3. **Penolakan Request Protected di Backend:**
   Ketika `logoutAPI()` dipanggil, server menyimpan `jti` unik token ke dalam daftar `revokedJtis`. Setiap panggilan API protected berikutnya dengan token tersebut (misalnya `GET /barang`) akan ditolak server dengan **HTTP 401 Unauthorized**.

---

## 6. Hasil Pengujian Session

### Skenario Pengujian yang Dijalankan:
| Skenario | Langkah Pengujian | Hasil yang Diharapkan | Status |
|---|---|---|---|
| **1. Login & Simpan Token** | Input kredensial demo `demo@kampus.ac.id` / `Demo123!` | Token tersimpan di SecureStore, navigasi ke Beranda | **PASS** |
| **2. Restore Session Valid** | Buka ulang aplikasi saat token masih aktif | Validasi `GET /me` sukses, langsung masuk ke Beranda | **PASS** |
| **3. Token Expired / Invalid** | Buka aplikasi dengan token palsu atau kedaluwarsa | `GET /me` gagal (401), token dihapus, diarahkan ke Login | **PASS** |
| **4. Tombol Logout di Profil** | Buka tab Profil → klik "Keluar (Logout)" → Konfirmasi | Token dicabut server, SecureStore bersih, navigasi ke Login | **PASS** |
| **5. Anti-Back Pasca-Logout** | Tekan tombol Back setelah logout | Aplikasi tetap berada di layar Login | **PASS** |
| **6. Penolakan Request Bekas** | Request `GET /barang` menggunakan token lama | Backend mengembalikan HTTP 401 Unauthorized | **PASS** |
| **7. Persistensi Data Non-Sesi** | Cek preferensi `compactMode` setelah logout & login ulang | Nilai preferensi di AsyncStorage tetap tersimpan | **PASS** |

### Hasil Test Otomatis Backend:
```bash
npm run test:api
```

```
> ii@1.0.0 test:api
> node --test server/server.test.js

[UPLOAD MULTIPART ERR] Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.
[UPLOAD MULTIPART OK] 1792424606570-3e92b33a6f3ea144.jpg (10 bytes)
✔ Week 4 REST API + Week 5 token authentication, protected route, logout (633ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
*Status: 100% PASS.*
