# Week 5 Task 03 — Refresh Token & Protect the Session (Session Management)

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Tanggung Jawab:** Anggota Ketiga (Senior React Native Developer, Node.js Backend Developer, JWT Authentication Specialist, dan Git Specialist)  
**Fokus Utama:** Mengimplementasikan siklus hidup sesi lengkap dengan **Refresh Token**, pembaruan Access Token otomatis (*token rotation*), proteksi endpoint REST API, validasi sesi online saat boot, serta mekanisme **Logout & Pencabutan Token (Token Revocation)** di server dan penghapusan token lokal pada Expo SecureStore.

---

## 1. Arsitektur Token: Access Token vs Refresh Token

Aplikasi TemuKampus menerapkan arsitektur autentikasi ganda (*dual-token pattern*) berbasis standar kriptografi industri untuk mengamankan data mahasiswa:

| Parameter | Access Token | Refresh Token |
|---|---|---|
| **Fungsi Utama** | Mengakses protected REST API (`/barang`, `/me`, `/upload`, dll.) | Meminta *access token* baru ke server tanpa meminta kredensial login ulang |
| **Masa Berlaku (`exp`)** | Singkat (1 Jam / 3.600 detik) | Panjang (7 Hari / 604.800 detik) |
| **Penyimpanan di Perangkat** | Hardware Secure Keystore via `Expo SecureStore` | Hardware Secure Keystore via `Expo SecureStore` |
| **Header HTTP** | `Authorization: Bearer <access_token>` | Request Body JSON: `{ "refresh_token": "..." }` |
| **Payload Kriptografi** | `{ sub, type: 'access', jti, iat, exp }` | `{ sub, type: 'refresh', jti, iat, exp }` |
| **Tipe Validasi Server** | Diterima hanya di protected API; ditolak di endpoint `/auth/refresh` | Diterima hanya di `/auth/refresh` & `/auth/logout`; ditolak sebagai Bearer API |
| **Mekanisme Rotasi** | Diterbitkan ulang setiap kali refresh token diproses | Dirotasi (*Token Rotation*): token lama langsung dicabut dan diganti yang baru |

> [!IMPORTANT]
> **Larangan Penyimpanan Token di AsyncStorage:**
> Sesuai standar keamanan mobile app, token sensitif (`access_token` dan `refresh_token`) **hanya disimpan pada Expo SecureStore** (iOS Keychain / Android Keystore berkunci AES-256). `AsyncStorage` dilarang untuk menyimpan token JWT, dan hanya digunakan untuk data preferensi tampilan UI non-sensitif (`temukampus_preferences`) dan profil cache (`temukampus_profile`).

---

## 2. Klarifikasi & Penyesuaian Terhadap Catatan Tambahan Dosen

### A. Catatan Dosen
1. Ketika Login berhasil, aplikasi mendapatkan JWT Token.
2. Token digunakan untuk mengakses endpoint aplikasi.
3. Token di-refresh ketika Logout.

### B. Analisis Teknis & Prinsip Keamanan
Secara kaidah keamanan perangkat lunak (*RFC 6749 OAuth 2.0 & OWASP Session Management Guidelines*):
- **Pembaruan Access Token (Refresh Token):** Berfungsi untuk mempertahankan sesi pengguna yang **masih aktif** ketika masa berlaku access token yang singkat telah kedaluwarsa, tanpa mengganggu pengalaman pengguna (*silent re-authentication*).
- **Proses Logout:** Bertujuan untuk **mengakhiri sesi secara definitif**. Jika Logout memperbarui token menjadi token aktif baru yang tetap valid, hal tersebut akan menjadi celah keamanan (*security flaw*) karena sesi tidak benar-benar diakhiri.

### C. Solusi & Skenario Demonstrasi Terpadu
Untuk memenuhi kebutuhan pengujian dosen sekaligus menjaga kepatuhan standar keamanan:
1. **Fitur Simulasi Refresh Token Manual:** Disediakan tombol **"Simulasi Refresh Token"** pada halaman Profil. Tombol ini mengeksekusi `refreshAccessToken()`, membuktikan kepada dosen bahwa:
   - Server memvalidasi refresh token dari SecureStore.
   - Server melakukan *Token Rotation* (menerbitkan access token baru dan refresh token baru, serta mencabut jti refresh token lama).
   - Pasangan token baru tersimpan aman di Expo SecureStore.
   - Protected API (`GET /barang`) dapat langsung diakses menggunakan access token baru tersebut.
