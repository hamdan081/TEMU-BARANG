# TemuBarang — Improvement Audit & Change Log

Dokumen ini mencatat perbaikan yang diterapkan setelah audit source code ZIP Week 10. Perubahan mempertahankan alur dan materi resmi Week 1–7, Week 9, dan Week 10.

## 1. Alur pencocokan dan pengembalian barang

- Ditambahkan `utils/barangMatching.mjs` untuk memberi skor kemiripan berdasarkan nama, kategori, deskripsi, lokasi/koordinat, dan tanggal.
- Skor ditampilkan sebagai rekomendasi, bukan kepastian dan bukan verifikasi otomatis.
- Pemilik laporan kehilangan dapat memilih laporan temuan dan laporan kehilangan miliknya untuk mengajukan klaim.
- Server memeriksa ciri rahasia pada laporan kehilangan milik pengklaim, bukan ciri rahasia yang dibuat pelapor barang temuan.
- Klaim berhasil menghubungkan dua laporan dengan `matchedReportId` dan `matchedAt`.
- PATCH pengembalian dilakukan pada laporan kehilangan milik pengklaim dan menyelesaikan kedua laporan sekaligus.
- Endpoint lama `POST /barang/:id/verify` mengembalikan HTTP 410 karena alur sebelumnya tidak memvalidasi kepemilikan laporan kehilangan.

## 2. Pengelolaan laporan dan moderasi

- Pemilik dapat mengedit laporan aktif yang belum dipasangkan, termasuk mengganti ciri rahasia laporan kehilangan (opsional; tetap di-hash).
- Pemilik dapat menghapus laporan aktif yang belum dipasangkan atau diselesaikan.
- Laporan yang sudah dipasangkan/selesai tidak dapat diedit atau dihapus.
- Pengguna dapat mengirim laporan penyalahgunaan dengan alasan terstruktur; duplikasi laporan dari pengguna yang sama ditolak.
- Data moderasi disimpan pada `moderationReports`. Dashboard admin belum termasuk pada versi praktikum ini.

## 3. Keamanan dan privasi

- Ciri rahasia laporan kehilangan disimpan menggunakan hash scrypt.
- Data lama yang masih menyimpan rahasia plaintext dimigrasikan menjadi hash dan field plaintext dihapus.
- Seed data menggunakan hash, bukan rahasia plaintext di source code.
- API tidak mengirim hash rahasia kepada client.
- Endpoint klaim, edit, hapus, dan konfirmasi pengembalian memeriksa kepemilikan dan status.
- Koordinat presisi dan alamat GPS hanya dikirim kepada pemilik laporan serta pihak yang sudah dipasangkan. Pengguna lain menerima koordinat yang dibulatkan dan identitas pemilik disamarkan.
- Penulisan database JSON dilakukan melalui file sementara dan rename.

## 4. GPS, peta, dan geofencing

- Ditambahkan `components/ReportLocationPicker.js` untuk memilih titik manual pada peta, termasuk laporan kejadian masa lalu.
- Jika teks lokasi diketik manual, koordinat GPS lama dan alamat sebelumnya dibersihkan agar data tidak bertentangan.
- Akurasi GPS yang buruk ditampilkan sebagai peringatan.
- Pusat dan radius geofence disimpan menggunakan AsyncStorage.
- Sampel geofence dengan akurasi lebih buruk dari 100 meter diabaikan.
- Hysteresis digunakan pada batas masuk/keluar untuk mengurangi notifikasi palsu karena GPS bergeser.
- Geofencing tetap foreground-only; background location tidak diaktifkan.

## 5. Sensor Week 7 dan navigasi

- `SensorScreen` sekarang menggunakan `SensorDashboard` dan `SensorInteraction`, sehingga grafik/ringkasan dan deteksi gerakan benar-benar tampil bersama pembacaan Accelerometer.
- Logging sensor dibatasi maksimal sekali per detik; interval sampling menjadi 200 ms.
- Feedback getar dibatalkan saat hook dibersihkan.
- Config plugin `expo-sensors` menyediakan deskripsi izin gerakan iOS.
- Bottom navigation disederhanakan menjadi Beranda, Daftar, Lapor, Peta, dan Lainnya. Tindak Lanjut, Sensor, dan Profil ditempatkan di Menu Lainnya.
- Nama tampilan aplikasi dan header diseragamkan menjadi `TemuBarang`. Expo `slug`/`scheme` lama (`temukampus`) sengaja dipertahankan agar deep link dan identitas proyek lama tidak terputus; key preferensi lokal juga tetap dipertahankan.

## 6. Pengujian otomatis pada pemeriksaan revisi ini

Perintah `npm run test:all` dijalankan dengan Multer test double sementara di luar folder project dan `MULTER_TEST_STUB=1` (skenario upload multipart sengaja dilewati karena paket Multer asli tidak tersedia di lingkungan pemeriksaan).

