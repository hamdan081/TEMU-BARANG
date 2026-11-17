# Week 5 Task 01 — Implement Token Authentication

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 1):** Hamdan (`hamdan081` / `hamdanjulfa698@gmail.com`)  
**Tanggung Jawab:** React Native Developer, Authentication Developer, dan Git Specialist  
**Fokus:** Mengimplementasikan proses Login berbasis REST API, validasi kredensial pada server, penerbitan token JWT asli, penyimpanan access token menggunakan Expo SecureStore (terpisah dari AsyncStorage), pembaruan state autentikasi aplikasi, dan proteksi dari kebocoran kredensial.

---

## 1. Spesifikasi Endpoint Login API

- **Method:** `POST`
- **URL Path:** `/auth/login`
- **Akses:** Publik (tanpa header Authorization)
- **Content-Type:** `application/json; charset=utf-8`

### Request Payload (JSON)
```json
{
  "email": "demo@kampus.ac.id",
  "password": "Demo123!"
}
```

### Response Sukses (HTTP 200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImp0aSI6ImE2YTU5YjEyLTIwODktNDQxMy1hNTc5LThjODFmYmZlZDRjOCIsImlhdCI6MTc5MjQyNjYwMCwiZXhwIjoxNzkyNDMwMjAwfQ.SignatureString...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "Mahasiswa Demo",
    "email": "demo@kampus.ac.id"
  }
}
```

### Response Gagal (HTTP 401 Unauthorized / 400 Bad Request)
- **Input Kosong (HTTP 400):**
  ```json
  { "message": "Email dan password wajib diisi." }
  ```
- **Kredensial Salah (HTTP 401):**
  ```json
  { "message": "Email atau password salah." }
  ```
  > **Catatan Keamanan:** Pesan kesalahan bersifat seragam baik jika email tidak terdaftar maupun jika kata sandi salah, untuk mencegah *user enumeration* dan kebocoran kredensial.

---

## 2. Alur Proses POST Login & Kredensial di Server

1. **Pemanggilan API di Client (`services/api.js`):**
   ```javascript
   // Mengirim kredensial via HTTP POST JSON ke server
   export const loginWithAPI = (email, password) => 
     request('/auth/login', { method: 'POST', body: { email, password } });
   ```
2. **Validasi & Verifikasi di Server (`server/server.js`):**
   - Server memeriksa bahwa email dan password terisi.
   - Server mencari akun berdasarkan email terdaftar.
   - Kata sandi diverifikasi menggunakan algoritma hash `scrypt` berkunci salt (`verifyPassword(pass, user.passwordHash)`). Kata sandi asli tidak pernah disimpan dalam bentuk plaintext.
   - Terdapat mekanisme proteksi laju percobaan (*rate limiting* / proteksi *brute force*).

---

## 3. Proses Penerbitan & Karakteristik Access Token (JWT)

Aplikasi **tidak pernah membuat token palsu** di sisi client. Seluruh access token diterbitkan secara kriptografis oleh backend server:
- **Algoritma:** HMAC-SHA256 (`HS256`) ditandatangani menggunakan secret key lokal server.
- **Struktur Token:** Format standar JWT dengan 3 segmen terenkripsi base64url:
  1. **Header:** `{"alg":"HS256","typ":"JWT"}`
  2. **Payload:**
     - `sub`: ID pengguna (`user.id`)
     - `jti`: UUID unik per token untuk mendukung pencabutan (*revocation*) saat logout
     - `iat`: Timestamp waktu penerbitan
     - `exp`: Timestamp kedaluwarsa (1 jam / 3600 detik)
  3. **Signature:** `HMAC-SHA256(header.payload, serverSecret)`

---

## 4. Implementasi Penyimpanan Aman (Expo SecureStore)

Sesuai aturan keamanan data mobile:
- **Access Token:** Disimpan ke hardware secure keystore/keychain melalui `expo-secure-store`.
- **AsyncStorage:** **DILARANG** digunakan untuk token. Hanya digunakan untuk menyimpan data profil non-sensitif (`temukampus_profile`) dan preferensi tampilan UI (`temukampus_preferences`).
- **Kata Sandi:** Tidak pernah disimpan pada penyimpanan perangkat apa pun.

Implementasi pada [`storage/session.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/storage/session.js):
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const PROFILE_KEY = 'temukampus_profile';

// Week 5 Task 01: Token JWT sensitif dari server hanya disimpan melalui Expo SecureStore (bukan AsyncStorage).
export async function saveSession(token, user) {
  if (!token || !user) throw new Error('Token atau pengguna tidak valid.');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
```

---

## 5. Perubahan Authentication State & Navigasi di `App.js`

Implementasi pada fungsi `doLogin` di [`App.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/App.js):

```javascript
// Week 5 Task 01: Token Authentication (POST login via API, simpan access token di SecureStore, update authUser)
const doLogin = async () => {
  if (!authForm.email.trim() || !authForm.password) {
    setError('Email dan password wajib diisi.');
    return;
  }
  setBusy(true);
  setError('');
  setMessage('');
  try {
    // 1. Kirim HTTP POST ke /auth/login
    const result = await loginWithAPI(authForm.email.trim().toLowerCase(), authForm.password);
    if (!result.access_token || !result.user) {
      throw new Error('Server tidak memberikan token dan profil yang valid.');
    }
    
    // 2. Simpan access token ke SecureStore dan profil ke AsyncStorage
    await saveSession(result.access_token, result.user);
    
    // 3. Reset form input
    setAuthForm({ name: '', email: '', password: '', confirm: '' });
    
    // 4. Ubah authentication state (pengguna terautentikasi)
    setAuthUser(result.user);
    
    // 5. Arahkan pengguna ke halaman Home TemuKampus
    setScreen('home');
  } catch (e) {
    setError(e.message || 'Login gagal.');
  } finally {
    setBusy(false);
  }
};
```

Saat `authUser` terisi (state `authenticated = Boolean(authUser)` bernilai `true`):
- Komponen Login disembunyikan.
- Komponen utama TemuKampus (Header, Home / Daftar Barang, Navigasi Bawah) ditampilkan.
- Memanggil `refreshItems()` untuk memuat data barang secara real-time dari API.

---

## 6. Hasil Pengujian Otomatis

Pengujian backend otomatis dijalankan dengan `node --test server/server.test.js`:

```text
✔ Week 4 REST API + Week 5 token authentication, protected route, logout (474.28ms)
✔ Week 5 Task 01 - Token Authentication (Login API, Credential Validation, and Real JWT Access Token) (138.94ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 720.04ms
```

### Skenario Uji yang Terpenuhi:
1. **Login Sukses (Akun Demo):** Mengembalikan HTTP 200, JWT token 3 bagian (header, payload, signature), exp 1 jam, dan profil tanpa bocoran hash password.
2. **Login Gagal (Password Salah):** Mengembalikan HTTP 401 dan pesan aman `"Email atau password salah."`.
3. **Login Gagal (User Tidak Terdaftar):** Mengembalikan HTTP 401 dengan pesan identik.
4. **Login Gagal (Input Kosong):** Mengembalikan HTTP 400 `"Email dan password wajib diisi."`.
5. **Penyimpanan Token:** Token disimpan di SecureStore dan profil disimpan di AsyncStorage.

---

## 7. Batas Pengerjaan & Handover

- **Tugas yang diselesaikan:** Week 5 Task 01 — Implement Token Authentication.
- **Tugas berikutnya:** Week 5 Task 02 — Attach Token to API Request (akan dilanjutkan oleh Orang 2: menyematkan token dari SecureStore ke header `Authorization: Bearer <token>` pada seluruh request API protected).
