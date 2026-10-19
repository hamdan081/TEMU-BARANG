# Week 5 Task 02 — Attach Token to API Request

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 2):** Firman (`frmaannn` / `firmanvirdauz@gmail.com`)  
**Tanggung Jawab:** React Native Developer, REST API Security Developer, dan Git Specialist  
**Fokus:** Mengambil access token JWT dari Expo SecureStore, menyematkannya ke header HTTP menggunakan skema `Authorization: Bearer <access_token>`, mengakses protected REST API endpoint (`GET /barang`), memvalidasi respons status HTTP (401 Unauthorized & 403 Forbidden), serta mapping data ke Data Model Barang tanpa membocorkan token.

---

## 1. Implementasi Pengambilan Token: `getToken()`

Access token **tidak pernah disimpan di AsyncStorage** atau di-hardcode dalam kode sumber. Token diambil secara asinkron dari hardware secure storage perangkat menggunakan `expo-secure-store`.

Implementasi pada [`storage/session.js`](file:///c:/Pem.%20Mobile/Tugas/TemuKampus_Reaudit_Final/TemuKampus_Reaudit_Final/storage/session.js):

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';

// Mengambil token JWT terenkripsi langsung dari Expo SecureStore
export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
```

---

## 2. Helper Pengiriman Request Terlindungi: `authenticatedFetch()`

Pada [`services/api.js`](file:///c:/Pem.%20Mobile/Tugas/TemuKampus_Reaudit_Final/TemuKampus_Reaudit_Final/services/api.js), fungsi `authenticatedFetch()` bertindak sebagai wrapper resmi untuk memanggil endpoint terlindungi (*protected endpoints*):

```javascript
/**
 * Week 5 Task 02: Helper authenticatedFetch() untuk request ke protected REST API endpoint.
 * Mengambil token dari SecureStore via getToken() dan menyematkannya ke header Authorization: Bearer <token>.
 */
export async function authenticatedFetch(path, options = {}) {
  return request(path, { ...options, authenticated: true });
}
```

Alur penyematan token dan penanganan status HTTP di dalam fungsi `request()`:

```javascript
export async function request(path, { method = 'GET', body, authenticated = false } = {}) {
  if (!API_BASE_URL) throw new ApiError('Alamat API belum diatur. Isi EXPO_PUBLIC_API_BASE_URL pada file .env.');
  const headers = { 'Accept': 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  // 1. Ambil token dari SecureStore jika endpoint memerlukan autentikasi
  if (authenticated) {
    const token = await getToken();
    if (!token) throw new ApiError('Sesi tidak tersedia. Silakan masuk kembali.', 401);
    
    // 2. Format header Bearer Token standar RFC 6750
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);

    // 3. Penanganan status HTTP 401 Unauthorized dan 403 Forbidden
    if (!response.ok) {
      const fallback = response.status === 401 
        ? 'Sesi tidak valid atau sudah berakhir.' 
        : response.status === 403 
        ? 'Akses ditolak.' 
        : `API gagal (HTTP ${response.status}).`;
      throw new ApiError(payload?.message || fallback, response.status);
    }
    return payload;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') throw new ApiError('Koneksi API terlalu lama. Periksa jaringan.');
    throw new ApiError('Tidak dapat terhubung ke API. Periksa alamat IP server dan Wi-Fi.');
  } finally {
    clearTimeout(timer);
  }
}
```

---

## 3. Spesifikasi Protected Endpoints & Authorization Header

### Format Authorization Header (Disamarkan)
```http
GET /barang HTTP/1.1
Host: 192.168.1.45:4000
Accept: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImp0aSI6Ijc4ZTI...[TOKEN_DISAMARKAN]...9jMW
```

### Tabel Endpoint Terlindungi pada Aplikasi

| Method | Endpoint | Authorization | Fungsi & Validasi Server |
|---|---|---|---|
| `GET` | `/barang` | `Bearer <token>` | **Ambil daftar barang:** server memverifikasi signature JWT, kedaluwarsa (`exp`), dan revocation (`jti`). |
| `GET` | `/barang/:id` | `Bearer <token>` | Detail barang lengkap (ciri rahasia tidak dikembalikan). |
| `POST` | `/barang` | `Bearer <token>` | Lapor barang baru: otomatis mencatat `ownerId` dari `sub` token JWT. |
| `GET` | `/me` | `Bearer <token>` | Verifikasi identitas dan masa berlaku token aktif. |
| `PATCH` | `/barang/:id/status` | `Bearer <token>` | Update status: server memvalidasi `ownerId === auth.user.id` (HTTP 403 jika bukan pemilik). |

---

## 4. Contoh Response API

### A. Token Valid (HTTP 200 OK)
```json
{
  "data": [
    {
      "id": 4,
      "nama": "Kartu Mahasiswa",
      "kategori": "Dokumen",
      "deskripsi": "Kartu mahasiswa ditemukan di dekat ruang kelas.",
      "lokasi": "Gedung B",
      "tanggal": "2026-10-15",
      "image": "",
      "status": "Ditemukan",
      "pelapor": "Tim Kampus",
      "ownerId": 0,
      "verificationStatus": "Belum diverifikasi"
    },
    {
      "id": 3,
      "nama": "Laptop ASUS",
      "kategori": "Elektronik",
      "deskripsi": "Laptop warna abu-abu ditemukan terakhir di perpustakaan.",
      "lokasi": "Perpustakaan",
      "tanggal": "2026-10-14",
      "image": "",
      "status": "Hilang",
      "pelapor": "Tim Kampus",
      "ownerId": 0,
      "verificationStatus": "Belum diverifikasi"
    }
  ]
}
```

### B. Token Tidak Ada / Tidak Valid (HTTP 401 Unauthorized)
```json
{
  "message": "Sesi tidak valid atau sudah berakhir. Silakan login."
}
```

### C. Akses Terlarang / Bukan Pemilik (HTTP 403 Forbidden)
```json
{
  "message": "Hanya pembuat laporan yang dapat memperbarui status."
}
```

---

## 5. Integrasi `fetchBarang()` & Mapping ke Data Model Barang

Fungsi `fetchBarang()` memanggil `authenticatedFetch('/barang')` dan memetakan setiap objek JSON menggunakan mapper DTO `mapBarang()` dari [`models/Barang.js`](file:///c:/Pem.%20Mobile/Tugas/TemuKampus_Reaudit_Final/TemuKampus_Reaudit_Final/models/Barang.js):

```javascript
export const fetchBarang = async () => {
  const response = await authenticatedFetch('/barang');
  if (!Array.isArray(response.data)) throw new ApiError('Format data API tidak sesuai.');
  return response.data.map(mapBarang);
};
```

Pada UI ([`App.js`](file:///c:/Pem.%20Mobile/Tugas/TemuKampus_Reaudit_Final/TemuKampus_Reaudit_Final/App.js)), saat pengguna berhasil login atau me-refresh daftar:
- Fungsi `refreshItems()` mengeksekusi `fetchBarang()`.
- Jika menerima HTTP 401, error guard `handleUnauthorized()` otomatis membersihkan session di SecureStore dan mengarahkan pengguna kembali ke layar Login.
- Data yang diterima berhasil di-render ke dalam `FlatList` di layar Daftar Barang.

---

## 6. Prinsip Keamanan & Praktik Terbaik yang Diterapkan

1. **No Hard-coded Tokens:** Token tidak pernah ditulis manual dalam kode sumber.
2. **No Token Leakage:** Token tidak pernah dicetak melalui `console.log()` atau ditampilkan ke antarmuka pengguna (UI).
3. **Restricted Domain:** Header Authorization hanya dikirim ke `EXPO_PUBLIC_API_BASE_URL` yang terkonfigurasi.
4. **Hardware-backed Storage:** Menggunakan `SecureStore` (iOS Keychain / Android Keystore), bukan `AsyncStorage`.
5. **Sanitasi Data:** Field sensitif seperti `verificationSecret` disaring oleh backend dan tidak pernah dikirimkan ke client.

---

## 7. Hasil Pengujian Otomatis (`server/server.test.js`)

Suite pengujian otomatis dijalankan menggunakan built-in Node.js test runner:
```bash
node --test server/server.test.js
```

### Log Output Pengujian:
```text
✔ Week 4 REST API + Week 5 token authentication, protected route, logout (440.21ms)
✔ Week 5 Task 01 - Token Authentication (Login API, Credential Validation, and Real JWT Access Token) (145.94ms)
✔ Week 5 Task 02 - Protected API Request (Authorization Bearer Token, 401, 403, and GET /barang) (175.42ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 957.71ms
```

### Rincian Skenario Uji Task 02:
| # | Skenario Pengujian | Ekspektasi | Hasil |
|---|---|---|---|
| 1 | `GET /barang` tanpa Authorization header | HTTP 401 Unauthorized | ✅ PASS |
| 2 | `GET /barang` dengan Authorization non-Bearer (misal `Basic`) | HTTP 401 Unauthorized | ✅ PASS |
| 3 | `GET /barang` dengan token palsu / acak | HTTP 401 Unauthorized | ✅ PASS |
| 4 | `GET /barang` dengan `Authorization: Bearer <valid_token>` | HTTP 200 OK + Data Array Barang | ✅ PASS |
| 5 | Keamanan data barang (verifikasi `verificationSecret` tidak bocor) | `verificationSecret === undefined` | ✅ PASS |
| 6 | `GET /me` dengan valid token | HTTP 200 OK + User Info | ✅ PASS |
| 7 | `PATCH /barang/:id/status` oleh akun non-pemilik laporan | HTTP 403 Forbidden | ✅ PASS |

---

## 8. Batas Pengerjaan & Handover

- **Tugas yang diselesaikan:** Week 5 Task 02 — Attach Token to API Request.
- **Tugas berikutnya:** Week 5 Task 03 — Handle Session & Logout (Session restoration saat app dibuka, logout online revokasi token di backend dan penghapusan token di SecureStore).
