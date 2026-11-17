# TemuBarang — Aplikasi Pelaporan Barang Hilang dan Temuan

TemuBarang membantu mahasiswa melaporkan barang hilang, melaporkan barang yang ditemukan, melihat lokasi laporan, mengajukan klaim kepemilikan, dan memantau proses pengembalian. Project menggunakan React Native + Expo dan backend REST API Node.js. Materi resmi yang dipetakan adalah Week 1–7, Week 9, dan Week 10.

## Menjalankan aplikasi

1. Install Node.js LTS dan buka folder project di terminal.
2. Jalankan `npm install`.
3. Jalankan `npm run dev`. Perintah ini menyalakan backend pada port `4000` dan Expo Metro.
4. Pastikan laptop dan smartphone berada pada jaringan Wi-Fi yang sama.
5. Buka Expo Go pada smartphone dan scan QR code dari terminal.
6. Jika server tidak terdeteksi otomatis, buka Pengaturan API di aplikasi dan isi alamat LAN laptop, misalnya `http://192.168.1.5:4000`. Jangan gunakan `localhost` dari smartphone.

Akun demo lokal: `demo@kampus.ac.id` / `Demo123!`. Gunakan hanya untuk pengujian lokal.

## Alur utama TemuBarang

### 1. Jenis laporan dan status penanganan

`jenisLaporan` menjelaskan informasi yang dibuat pengguna, sedangkan `status` menunjukkan perkembangan penanganan.

| Jenis laporan | Status awal | Makna |
|---|---|---|
| Hilang | Belum Ditemukan | Laporan kehilangan masuk dan menunggu barang temuan yang mungkin cocok |
| Ditemukan | Menunggu Pemilik | Barang temuan masuk dan menunggu pemilik mengajukan klaim |

Setelah klaim berhasil diverifikasi, kedua laporan dipasangkan dan statusnya berubah menjadi `Menunggu Pengambilan`. Setelah pemilik laporan kehilangan mengonfirmasi barang benar-benar diterima, kedua laporan berubah menjadi `Selesai Dikembalikan`.

### 2. Pencocokan laporan

- Aplikasi membandingkan nama, kategori, ciri-ciri, lokasi/koordinat, dan tanggal laporan.
- Hasilnya berupa **skor kemiripan dan alasan kecocokan**, bukan keputusan otomatis atau persentase kepastian. Potensi kecocokan ditampilkan pada Tindak Lanjut Laporan agar pemilik dapat memeriksa laporan temuan terkait.
- Pemilik laporan kehilangan dapat membuka laporan temuan yang berpotensi cocok.
- Pemilik mengajukan klaim dengan memilih laporan kehilangan miliknya dan memasukkan ciri rahasia yang dibuat ketika laporan kehilangan dibuat.
- Backend memeriksa hash ciri rahasia, memastikan pemilik laporan, dan memasangkan dua laporan.
- Ciri rahasia tidak dikirim kembali oleh API dan tidak disimpan dalam bentuk plaintext.
- Endpoint verifikasi lama `/barang/:id/verify` dinonaktifkan (HTTP 410) karena model sebelumnya memungkinkan verifikasi terhadap rahasia yang dibuat oleh pelapor barang temuan itu sendiri.

Skor pencocokan hanya membantu pencarian. Serah terima fisik tetap perlu dilakukan secara aman, idealnya dengan petugas kampus.

### 3. Pengelolaan laporan

- Pemilik dapat mengedit atau menghapus laporan yang belum dipasangkan dan belum selesai. Ciri rahasia laporan kehilangan dapat diganti saat edit dengan nilai baru; nilai lama tidak pernah ditampilkan kembali.
- Laporan yang sudah dipasangkan atau selesai dikunci agar riwayat penanganan tidak berubah.
- Pengguna lain dapat mengirim laporan penyalahgunaan dengan alasan yang tersedia. Data disimpan pada `moderationReports`; versi praktikum ini belum menyediakan dashboard admin, sehingga peninjauan dilakukan oleh pengelola melalui data backend.
- Satu pengguna hanya dapat melaporkan satu laporan yang sama satu kali.

### 4. Navigasi

Navigasi utama diringkas menjadi lima menu: **Beranda, Daftar, Lapor, Peta, dan Lainnya**. Menu Lainnya berisi Tindak Lanjut Laporan, Pengaman Meja (sensor), dan Profil.

## Penerapan asynchronous Week 9

- **GET** `GET /barang`: mengambil daftar laporan barang.
- **Loading Indicator**: `ActivityIndicator` tampil ketika data atau request sedang diproses.
- **POST** `POST /barang`: membuat laporan hilang atau ditemukan.
- **PATCH** `PATCH /barang/:id/status`: pemilik laporan kehilangan mengonfirmasi pengembalian; status kedua laporan yang terpasang diperbarui bersama.
- **Error Handling**: operasi memakai `async/await`, `try/catch`, pesan kesalahan, dan `Alert`.
- **Refresh**: tombol muat ulang dan pull-to-refresh mengambil ulang data dari backend.

## Penerapan Location-Based Services Week 10

- **Task 1 — GPS Location:** pengguna dapat mengambil lokasi perangkat atau memilih titik manual pada peta untuk lokasi terakhir barang hilang/lokasi barang ditemukan.
- **Task 2 — Display Location on Map:** tab Peta menggunakan `react-native-maps` untuk menampilkan posisi perangkat, marker barang hilang, marker barang ditemukan, dan pusat geofence.
- **Task 3 — Location Intelligence:** Reverse Geocoding mengubah koordinat menjadi alamat. Geofencing mendeteksi masuk/keluar area pantauan.
- **Battery Optimization:** memakai akurasi Balanced, interval dan jarak minimum, mengabaikan sampel GPS yang terlalu tidak akurat, memakai toleransi batas geofence, menyimpan preferensi area, dan menghentikan subscription saat halaman Peta ditinggalkan.

