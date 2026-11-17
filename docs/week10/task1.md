# Week 10 — Task 01: Implement GPS Location

## Tujuan

Menerapkan pengambilan lokasi GPS pada aplikasi TemuBarang dengan izin lokasi foreground. Pengguna hanya membagikan lokasi ketika menekan tombol lokasi, bukan dilacak otomatis sejak aplikasi dibuka.

## Penerapan di aplikasi

1. Pada formulir **Lapor Barang**, pengguna menekan tombol **Gunakan Lokasi GPS Saat Ini**.
2. Aplikasi meminta izin lokasi melalui `Location.requestForegroundPermissionsAsync()`.
3. Aplikasi mengambil lokasi dengan `Location.getCurrentPositionAsync()` dan akurasi `Location.Accuracy.Balanced`.
4. Aplikasi membaca `latitude`, `longitude`, dan `accuracy`.
5. Koordinat ditampilkan pada formulir dan dikirim bersama data laporan ke backend.
6. Jika kejadian terjadi sebelumnya, pengguna dapat memilih titik manual melalui `components/ReportLocationPicker.js` tanpa harus berada di lokasi tersebut.
7. Jika kolom teks lokasi diubah manual, koordinat GPS dan alamat sebelumnya dihapus agar lokasi teks dan koordinat tidak berbeda.

## File utama

- `services/location.js` — meminta izin dan mengambil posisi GPS.
- `App.js` — tombol GPS dan integrasi pemilih titik pada formulir laporan.
- `components/ReportLocationPicker.js` — pemilihan titik manual dan reverse geocoding.
- `models/Barang.js` — DTO menyimpan latitude, longitude, accuracy, dan alamat.
- `server/server.js` — validasi dan penyimpanan metadata lokasi pada endpoint POST `/barang`.

## Validasi backend

- Latitude harus berada pada rentang -90 sampai 90.
- Longitude harus berada pada rentang -180 sampai 180.
- Latitude dan longitude harus dikirim berpasangan.
- Accuracy harus bernilai angka non-negatif.
- Koordinat bersifat opsional agar laporan lama dan laporan yang dibuat tanpa GPS tetap dapat digunakan.

## Checklist demo

- [ ] Izin lokasi diminta saat tombol GPS ditekan.
- [ ] Penolakan izin ditangani dengan pesan yang jelas.
- [ ] Latitude ditampilkan.
- [ ] Longitude ditampilkan.
- [ ] Accuracy ditampilkan.
- [ ] Koordinat tersimpan bersama laporan setelah POST.
- [ ] Laporan tanpa GPS tetap dapat dibuat dengan lokasi teks manual.
- [ ] Titik lokasi kejadian dapat dipilih manual di peta.
- [ ] Akurasi GPS rendah ditampilkan sebagai peringatan, bukan dianggap presisi.
