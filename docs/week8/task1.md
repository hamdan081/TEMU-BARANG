# Penerapan Materi Asynchronous Week 8 pada TemuKampus

## Tujuan

Menerapkan operasi asynchronous yang dibahas pada materi Week 8 ke fitur utama TemuKampus. Aplikasi tetap berfokus pada pelaporan barang hilang dan barang temuan. Contoh Todo List pada materi tidak disalin mentah-mentah; konsep daftar tugas disesuaikan menjadi **Tindak Lanjut Laporan**, yaitu daftar laporan barang yang masih membutuhkan perhatian atau tindakan.

## Pemetaan enam konsep wajib

| Konsep pada materi | Implementasi TemuKampus | File/lokasi |
|---|---|---|
| GET data API | Mengambil daftar laporan barang hilang dan temuan | `services/api.js` → `fetchBarang()`; `App.js` → `refreshItems()` |
| `useEffect` | Memuat daftar laporan setelah sesi pengguna berhasil dipulihkan | `App.js` → `useEffect` yang memanggil `refreshItems()` |
| Loading Indicator | Menampilkan `ActivityIndicator` selama proses GET atau pengiriman berlangsung | `App.js` → `LoadingStateView`, `loadingItems`, `busy` |
| POST data | Mengirim laporan barang hilang atau ditemukan melalui formulir Lapor Barang | `App.js` → `submitReport()`; `services/api.js` → `createBarang()` |
| PATCH status | Mengubah status penanganan menjadi `Selesai Dikembalikan` setelah verifikasi dan konfirmasi pelapor | `App.js` → `completeReturn()`; `services/api.js` → `markReturned()`; `server/server.js` → `PATCH /barang/:id/status` |
| Error handling | Menangani kegagalan GET, POST, verifikasi, dan PATCH dengan `try/catch`, pesan error, serta `Alert` | `App.js` → `refreshItems()`, `submitReport()`, `submitClaim()`, `completeReturn()` |
| Refresh data | Memuat ulang daftar laporan dari server melalui tombol Refresh dan pull-to-refresh | `App.js` → `handleRetry()`, `FlatList` `onRefresh` |

## Pengganti konsep Todo List: Tindak Lanjut Laporan

Halaman **Tindak Lanjut Laporan** bukan daftar tugas kuliah. Halaman ini menurunkan daftar tindakan dari status laporan yang ada di server.

- Pelapor dengan laporan `Belum Ditemukan` diarahkan untuk memantau perkembangan laporan kehilangan.
- Pelapor dengan laporan `Menunggu Pemilik` menunggu pemilik mengenali ciri khusus barang temuan.
- Pengguna yang menemukan laporan yang cocok dapat membuka detail dan melakukan verifikasi ciri khusus.
- Pelapor dengan laporan `Menunggu Pengambilan` dapat mengonfirmasi barang sudah diterima. Tindakan ini menjalankan PATCH.
- Laporan `Selesai Dikembalikan` tidak lagi muncul di daftar tindak lanjut aktif.

Daftar tindak lanjut menggunakan hasil GET `/barang`; tidak dibuat penyimpanan Todo terpisah agar tidak menduplikasi data laporan.

## Jenis laporan dan status penanganan

Keduanya dipisahkan agar maknanya tidak tumpang tindih.

| Field | Nilai | Makna |
|---|---|---|
| `jenisLaporan` | `Hilang` | Pengguna melaporkan barang miliknya hilang |
| `jenisLaporan` | `Ditemukan` | Pengguna melaporkan barang yang ditemukan |
| `status` | `Belum Ditemukan` | Laporan kehilangan masih menunggu kecocokan |
| `status` | `Menunggu Pemilik` | Laporan temuan menunggu pemilik memeriksa ciri khusus |
| `status` | `Menunggu Pengambilan` | Verifikasi berhasil; pengambilan menunggu konfirmasi pelapor |
| `status` | `Selesai Dikembalikan` | Pelapor mengonfirmasi barang sudah diterima |

## Alur asynchronous aplikasi

1. Pengguna berhasil login dan sesi dipulihkan.
2. `useEffect` memanggil `refreshItems()`, lalu `fetchBarang()` menjalankan GET `/barang`.
3. Selama menunggu respons, `loadingItems` bernilai `true` dan aplikasi menampilkan loading indicator.
4. Pengguna membuat laporan barang hilang/temuan. `submitReport()` mengirim data dengan POST `/barang`.
5. Pengguna yang merasa barang tersebut miliknya membuka detail dan memasukkan ciri khusus. Endpoint verifikasi memeriksa jawaban di server.
6. Jika verifikasi berhasil, status penanganan berubah menjadi `Menunggu Pengambilan`.
7. Pelapor mengonfirmasi barang sudah diterima. `completeReturn()` menjalankan PATCH `/barang/:id/status` dan status berubah menjadi `Selesai Dikembalikan`.
8. Setiap operasi yang gagal ditangani dengan `catch`, pesan kesalahan, dan `Alert`. Refresh mengambil ulang data agar daftar selalu mengikuti respons server.

## Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/barang` | Mengambil semua laporan barang |
| POST | `/barang` | Membuat laporan barang hilang/temuan |
| POST | `/barang/:id/verify` | Memeriksa ciri khusus barang |
| PATCH | `/barang/:id/status` | Mengubah status menjadi `Selesai Dikembalikan` setelah verifikasi |

Semua endpoint barang memerlukan Bearer access token.

## Pengujian

Jalankan `npm run test:week8`, `npm run test:week7`, dan `npm run test:api`. Setelah itu, jalankan `npm run dev` dan uji halaman Beranda, Daftar Barang, Lapor Barang, Tindak Lanjut, serta proses verifikasi melalui Expo Go.
