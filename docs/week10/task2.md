# Week 10 — Task 02: Display Location on Map

## Tujuan

Menampilkan posisi pengguna dan lokasi laporan barang pada peta agar mahasiswa dapat memahami hubungan lokasi barang hilang dan barang temuan.

## Penerapan di aplikasi

Aplikasi memiliki tab **Peta** yang menampilkan:
- Marker biru untuk posisi perangkat saat ini.
- Marker merah untuk laporan **Barang Hilang**.
- Marker hijau untuk laporan **Barang Ditemukan**.
- Lingkaran ungu dan marker pusat untuk area geofence yang dipilih.

Pengguna dapat menekan callout marker laporan untuk membuka halaman detail barang. Dari halaman Detail Barang, tombol **Lihat Lokasi pada Peta** memusatkan peta pada koordinat laporan yang dipilih.

## Library dan komponen

- `react-native-maps`: `MapView`, `Marker`, dan `Circle`.
- `expo-location`: mengambil lokasi perangkat dan izin lokasi.
- `components/LocationScreen.js`: tampilan peta, marker, dan geofence.
- `components/ReportLocationPicker.js`: pemilihan titik laporan secara manual.
- `components/BottomNav.js`: tab navigasi Peta.
- `App.js`: integrasi peta dengan daftar dan detail laporan.

## Catatan data

Laporan yang dibuat sebelum fitur GPS ditambahkan tidak memiliki koordinat sehingga tidak ditampilkan sebagai marker. Laporan tersebut tetap dapat dibaca melalui Daftar Barang. Laporan baru dapat menyimpan koordinat jika pengguna memilih tombol GPS atau memilih titik secara manual pada peta. Untuk menjaga privasi, API membulatkan koordinat bagi pengguna lain; pemilik dan pihak yang telah dipasangkan dapat melihat koordinat presisi.

## Kompatibilitas

`react-native-maps` tersedia di Expo Go untuk uji coba. Untuk Android standalone/development build, konfigurasi Google Maps API key mungkin diperlukan sesuai dokumentasi Expo. Jangan menaruh API key pribadi di repository publik.

## Checklist demo

- [ ] Tab Peta dapat dibuka.
- [ ] Peta tampil pada smartphone.
- [ ] Lokasi GPS pengguna ditampilkan sebagai marker.
- [ ] Marker laporan hilang berwarna merah.
- [ ] Marker laporan ditemukan berwarna hijau.
- [ ] Callout marker dapat membuka detail barang.
- [ ] Peta dapat diarahkan ke lokasi laporan dari halaman Detail Barang.