### Privasi lokasi

- Pemilik laporan dan pihak yang telah dipasangkan dapat melihat koordinat presisi dan alamat GPS.
- Pengguna lain hanya menerima koordinat yang dibulatkan hingga tiga angka desimal, tidak menerima alamat GPS presisi, dan tidak menerima ID/nama pemilik laporan secara langsung.
- Kolom lokasi teks tetap merupakan informasi yang ditulis pelapor. Gunakan nama area umum kampus, bukan alamat rumah atau lokasi pribadi yang sensitif.

### Batasan Geofencing

Geofencing pada project ini berjalan saat halaman Peta terbuka (foreground), agar dapat diuji melalui Expo Go. Pemantauan ketika aplikasi ditutup memerlukan development build, konfigurasi native, TaskManager, dan izin background location. Project tidak mengklaim melakukan pemantauan latar belakang.

## Sensor Week 7

Halaman Pengaman Meja mengintegrasikan pembacaan Accelerometer, ringkasan data sensor, deteksi getaran, feedback getar, dan tindakan cepat untuk membuat laporan kehilangan. Interval sampling dan logging dibatasi agar tidak menghasilkan log berlebihan. Pada iOS, deskripsi izin gerakan disediakan melalui config plugin `expo-sensors`.

## Keamanan dan batasan backend

- Ciri rahasia laporan kehilangan di-hash dengan scrypt dan tidak disertakan pada DTO publik.
- Operasi edit, hapus, klaim, dan konfirmasi pengembalian memeriksa kepemilikan laporan.
- Data ditulis atomik menggunakan file sementara lalu rename.
- Lokasi presisi dibatasi untuk pemilik dan pihak yang sudah dipasangkan.
- Backend masih menggunakan `server/data/database.json` untuk kebutuhan praktikum. Ini bukan pengganti database transaksional untuk produksi multi-user.
- Backend lokal untuk praktikum memakai HTTP pada jaringan lokal agar Expo Go dapat mengakses laptop. Untuk deployment publik, gunakan HTTPS (sertifikat TLS valid), database relasional, backup, rate limiting persisten, logging, kebijakan retensi data, dan review keamanan. `services/api.js` menerima URL HTTPS ketika base URL production dikonfigurasi.

## Pengujian

```bash
npm run test:matching
npm run test:week7
npm run test:week9
npm run test:week10
npm run test:api
```

Atau jalankan semuanya dengan `npm run test:all`. Pengujian otomatis tidak menggantikan uji UI, GPS, peta, sensor, dan izin pada smartphone fisik melalui Expo Go.

## Tampilan aplikasi

Redesign UI menggunakan gaya **Modern Premium / Balanced** dengan design tokens terpusat di `theme.js`. Header, pencarian, kartu aksi, kategori, kartu laporan, navigasi bawah, form, detail, profil, peta, pemilih lokasi, dan halaman sensor menggunakan palet serta radius yang konsisten. Lihat `docs/ui-redesign.md` untuk daftar file dan batas perubahan.

## Dokumentasi

- `docs/course-map.md` — peta kesesuaian sembilan modul dosen.
- `docs/week1/` sampai `docs/week7/` — kickoff, UI, security, API, reliable API, dan sensor.
- `docs/week9/` — asynchronous, pencocokan, dan kolaborasi.
- `docs/week10/` — GPS, Map, Reverse Geocoding, Geofencing, dan kolaborasi.
- `docs/improvement-audit.md` — ringkasan perubahan, batasan, dan checklist uji perangkat.

Backend membuat `server/data/` saat dijalankan. Folder data, `.env`, `node_modules`, token, dan credential tidak boleh di-commit.


## Week 2 — Responsive & Accessible Interface

- Konfigurasi orientasi `default` memungkinkan portrait dan landscape.
- Layout utama menggunakan `useWindowDimensions`, Flexbox, lebar maksimum konten, dan padding adaptif.
- Komponen interaktif utama menyediakan label/role aksesibilitas dan target sentuh minimal sekitar 44 dp.
- Uji manual pada layar kecil, layar normal, layar lebar/tablet, portrait, dan landscape. Pastikan tidak ada teks/komponen terpotong dan semua tombol tetap dapat digunakan.

## Konfigurasi Google Maps untuk native build

- Expo Go dapat digunakan untuk uji praktikum; pada development build/APK Android/iOS, isi `GOOGLE_MAPS_API_KEY` di environment build. `app.config.js` meneruskan key ke konfigurasi native. Jangan commit key asli.
- Batasi API key di Google Cloud berdasarkan package/bundle ID dan SHA certificate, serta aktifkan hanya API Maps yang diperlukan.
- Salin `.env.example` menjadi `.env` untuk konfigurasi lokal. Gunakan IP LAN laptop sebagai `EXPO_PUBLIC_API_BASE_URL` saat HP mengakses backend.

## Penomoran materi kuliah

Materi asynchronous yang diberikan dosen diterapkan sebagai **Week 9**. Tidak ada modul resmi Week 8 pada urutan perkuliahan ini. Folder dokumentasi dan script test menggunakan penomoran Week 9.