| Kelompok | Hasil |
|---|---:|
| Matching utility | 4/4 lulus |
| Week 7 motion utility | 4/4 lulus |
| Week 9 report/API integration | 6/6 lulus |
| Week 10 location utility | 2/2 lulus |
| API/authentication/reliable API regression | 7/7 lulus |
| **Total** | **23/23 lulus** |

- Pemeriksaan parser TypeScript terhadap 30 file JS/JSX/MJS: tidak ditemukan syntax error.
- `app.config.js` berhasil dievaluasi; orientasi `default` dan identitas aplikasi tervalidasi. Google Maps key diuji menggunakan nilai dummy, bukan key asli.
- Test double hanya melewati setup middleware upload agar pengujian route JSON dapat berjalan. Pengujian upload foto dengan paket Multer asli **belum dilakukan**.

Setelah `npm install` di komputer pengguna, jalankan `npm run test:all` tanpa `MULTER_TEST_STUB` agar skenario upload juga diuji menggunakan Multer sesungguhnya. Pengujian otomatis tetap tidak menggantikan uji Expo Go, GPS, peta, sensor, orientasi layar, dan izin pada smartphone fisik.

## 7. Checklist uji manual yang masih harus dilakukan

- [ ] Login melalui Expo Go dan ambil daftar laporan.
- [ ] Buat laporan Hilang dengan ciri rahasia.
- [ ] Buat laporan Ditemukan dari akun berbeda tanpa ciri rahasia.
- [ ] Buka laporan temuan dari akun pemilik laporan kehilangan, ajukan klaim dengan ciri rahasia yang benar.
- [ ] Uji ciri rahasia salah dan pastikan server menolak klaim.
- [ ] Pastikan kedua laporan berubah menjadi Menunggu Pengambilan setelah klaim berhasil.
- [ ] Pastikan hanya pemilik laporan kehilangan dapat mengonfirmasi pengembalian.
- [ ] Uji edit/hapus laporan milik sendiri dan penolakan akses pada laporan milik orang lain.
- [ ] Uji pelaporan informasi dan penolakan laporan duplikat.
- [ ] Uji GPS, izin lokasi ditolak, akurasi rendah, dan pemilihan titik manual.
- [ ] Uji marker peta dan perbedaan koordinat presisi/perkiraan pada dua akun.
- [ ] Uji geofence masuk/keluar, simpan radius, pindah halaman, dan buka kembali.
- [ ] Uji sensor pada smartphone fisik; browser/emulator dapat memiliki keterbatasan sensor.
- [ ] Pastikan peta Google Maps tampil pada build target dan konfigurasi API key tidak masuk ke repository.

## 8. Batasan yang sengaja dipertahankan

- Backend masih menggunakan `server/data/database.json` untuk praktikum, bukan database transaksional produksi.
- Dashboard admin moderasi belum dibuat.
- Geofencing berjalan ketika halaman Peta terbuka saja.
- Pengujian GPS, peta, sensor, dan UI harus dilakukan pada smartphone fisik.
- Penilaian skor pencocokan adalah heuristic sederhana; keputusan pengembalian tetap memerlukan verifikasi manusia.


## 9. Penyesuaian audit lanjutan

- Penomoran asynchronous diselaraskan menjadi Week 9 sesuai urutan modul dosen (tidak ada modul Week 8).
- Request GET mendukung `AbortSignal`; cleanup `useEffect` membatalkan request ketika sesi tidak lagi aktif atau App dilepas. Karena navigasi saat ini dikelola sebagai state di dalam satu komponen `App`, perpindahan tab tidak otomatis meng-unmount halaman.
- Penanda request mencegah hasil request yang lebih lama menimpa hasil yang lebih baru.
- Error GET pada refresh manual juga ditampilkan melalui `Alert`, sementara error state inline tetap disediakan.
- Tombol POST laporan, klaim, dan PATCH pengembalian menampilkan `ActivityIndicator` selama request berjalan.
- Orientasi Expo diubah ke `default` agar portrait dan landscape dapat diuji sesuai materi Week 2.
- Target sentuh kontrol kecil diperbesar mendekati/minimal 44 dp.
- Nama tampilan aplikasi tetap `TemuBarang`; Expo `slug`/`scheme` lama dipertahankan untuk menjaga deep link/proyek yang sudah digunakan.
- `app.config.js` membaca Google Maps API key dari environment build; key tidak disimpan di source code.
- Dokumentasi Week 1 (project kickoff) dan Week 2 (responsive/accessibility) ditambahkan.

Pengujian perangkat fisik, screen reader, orientasi landscape, dan native Maps build tetap merupakan checklist manual; perubahan konfigurasi tidak dianggap sebagai bukti uji perangkat.
