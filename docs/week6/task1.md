# Week 6 Task 01 — Handle API Error

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 1):** Hamdan (`hamdan081` / `hamdanjulfa698@gmail.com`)  
**Tanggung Jawab:** Senior React Native Developer, Node.js REST API Developer, Software Tester, dan Git Specialist  
**Fokus Utama:** Mengembangkan mekanisme penanganan kesalahan terpadu (*unified error handling*) pada REST API Integration aplikasi TemuKampus untuk menangani kondisi:
1. **HTTP 2xx (Success Response)**
2. **HTTP 4xx (Client Error):** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 429 Too Many Requests
3. **HTTP 5xx (Server Error):** 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
4. **Network Error & Timeout Error:** Gangguan koneksi, server tidak terjangkau, offline, dan timeout

Aplikasi dipastikan **tidak pernah mengalami crash (*unhandled exception*)** saat request gagal dan selalu menyajikan pesan kesalahan berbahasa Indonesia yang jelas, aman, serta tidak membocorkan informasi sensitif server (seperti stack trace, kredensial, atau query database).

---

## 1. Arsitektur Error Handling (`ApiError`)

Pada [`services/api.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/services/api.js), kelas `ApiError` diperluas menjadi model error berstruktur tinggi yang menyediakan klasifikasi boolean dan tipe error:

```javascript
// Week 6 Task 01 — Handle API Error: Struktur ApiError terpadu untuk HTTP 2xx/4xx/5xx dan Network Error
export class ApiError extends Error {
  constructor(message, status = 0, { type, details, isNetworkError, isTimeout } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = Number(status) || 0;

    // Klasifikasi Status & Tipe Error
    this.isNetworkError = Boolean(isNetworkError || status === 0);
    this.isTimeout = Boolean(isTimeout);
    this.isClientError = this.status >= 400 && this.status < 500;
    this.isServerError = this.status >= 500 && this.status < 600;
    this.isUnauthorized = this.status === 401;
    this.isForbidden = this.status === 403;
    this.isNotFound = this.status === 404;
    this.isBadRequest = this.status === 400;

    // Persiapan Task 02 (Retry) & Task 03 (Offline): penanda retryable
    this.isRetryable = this.isNetworkError || this.isTimeout || this.status === 503 || this.status === 504 || this.status === 429;

    this.type = type || (
      this.isTimeout ? 'TIMEOUT_ERROR' :
      this.isNetworkError ? 'NETWORK_ERROR' :
      this.isServerError ? 'SERVER_ERROR' :
      this.isClientError ? 'CLIENT_ERROR' : 'UNKNOWN_ERROR'
    );

    this.details = details || null;
  }
}
```

### Keunggulan Desain:
1. **Dukungan Siap Pakai untuk Anggota Berikutnya:** Flag `isRetryable` dan `isNetworkError` disiapkan untuk memudahkan pengerjaan **Task 02 (Mekanisme Retry)** dan **Task 03 (Offline UI)** tanpa mengubah struktur error lagi.
2. **Type Safety:** Setiap komponen UI dapat dengan mudah memeriksa `if (error.isNetworkError)` atau `if (error.isUnauthorized)` tanpa harus membandingkan string manual.

---

## 2. Pemetaan & Sanitasi Pesan Error (`getErrorMessageForStatus`)

Untuk mencegah kebocoran informasi teknis sensitif (*information leakage*), fungsi [`getErrorMessageForStatus()`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/services/api.js#L38-L77) menyaring pesan teknis internal sebelum dikirimkan ke UI:

```javascript
export function getErrorMessageForStatus(status, serverMessage) {
  if (serverMessage && typeof serverMessage === 'string' && serverMessage.trim().length > 0) {
    // Saring pesan stack trace atau teknis database agar tidak bocor ke UI
    const isTechnical = /at\s+[\w\.]+\s+\(|error:\s+syntax|database|sql|column|table|relation|undefined is not/i.test(serverMessage);
    if (!isTechnical) return serverMessage.trim();
  }

  switch (status) {
    case 400:
      return 'Permintaan tidak valid. Periksa kembali kelengkapan formulir Anda.';
    case 401:
      return 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.';
    case 403:
      return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.';
    case 404:
      return 'Data atau layanan yang diminta tidak ditemukan.';
    case 409:
      return 'Terjadi konflik data. Data sudah terdaftar dalam sistem.';
    case 413:
      return 'Ukuran file atau data terlalu besar.';
    case 422:
      return 'Format data tidak dapat diproses. Periksa kembali isian Anda.';
    case 429:
      return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.';
    case 500:
      return 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.';
    case 502:
      return 'Server gateway bermasalah. Silakan coba sesaat lagi.';
    case 503:
      return 'Layanan server sedang sibuk atau dalam pemeliharaan. Coba lagi nanti.';
    case 504:
      return 'Batas waktu server habis (Gateway Timeout). Coba lagi nanti.';
    default:
      if (status >= 500) {
        return `Terjadi gangguan server (HTTP ${status}). Silakan coba beberapa saat lagi.`;
      }
      return `Permintaan gagal (HTTP ${status}). Silakan coba kembali.`;
  }
}
```

---

## 3. Penanganan HTTP Response pada Fungsi `request()`

Implementasi alur request di [`services/api.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/services/api.js#L140-L221):

```javascript
export async function request(path, { method = 'GET', body, authenticated = false, _retry = false } = {}) {
  if (!API_BASE_URL) throw new ApiError('Alamat API belum diatur. Isi EXPO_PUBLIC_API_BASE_URL pada file .env.', 0, {
    type: 'CLIENT_ERROR',
    isNetworkError: false,
  });

  const headers = { 'Accept': 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated) {
    const token = await getToken();
    if (!token) throw new ApiError('Sesi tidak tersedia. Silakan masuk kembali.', 401);
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

    // 1. Parsing payload secara aman (JSON, text/HTML error page, atau kosong)
    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        try { payload = JSON.parse(text); } catch { payload = null; }
      }
    }

    // 2. Integrasi Refresh Token Week 5: Auto-refresh jika HTTP 401
    if (response.status === 401 && authenticated && !_retry && path !== '/auth/login' && path !== '/auth/refresh' && path !== '/auth/logout') {
      if (method === 'GET') {
        clearTimeout(timer);
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            return request(path, { method, body, authenticated: true, _retry: true });
          }
        } catch (refreshErr) {
          if (refreshErr instanceof ApiError) throw refreshErr;
          throw new ApiError('Sesi kedaluwarsa. Silakan login kembali.', 401);
        }
      }
    }

    // 3. HTTP 4xx & 5xx: Penanganan response gagal tanpa crash
    if (!response.ok) {
      const userMessage = getErrorMessageForStatus(response.status, payload?.message);
      throw new ApiError(userMessage, response.status, {
        details: payload?.message || null,
      });
    }

    // 4. HTTP 2xx: Sukses mengembalikan data
    return payload;

  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') {
      throw new ApiError('Koneksi waktu habis (timeout). Server membutuhkan waktu terlalu lama untuk merespons.', 0, {
        type: 'TIMEOUT_ERROR',
        isNetworkError: true,
        isTimeout: true,
        isRetryable: true,
      });
    }
    // Network Error: Koneksi putus, DNS gagal, server offline
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet atau Wi-Fi Anda.', 0, {
      type: 'NETWORK_ERROR',
      isNetworkError: true,
      isRetryable: true,
      details: e.message || 'Network request failed',
    });
  } finally {
    clearTimeout(timer);
  }
}
```

---

## 4. Hubungan dengan Refresh Token & Perlindungan Sesi

Sesuai aturan keamanan penting: **"Jangan menghapus sesi hanya karena gangguan jaringan."**
Pada [`refreshAccessToken()`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/services/api.js#L82-L138):
1. Jika terjadi kegagalan jaringan saat memanggil `/auth/refresh` (misalnya perangkat mendadak offline atau timeout), error ditangkap sebagai `NETWORK_ERROR` dengan status 0.
2. `clearSession()` **DILARANG DIPANGGIL** saat network error. Sesi pada Expo SecureStore tetap utuh.
3. `clearSession()` **HANYA DIPANGGIL** jika server secara definitif merespons dengan **HTTP 401** (tanda bahwa refresh token sudah kedaluwarsa, tidak valid, atau telah dicabut).

---

## 5. Integrasi End-to-End dengan Seluruh Fitur TemuKampus

Penanganan error terintegrasi penuh ke semua fitur aplikasi tanpa duplikasi:
- **Login API (`loginWithAPI`):** Menampilkan error 400 (input kosong), 401 (email/password salah), atau Network Error tanpa mengekspos hash/kredensial.
- **Register API (`registerUser`):** Menangani error 400 (validasi panjang password), 409 (email sudah terdaftar), dan 500 server error.
- **Daftar Barang (`fetchBarang`):** Auto-recovery via refresh token saat 401, menampilkan banner error jika server 500 atau offline tanpa membuat layar crash.
- **Detail Barang (`GET /barang/:id`):** Menangani 404 jika barang telah dihapus/tidak ditemukan.
- **Lapor Barang (`createBarang`):** Menolak duplikasi request non-idempotent dan menyajikan pesan validasi 400 secara ramah.
- **Verifikasi Pengambilan (`verifyBarang`):** Menangani 400 (ciri khusus salah) dan 429 (batas percobaan verifikasi tercapai).
- **Unggah Foto (`uploadPhoto`):** Menangani timeout, payload 413 (file > 25MB), format file 400, dan koneksi terputus.

---

## 6. Hasil Pengujian Lengkap (Automated Test Suite)

Pengujian otomatis dieksekusi menggunakan test runner Node.js (`server/server.test.js`):

```bash
node --test server/server.test.js
```

### Log Eksekusi Pengujian:
```text
✔ Week 4 REST API + Week 5 token authentication, protected route, logout (601.02ms)
✔ Week 5 Task 01 - Token Authentication (Login API, Credential Validation, and Real JWT Access Token) (177.25ms)
✔ Week 5 Task 02 - Protected API Request (Authorization Bearer Token, 401, 403, and GET /barang) (282.19ms)
✔ Week 5 Task 03 - Refresh Token & Session Management (Token Rotation, Expiration, Protected API, and Logout Revocation) (356.49ms)
✔ Week 6 Task 01 - Handle API Error (2xx Success, 4xx Client Error, 5xx Server Error, Network Error, and Token Refresh Recovery) (341.19ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1902.64ms
```

### Rincian Skenario Pengujian Task 01:

| No | Skenario Pengujian | Input / Kondisi | Ekspektasi | Hasil Aktual | Status |
|---|---|---|---|---|:---:|
| 1 | **HTTP 200 — Success** | Kredensial benar & Bearer valid ke `/barang` | Status 200, mengembalikan payload data | Response diproses sukses | **PASS** |
| 2 | **HTTP 400 — Bad Request** | Login dengan email & password kosong | Status 400, `isBadRequest: true`, pesan validasi jelas | Pesan form invalid ditampilkan | **PASS** |
| 3 | **HTTP 401 — Unauthorized** | Request `/barang` tanpa header token | Status 401, `isUnauthorized: true`, pesan sesi berakhir | Melempar ApiError 401 | **PASS** |
| 4 | **HTTP 403 — Forbidden** | Update status barang oleh akun non-pemilik | Status 403, `isForbidden: true`, `isRetryable: false` | Pesan akses ditolak | **PASS** |
| 5 | **HTTP 404 — Not Found** | Request item ID tidak ada (`/barang/999999`) | Status 404, `isNotFound: true`, data tidak ditemukan | Pesan resource not found | **PASS** |
| 6 | **HTTP 500 — Server Error** | Endpoint error `/test/error-500` | Status 500, `isServerError: true`, pesan ramah | Ditangani tanpa app crash | **PASS** |
| 7 | **Network Error** | Request ke host/port yang mati / offline | Status 0, `isNetworkError: true`, `isRetryable: true` | Pesan periksa internet | **PASS** |
| 8 | **Refresh Recovery** | Request GET dengan token kedaluwarsa | Otomatis panggil refresh, retry, dan sukses 200 | Data barang berhasil diambil | **PASS** |
| 9 | **Refresh Failure** | Refresh token palsu / hangus | Status 401, bersihkan sesi, redirect ke login | Sesi dibersihkan aman | **PASS** |
| 10 | **Data Privacy** | Pesan error teknis database/syntax | Disaring agar stack trace tidak bocor ke user | Ditampilkan pesan ramah umum | **PASS** |

---

## 7. Ringkasan File yang Diperbaiki

1. [`services/api.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/services/api.js):
   - Perluasan kelas `ApiError` dengan klasifikasi status dan flag `isRetryable`.
   - Penambahan fungsi `getErrorMessageForStatus()` dengan sanitasi informasi sensitif.
   - Peningkatan fungsi `request()` dengan safe parsing, timeout handler, dan pengelompokan network error.
   - Proteksi sesi pada `refreshAccessToken()` agar tidak terhapus saat gangguan jaringan.
   - Peningkatan penanganan error pada `uploadPhoto()`.
2. [`server/server.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/server/server.js):
   - Penambahan endpoint simulasi `GET /test/error-500` untuk memvalidasi penanganan status HTTP 500 pada automated test.
3. [`server/server.test.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/server/server.test.js):
   - Penambahan test suite menyeluruh untuk seluruh skenario Week 6 Task 01.
4. [`docs/week6/task1.md`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/docs/week6/task1.md):
   - Dokumentasi lengkap Week 6 Task 01.

---

## 8. Kesimpulan & Handover ke Orang 2

- **Tugas Selesai:** Seluruh persyaratan Week 6 Task 01 (Handle API Error) berhasil diimplementasikan dan diverifikasi 100% lulus uji.
- **Kondisi App:** Aplikasi TemuKampus tangguh menghadapi respon sukses, kesalahan klien, kesalahan server, maupun kondisi jaringan terputus tanpa pernah mengalami crash.
- **Kesiapan Handover:** Struktur `ApiError` telah menyediakan properti `isRetryable`, `isNetworkError`, dan `isServerError` yang siap dimanfaatkan oleh **Orang 2 untuk pengerjaan Week 6 Task 02 (Loading State & Retry Mechanism)**.
