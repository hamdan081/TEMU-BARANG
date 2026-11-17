# Week 9 — Asynchronous Report Flow pada TemuBarang

## Tujuan

Menerapkan GET, POST, PATCH, loading, error handling, dan refresh pada alur laporan barang hilang dan temuan. Contoh Todo List di materi tidak disalin sebagai aplikasi terpisah; daftar tindakan diwujudkan sebagai **Tindak Lanjut Laporan**.

## Pemetaan materi

| Konsep | Penerapan | File utama |
|---|---|---|
| GET | Mengambil daftar laporan hilang dan ditemukan | `services/api.js` → `fetchBarang()` |
| useEffect | Memuat data setelah sesi dipulihkan | `App.js` → `refreshItems()` |
| Loading | Menampilkan indikator saat GET/POST/PATCH | `App.js` (`LoadingStateView` didefinisikan inline) |
| POST | Membuat laporan hilang/temuan | `services/api.js` → `createBarang()` |
| PATCH | Mengonfirmasi pengembalian pada laporan kehilangan dan pasangan temuannya | `services/api.js` → `markReturned()`; `server/server.js` |
| Error handling | `try/catch`, pesan error, dan Alert | `App.js` |
| Refresh | Memuat ulang data dari server | `App.js` → `handleRetry()`, pull-to-refresh |

## Alur klaim yang diperbaiki

1. Pemilik membuat laporan **Hilang** dan mengisi ciri rahasia yang hanya diketahui pemilik.
2. Pengguna lain membuat laporan **Ditemukan**. Laporan temuan tidak meminta ciri rahasia.
3. Algoritma membandingkan nama, kategori, deskripsi, lokasi/koordinat, dan tanggal. Skor hanya saran, bukan verifikasi otomatis.
4. Pemilik memilih laporan temuan dan laporan kehilangan miliknya, lalu memasukkan ciri rahasia.
5. Server memverifikasi hash ciri rahasia dari laporan kehilangan, memeriksa kepemilikan, lalu memasangkan kedua laporan.
6. Kedua laporan berubah menjadi `Menunggu Pengambilan`.
7. Pemilik laporan kehilangan mengonfirmasi pengembalian melalui PATCH. Kedua laporan berubah menjadi `Selesai Dikembalikan`.

Endpoint lama `POST /barang/:id/verify` dinonaktifkan (HTTP 410) agar rahasia yang dibuat oleh pelapor temuan tidak digunakan untuk memverifikasi klaim pemilik.

## Status

- `Belum Ditemukan`: laporan kehilangan masih menunggu barang temuan yang cocok.
- `Menunggu Pemilik`: barang temuan menunggu klaim pemilik.
- `Menunggu Pengambilan`: dua laporan sudah dipasangkan dan menunggu serah terima.
- `Selesai Dikembalikan`: pemilik mengonfirmasi barang sudah diterima.

## Pengujian

```bash
npm run test:matching
npm run test:week9
npm run test:api
```

Uji perangkat tetap diperlukan untuk memastikan interaksi UI dan koneksi backend berjalan pada smartphone.


## Penyempurnaan lifecycle request

- `fetchBarang({ signal })` meneruskan `AbortSignal` ke request API.
- `App.js` membuat `AbortController` pada `useEffect` setelah sesi terautentikasi dan membatalkan request ketika effect dibersihkan (misalnya logout atau App dilepas).
- ID request mencegah respons lama menimpa data hasil request yang lebih baru.
- Error karena request dibatalkan tidak ditampilkan sebagai error jaringan/timeout.
- Refresh manual menampilkan `Alert` bila GET gagal; error state inline tetap tersedia untuk pemulihan di layar.
- POST dan PATCH menggunakan `ActivityIndicator` pada tombol selama proses berjalan.
