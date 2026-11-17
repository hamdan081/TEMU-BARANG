# Week 10 — Task 02: Display Location on Map

## Tujuan

Menampilkan posisi pengguna dan lokasi laporan barang pada peta interaktif menggunakan Maps SDK (`react-native-maps`) agar pengguna dapat memahami hubungan lokasi barang hilang dan barang temuan serta mempermudah proses pencarian dan pengembalian barang.

## Penerapan di Aplikasi

Aplikasi memiliki tab navigasi utama **Peta** yang menampilkan:
1. **Marker Pengguna (🔵)**: Posisi perangkat GPS aktual dengan lingkaran akurasi dan balon informasi koordinat.
2. **Marker Barang Hilang (🔴)**: Titik kejadian laporan barang hilang dengan warna merah kontras.
3. **Marker Barang Ditemukan (🟢)**: Titik penemuan barang dengan warna hijau.
4. **Marker & Lingkaran Geofence (🟣)**: Pusat area dan batas radius pemantauan (150m, 300m, 500m).
5. **Camera Position Interaktif**:
   - Pemusatan kamera dinamis (`animateCamera` dan `animateToRegion`).
   - Kontrol Zoom In (+) dan Zoom Out (-).
   - Mode Perspektif 2D dan 3D Tilt (sudut pitch 45°).
   - Reset arah kamera ke Utara (heading 0°).
   - Tombol cepat **Pusatkan ke GPS Saya** (floating locate button).
   - Tombol **Tampilkan Semua Marker** (`fitToCoordinates` / auto bounding).
   - HUD koordinat live di pojok atas peta: menampilkan latitude dan longitude kamera saat digeser.
6. **Kartu Informasi Marker Terpilih**:
   - Menampilkan jenis marker (Hilang / Ditemukan / Posisi Saya / Geofence).
   - Menampilkan koordinat Latitude & Longitude presisi (6 angka desimal).
   - Menampilkan alamat/lokasi kejadian dan akurasi GPS jika tersedia.
   - Tombol aksi cepat untuk memusatkan kamera atau membuka detail laporan lengkap.
7. **Filter Marker Cepat**:
   - Chip filter: Semua Laporan, Barang Hilang (🔴), dan Barang Ditemukan (🟢).
8. **Integrasi Alur Navigasi**:
   - Dari halaman **Detail Barang**, tombol **📍 Lihat Lokasi pada Peta** langsung mengarahkan pengguna ke tab Peta dan memusatkan kamera secara otomatis ke titik kejadian barang tersebut.
   - Penolakan izin GPS tetap memungkinkan pengguna menjelajahi peta dan melihat seluruh marker barang yang telah memiliki koordinat.

## Library dan Komponen

- `react-native-maps`: `MapView`, `Marker`, `Callout`, dan `Circle`.
- `expo-location`: Pengambilan posisi GPS terkini perangkat secara aktual dan reverse geocoding.
- `@expo/vector-icons`: Ikon visual pada kontrol peta dan kartu informasi.
- `components/LocationScreen.js`: Komponen utama peta, marker, kontrol kamera, dan kartu informasi.
- `components/ReportLocationPicker.js`: Pemilihan titik manual pada peta saat pembuatan/pengeditan laporan.
- `components/BottomNav.js`: Tab navigasi utama Peta.
- `utils/locationMath.mjs`: Validasi koordinat, pewarnaan pin marker, formatting desimal, kalkulasi bounding region, dan formatting informasi marker.
- `App.js`: Integrasi navigasi antara halaman Detail Barang, formulir pelaporan, dan layar Peta.

## Catatan Data & Privasi

- Laporan tanpa koordinat GPS (misal laporan terdahulu sebelum Week 10) tetap tersimpan aman dan dapat dibaca melalui tab Daftar Barang.
- Laporan baru menyimpan koordinat aktual ketika pengguna menekan tombol GPS atau memilih titik kejadian di peta secara manual.
- Untuk menjaga privasi pengguna, API membulatkan koordinat bagi pengguna umum, sementara pemilik dan penemu yang telah terverifikasi/dipasangkan dapat melihat koordinat presisi.

## Kompatibilitas & Konfigurasi

- `react-native-maps` kompatibel dengan Expo Go (iOS & Android).
- Untuk Android standalone / production APK, konfigurasi Google Maps API key telah disiapkan di `app.config.js` via environment variable `GOOGLE_MAPS_API_KEY` tanpa memasukkan kunci privat ke repositori publik.

## Checklist Implementasi & Demo

- [x] Peta berhasil diintegrasikan dan ditampilkan pada tab Peta TemuBarang.
- [x] Camera Position diimplementasikan (smooth animation, zoom in/out, 3D tilt, compass).
- [x] HUD koordinat live menampilkan Latitude dan Longitude secara presisi.
- [x] Marker lokasi GPS pengguna tampil dengan warna biru (`#1565C0`) dan lingkaran akurasi.
- [x] Pemusatan peta berdasarkan koordinat GPS pengguna berfungsi normal.
- [x] Marker barang hilang (merah `#DC2626`) dan barang temuan (hijau `#16A34A`) tampil.
- [x] Kartu informasi dan callout menampilkan informasi lokasi ketika marker dipilih.
- [x] Loading state dan penanganan error/penolakan izin GPS diimplementasikan.
- [x] Integrasi Task 01 terjaga: koordinat GPS dinamis aktual, titik manual picker berbeda dari GPS pengguna.
- [x] Fitur Geofencing Task 03 tetap utuh dan berfungsi normal.
- [x] Unit test `tests/week10.location.test.mjs` lulus 100%.
