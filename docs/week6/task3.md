# Week 6 Task 03 — Handle Offline

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 3):** fawwaz (`fawwaz` / `icamrz8@gmail.com`)  
**Tanggung Jawab:** Senior React Native Developer, Expo Developer, Network Connectivity Specialist, Software Tester, dan Git Specialist  
**Fokus Utama:** Mengimplementasikan mekanisme penanganan offline (*Offline Handling*) secara komprehensif pada aplikasi TemuKampus sehingga aplikasi dapat mendeteksi kondisi ketiadaan koneksi internet, membedakannya secara akurat dari kegagalan server lokal, memberikan umpan balik visual (*Offline State UI* & *Offline Banner*), melindungi integritas input formulir laporan, dan menyediakan mekanisme *Retry* setelah koneksi internet kembali tersedia.

---

## 1. Network Connectivity & NetInfo Integration

### 1.1 Library yang Digunakan
Sesuai standar Expo SDK 57 dan React Native, library resmi yang digunakan adalah:
```text
@react-native-community/netinfo: 12.0.1
```
Library ini telah terpasang di `package.json` dan diverifikasi kompatibel penuh dengan runtime Expo Go maupun standalone production bundle (Hermes bytecode).

### 1.2 Listener & Initial Fetch
Pada [`App.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/App.js), status jaringan dipantau secara real-time menggunakan listener yang dibersihkan (*cleanup function*) ketika komponen di-unmount:

```javascript
useEffect(() => {
  // Listener status koneksi jaringan via NetInfo
  const unsubscribe = NetInfo.addEventListener(state => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    setIsOnline(online);
  });

  // Initial check status koneksi saat aplikasi dimuat
  NetInfo.fetch().then(state => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    setIsOnline(online);
  }).catch(() => {});

  return () => unsubscribe();
}, []);
```

---

## 2. Diskriminasi Kondisi Jaringan (Network Error Discrimination)

Sesuai instruksi dan panduan pengujian PPT Dosen, aplikasi membedakan secara tegas 4 kondisi kesalahan jaringan:

| Kondisi | Indikator | Ikon | Judul Error | Pesan yang Ditampilkan |
| :--- | :--- | :---: | :--- | :--- |
| **1. Perangkat Offline** | `!isOnline` (Wi-Fi/seluler mati) | `📡🚫` | **Tidak Ada Koneksi Internet** | *Periksa koneksi Anda dan coba lagi.* |
| **2. Server Tidak Terjangkau** | Wi-Fi aktif, port lokal backend mati / DNS gagal | `🔌` | **Server Tidak Terjangkau** | *Perangkat terhubung ke jaringan, tetapi server API TemuKampus tidak dapat dijangkau. Pastikan server lokal aktif.* |
| **3. Request Timeout** | AbortController trigger (15 detik) | `⏱️` | **Koneksi Waktu Habis** | *Server membutuhkan waktu terlalu lama untuk merespons. Periksa koneksi Anda dan coba lagi.* |
| **4. Server Error (HTTP 5xx)** | Respon HTTP 500, 502, 503 | `🖥️` | **Gangguan Server** | *Terjadi kesalahan pada server (5xx). Silakan coba lagi nanti.* |

> **Catatan Penting:** Jika Wi-Fi tersambung tetapi backend server lokal mati, aplikasi **TIDAK** menyebut perangkat tidak memiliki internet, melainkan mendiagnosis sebagai **"Server Tidak Terjangkau"**.

---

## 3. Desain Komponen & Antarmuka Offline

### 3.1 Banner Offline Terpadu
Ketika `isOnline === false`, aplikasi menampilkan banner peringatan mencolok di bagian atas layar (di bawah Header):
```jsx
{!isOnline && (
  <View style={styles.offlineBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
    <Text style={styles.offlineBannerText}>📡 Mode Offline — Tidak ada koneksi internet. Periksa koneksi Anda.</Text>
  </View>
)}
```

### 3.2 Tampilan Offline State (`ErrorStateView`)
Ketika pengambilan data gagal akibat offline, halaman menampilkan komponen Offline State yang ramah screen-reader:
- **Ikon Offline:** `📡🚫`
- **Judul:** `Tidak Ada Koneksi Internet`
- **Pesan:** `Periksa koneksi Anda dan coba lagi.`
- **Tombol:** `Coba Lagi` (dengan `accessibilityLabel="Coba Lagi"` dan `accessibilityHint="Mencoba kembali mengambil data barang dari server setelah koneksi aktif"`)

Komponen dibungkus dalam kontainer putih bersih dengan border halus, tipografi kontras tinggi, dan ikon berukuran 44pt.

---

## 4. Mekanisme Retry Setelah Online

Ketika tombol **"Coba Lagi"** ditekan oleh pengguna:

1. **Pengecekan Status Koneksi:** Aplikasi memanggil `await NetInfo.fetch()` untuk memastikan apakah perangkat sudah benar-benar terhubung ke internet.
2. **Blokir Request Saat Masih Offline:** Jika perangkat masih offline, request API **TIDAK** dikirimkan ke jaringan, mencegah beban berulang tanpa batas (*infinite retry loop*), dan menampilkan notifikasi peringatan.
3. **Eksekusi Ulang Saat Online:** Jika koneksi telah pulih:
   - Status `loadingItems` diaktifkan (`true`), tombol menampilkan teks `"Memproses..."`.
   - Mengambil data barang terbaru dari server melalui `refreshItems()`.
   - Jika request berhasil, data langsung dirender ke antarmuka dan error state otomatis dibersihkan.
   - Jika server masih belum merespons, pesan kesalahan diagnostik yang relevan ditampilkan.

---

## 5. Integrasi Fitur TemuKampus & Preservasi Formulir

### 5.1 Daftar Barang & Barang Terbaru
- Menampilkan `LoadingStateView` saat awal memuat.
- Menampilkan `ErrorStateView` (dengan ikon `📡🚫`) jika offline.
- Menampilkan `EmptyStateView` jika data kosong.
- Mendukung *Pull-to-Refresh* yang terhubung ke `handleRetry`.

### 5.2 Lapor Kehilangan & Lapor Temuan (`submitReport`)
Sesuai syarat ketat Task 03:
- **Formulir Dipertahankan:** Seluruh input pengguna (`nama`, `kategori`, `lokasi`, `deskripsi`, `verificationSecret`) **TIDAK DIHAPUS** ketika terjadi kegagalan jaringan atau saat offline.
- **Foto Dipertahankan:** Foto barang yang telah dipilih dari galeri atau diambil dari kamera (`selectedImage` & `selectedImageBase64`) **TIDAK DIHAPUS**.
- **Tanpa Auto-Resend Otomatis:** Aplikasi tidak melakukan pengiriman ulang POST secara otomatis di latar belakang untuk mencegah duplikasi laporan (*double submission*).
- **Feedback Jelas:** Pengguna menerima pesan:
  `"Tidak ada koneksi internet. Formulir dan foto Anda tetap tersimpan. Silakan periksa koneksi Anda dan coba kirim kembali."`

---

## 6. Aksesibilitas (Accessibility)

- `accessibilityRole="alert"` dan `accessibilityLiveRegion="polite"` pada banner offline dan status message.
- `accessibilityRole="header"` pada judul state offline.
- `accessibilityRole="button"`, `accessibilityLabel="Coba Lagi"`, dan `accessibilityHint` pada tombol retry.
- Tidak ada layar putih atau loading spinner tanpa henti saat offline.

---

## 7. Hasil Pengujian (Skenario PPT Dosen & Test Suite)

### 7.1 Skenario Pengujian PPT Dosen

| Langkah | Aksi | Hasil yang Diamati | Status |
| :---: | :--- | :--- | :---: |
| 1 | Jalankan aplikasi TemuKampus | Aplikasi terbuka normal | **PASS** |
| 2 | Koneksi internet aktif | Header dan banner normal | **PASS** |
| 3 | Buka halaman Daftar Barang | Halaman daftar terbuka | **PASS** |
| 4 | Ambil data dari REST API | Data barang (4 item) berhasil dimuat | **PASS** |
| 5 | Putuskan koneksi jaringan (Offline) | NetInfo mendeteksi perubahan koneksi | **PASS** |
| 6 | Lakukan request baru | Request ditolak secara anggun | **PASS** |
| 7 | Verifikasi kegagalan offline | Terdeteksi sebagai Offline State | **PASS** |
| 8 | Tampilan Offline State | Ikon `📡🚫` dan judul `Tidak Ada Koneksi Internet` muncul | **PASS** |
| 9 | Pesan offline terbaca | Teks `"Periksa koneksi Anda dan coba lagi."` terlihat jelas | **PASS** |
| 10 | Hubungkan kembali koneksi internet | NetInfo mendeteksi koneksi online kembali | **PASS** |
| 11 | Tekan tombol "Coba Lagi" | Pengecekan koneksi lolos, memicu refresh | **PASS** |
| 12 | Indikator Loading | Muncul teks `"Memproses..."` dan spinner | **PASS** |
| 13 | Pemuatan Data Sukses | Data barang tampil kembali, error state dibersihkan | **PASS** |
| 14 | Uji Backend Lokal Mati saat Wi-Fi On | Muncul `Server Tidak Terjangkau`, BUKAN `Tidak Ada Koneksi Internet` | **PASS** |
| 15 | Uji Input Lapor Barang saat Offline | Formulir dan foto tetap utuh, tidak ada duplikasi POST | **PASS** |

### 7.2 Hasil Otomatis Test Suite (`node --test server/server.test.js`)
```text
✔ Week 4 REST API + Week 5 token authentication, protected route, logout (508ms)
✔ Week 5 Task 01 - Token Authentication (Login API, Credential Validation, and Real JWT Access Token) (166ms)
✔ Week 5 Task 02 - Protected API Request (Authorization Bearer Token, 401, 403, and GET /barang) (278ms)
✔ Week 5 Task 03 - Refresh Token & Session Management (Token Rotation, Expiration, Protected API, and Logout Revocation) (386ms)
✔ Week 6 Task 01 - Handle API Error (2xx Success, 4xx Client Error, 5xx Server Error, Network Error, and Token Refresh Recovery) (326ms)
✔ Week 6 Task 02 - Loading, Error, Retry, and Empty State Lifecycle (122ms)
✔ Week 6 Task 03 - Offline Handling, Network Discrimination, and Form Preservation (53ms)
ℹ tests 7 | pass 7 | fail 0 | cancelled 0 | duration_ms 1994ms
```

---

## 8. File yang Diubah

1. [`package.json`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/package.json): Menambahkan dependensi `@react-native-community/netinfo: 12.0.1`.
2. [`package-lock.json`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/package-lock.json): Lockfile dependency resolution.
3. [`App.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/App.js):
   - Listener NetInfo real-time (`addEventListener` dan `NetInfo.fetch()`).
   - Komponen `LoadingStateView`, `ErrorStateView`, dan `EmptyStateView`.
   - Banner `offlineBanner` terpadu.
   - Guard `handleRetry` terhadap koneksi dan in-flight duplicates.
   - Pencegahan reset form/foto pada `submitReport` saat offline.
   - Styling terpadu dan penambahan accessibility props.
4. [`server/server.test.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/server/server.test.js): Menambahkan test suite Week 6 Task 02 & Task 03.
5. [`docs/week6/task2.md`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/docs/week6/task2.md): Dokumentasi implementasi Week 6 Task 02 (Loading, Error & Retry).
6. [`docs/week6/task3.md`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/docs/week6/task3.md): Dokumentasi implementasi Week 6 Task 03 (Handle Offline).