2. **Proses Logout & Pencabutan Sesi Definitif:** Ketika pengguna menekan tombol **"Keluar (Logout)"**:
   - Client mengirimkan access token dan refresh token ke `POST /auth/logout`.
   - Backend memasukkan `jti` unik dari **kedua token** ke dalam daftar `revokedJtis` server.
   - Client menghapus kedua token dari Expo SecureStore dan membersihkan state autentikasi di memori.
   - Pengguna diarahkan ke layar Login dan tombol navigasi Back tidak dapat membuka halaman Home kembali.
   - Setiap upaya penggunaan kembali access token maupun refresh token yang telah dicabut akan **ditolak dengan HTTP 401 Unauthorized**.

---

## 3. Implementasi Backend (`server/server.js`)

### A. Endpoint Pembaruan Token: `POST /auth/refresh`
Endpoint menerima refresh token yang masih aktif, memvalidasi tanda tangan HMAC-SHA256, memeriksa masa berlaku dan status pencabutan, mencabut refresh token lama, lalu menerbitkan pasangan token baru:

```javascript
// Week 5 Task 03: Endpoint POST /auth/refresh untuk memperbarui access token via refresh token & token rotation
if (req.method === 'POST' && url.pathname === '/auth/refresh') {
  const rToken = typeof body.refresh_token === 'string' ? body.refresh_token.trim() : '';
  if (!rToken) return send(400, { message: 'Refresh token wajib diisi.' });

  // Validasi tanda tangan, tipe token ('refresh'), exp, dan revocation list
  const valid = validateToken(rToken, 'refresh');
  if (!valid) return send(401, { message: 'Refresh token tidak valid, kedaluwarsa, atau telah dicabut.' });

  // Token rotation: cabut jti refresh token yang lama agar tidak dapat dipakai ulang
  db.revokedJtis.push(valid.tokenData.jti);

  // Terbitkan pasangan access token baru (1 jam) dan refresh token baru (7 hari)
  const nowSec = Math.floor(Date.now() / 1000);
  const newAccessToken = sign({ sub: valid.user.id, type: 'access', jti: crypto.randomUUID(), iat: nowSec, exp: nowSec + 3600 });
  const newRefreshToken = sign({ sub: valid.user.id, type: 'refresh', jti: crypto.randomUUID(), iat: nowSec, exp: nowSec + 7 * 86400 });
  save();

  return send(200, {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
    user: publicUser(valid.user)
  });
}
```

### B. Endpoint Logout & Pencabutan Token: `POST /auth/logout`
Endpoint ditempatkan sebelum barikade rute terlindungi agar mampu mencabut token dan refresh token bahkan ketika access token telah mencapai batas kedaluwarsanya:

```javascript
// Week 5 Task 03: Endpoint POST /auth/logout - mencabut jti access token & refresh token pada server
if (req.method === 'POST' && url.pathname === '/auth/logout') {
  const authorization = req.headers.authorization || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  let revokedCount = 0;

  if (bearer) {
    const decoded = decodeToken(bearer);
    if (decoded && decoded.jti) {
      if (!db.revokedJtis.includes(decoded.jti)) db.revokedJtis.push(decoded.jti);
      revokedCount++;
    }
  }
  if (body && typeof body.refresh_token === 'string' && body.refresh_token.trim()) {
    const decodedRefresh = decodeToken(body.refresh_token.trim());
    if (decodedRefresh && decodedRefresh.jti) {
      if (!db.revokedJtis.includes(decodedRefresh.jti)) db.revokedJtis.push(decodedRefresh.jti);
      revokedCount++;
    }
  }
  if (revokedCount === 0) {
    return send(401, { message: 'Sesi tidak valid atau sudah berakhir. Silakan login.' });
  }
  save();
  return send(200, { message: 'Logout berhasil. Sesi dan token telah dicabut.' });
}
```

### C. Pemisahan Tipe Token & Pencegahan Penyalahgunaan (*Type Enforcement*)
Server menerapkan helper `decodeToken()` dan `validateToken()` yang memvalidasi integritas HMAC-SHA256 dan memeriksa payload `type`:
- Rute Protected (`GET /barang`, `GET /me`, `POST /barang`): Memeriksa `expectedType === 'access'`. Jika client mengirimkan refresh token di header Bearer, request ditolak dengan **HTTP 401**.
- Rute Refresh (`POST /auth/refresh`): Memeriksa `expectedType === 'refresh'`. Jika client mengirimkan access token di body JSON, request ditolak dengan **HTTP 401**.

---

## 4. Implementasi Penyimpanan Sesi (`storage/session.js`)

Modul `storage/session.js` mengelola persistensi token ke hardware SecureStore:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const PROFILE_KEY = 'temukampus_profile';
const PREF_KEY = 'temukampus_preferences';

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
```

---

## 5. Integrasi API & Auto-Refresh Idempotent (`services/api.js`)

### A. Fungsi `refreshAccessToken()`
Dilengkapi dengan *promise concurrency lock* (`refreshPromise`) untuk mencegah kondisi balapan (*race condition*) ketika beberapa panggilan API memicu refresh secara serentak:

```javascript
let refreshPromise = null;

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw new ApiError('Sesi berakhir. Refresh token tidak ditemukan.', 401);
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        await clearSession().catch(() => {});
        throw new ApiError(payload?.message || 'Sesi telah berakhir. Silakan masuk kembali.', 401);
      }

      if (!payload?.access_token) {
        await clearSession().catch(() => {});
        throw new ApiError('Gagal mendapatkan access token baru dari server.', 401);
      }

      // Simpan access token baru & refresh token hasil rotasi ke SecureStore
      await saveTokens(payload.access_token, payload.refresh_token);
      return payload.access_token;
    } catch (err) {
      if (err.status === 401) {
        await clearSession().catch(() => {});
      }
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
```

### B. Auto-Retry pada Request Idempotent (`request`)
Ketika endpoint membalas `401 Unauthorized` pada request yang terautentikasi:
1. Memastikan request belum pernah di-retry (`!_retry`) untuk **mencegah loop tak hingga (*infinite loop*)**.
2. Hanya melakukan auto-retry pada method idempotent (`GET`), sehingga request pelaporan barang (`POST /barang`) tidak pernah terduplikasi secara tidak sengaja.
3. Memperbarui token melalui `refreshAccessToken()`, lalu mengulang request GET dengan `_retry: true`.

```javascript
// Week 5 Task 03: Jika 401 Unauthorized dan request belum pernah di-retry
if (response.status === 401 && authenticated && !_retry && path !== '/auth/login' && path !== '/auth/refresh' && path !== '/auth/logout') {
  if (method === 'GET') {
    clearTimeout(timer);
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return request(path, { method, body, authenticated: true, _retry: true });
      }
    } catch (refreshErr) {
      throw refreshErr instanceof ApiError ? refreshErr : new ApiError('Sesi kedaluwarsa. Silakan login kembali.', 401);
    }
  }
}
```

---

## 6. Alur Sesi & Proteksi Navigasi (`App.js`)

1. **Booting / Pemulihan Sesi (`restoreSession`):**
   - Saat aplikasi dibuka, aplikasi membaca token dari SecureStore dan melakukan validasi online ke endpoint `GET /me`.
   - Jika server membalas 200, sesi dipulihkan (`setAuthUser`, masuk ke `home`).
   - Jika token kedaluwarsa atau server menolak (401), session dibersihkan dan layar diarahkan ke `login`.
2. **Logout Sempurna (`logout`):**
   - Mengirim request `logoutAPI()` yang mencakup token dan refresh token untuk dicabut pada server.
   - Mengeksekusi `clearSession()` pada `Expo SecureStore`.
   - Mengosongkan data in-memory: `setAuthUser(null)`, `setItems([])`, `setSelected(null)`.
   - Mengubah `authenticated` menjadi `false`.
   - Komponen Beranda dan Daftar Barang di-*unmount* secara menyeluruh, sehingga penekanan tombol Back pada perangkat tidak dapat membuka kembali halaman terlindungi.

---

## 7. Hasil Pengujian Lengkap (TEST 01 s.d. TEST 10)

Pengujian otomatis dijalankan menggunakan test runner Node.js (`server/server.test.js`) dan uji fungsional client:

```bash
node --test server/server.test.js
```

### Output Eksekusi Pengujian:
```text
[UPLOAD MULTIPART ERR] Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.
[UPLOAD MULTIPART OK] 1792498307494-e4525da45b3d3840.jpg (10 bytes)
✔ Week 4 REST API + Week 5 token authentication, protected route, logout (545.0194ms)
✔ Week 5 Task 01 - Token Authentication (Login API, Credential Validation, and Real JWT Access Token) (182.4885ms)
✔ Week 5 Task 02 - Protected API Request (Authorization Bearer Token, 401, 403, and GET /barang) (262.9977ms)
✔ Week 5 Task 03 - Refresh Token & Session Management (Token Rotation, Expiration, Protected API, and Logout Revocation) (386.9121ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1507.6866
```

### Tabel Rincian Status Pengujian:

| ID Uji | Skenario Pengujian | Ekspektasi | Hasil Pengujian | Status |
|---|---|---|---|:---:|
| **TEST 01** | Login berhasil dan mendapatkan JWT | Mengembalikan `access_token` (1 jam) & `refresh_token` (7 hari) bertipe Bearer | Mengembalikan payload lengkap dengan 2 token valid | **PASS** |
| **TEST 02** | Access token digunakan mengakses protected API | `GET /barang` & `GET /me` dengan Bearer token mengembalikan HTTP 200 | Data barang berhasil diambil dan identitas pengguna terverifikasi | **PASS** |
| **TEST 03** | Access token expired ditolak | `GET /barang` dengan access token bertanggal kedaluwarsa mengembalikan HTTP 401 | Server menolak dengan pesan sesi kedaluwarsa | **PASS** |
| **TEST 04** | Refresh berhasil menghasilkan access token baru | `POST /auth/refresh` mengembalikan access token baru dan refresh token rotasi baru | Token baru berbeda dari token lama, jti baru di-generate | **PASS** |
| **TEST 05** | Protected API dapat diakses dengan token baru | `GET /barang` dengan access token hasil refresh mengembalikan HTTP 200 | Data barang berhasil diambil tanpa login ulang | **PASS** |
| **TEST 06** | Refresh token salah atau expired ditolak | Refresh token kosong (400), palsu (401), atau exp telah lewat (401) ditolak | Server memvalidasi tanda tangan dan waktu exp secara ketat | **PASS** |
| **TEST 07** | Logout menghapus session dan token lokal | `clearSession()` menghapus token dari SecureStore, preferensi UI tetap tersimpan | `access_token` & `refresh_token` terhapus dari SecureStore | **PASS** |
| **TEST 08** | Token yang dicabut tidak dapat digunakan kembali | Access token & refresh token lama yang sudah dicabut ditolak oleh server (401) | `revokedJtis` server memblokir akses ulang kedua token | **PASS** |
| **TEST 09** | Setelah Logout, pengguna kembali ke Login | UI me-reset auth state (`authenticated = false`) dan menampilkan layar login | Layar utama di-unmount, tombol Back tidak membuka Home | **PASS** |
| **TEST 10** | Restart aplikasi tidak mengaktifkan kembali session yang sudah Logout | App mount membaca SecureStore kosong, langsung masuk ke login screen | Validasi `restoreSession` mengonfirmasi status unauthenticated | **PASS** |

---

## 8. Ringkasan File yang Dimodifikasi

1. [`server/server.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/server/server.js):
   - Menambahkan penerbitan `refresh_token` (7 hari) bertipe `refresh` pada `POST /auth/login`.
   - Mengimplementasikan endpoint `POST /auth/refresh` dengan token rotation dan revocation jti.
   - Mengimplementasikan endpoint `POST /auth/logout` yang mencabut kedua token di server.
   - Menambahkan helper `decodeToken()` dan membedakan validasi tipe token `access` vs `refresh`.
2. [`server/server.test.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/server/server.test.js):
   - Menambahkan test suite komprehensif untuk Week 5 Task 03 mencakup siklus refresh token, token rotation, type enforcement, expired token, dan logout revocation.
3. [`services/api.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/services/api.js):
   - Menambahkan fungsi `refreshAccessToken()` dengan concurrency lock.
   - Menambahkan auto-retry pada error 401 untuk request idempotent (`GET`).
   - Memperbarui `logoutAPI()` agar mengirimkan refresh token ke backend.
4. [`storage/session.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/storage/session.js):
   - Menambahkan penyimpanan `refresh_token` di hardware SecureStore melalui `saveSession` & `saveTokens`.
   - Menambahkan helper `getRefreshToken()` dan memastikan `clearSession()` menghapus kedua token dari SecureStore.
5. [`App.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/App.js):
   - Menambahkan tombol interaktif "Simulasi Refresh Token" di halaman Profil untuk demonstrasi pengujian dosen.
   - Mengintegrasikan penyimpanan refresh token saat login dan pembersihan total saat logout.
6. [`docs/week5/task3.md`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/docs/week5/task3.md):
   - Dokumentasi lengkap Week 5 Task 03 mencakup arsitektur, kode, penyesuaian catatan dosen, dan bukti pengujian.
