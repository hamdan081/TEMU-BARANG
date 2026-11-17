# Week 10 — Task 03: Location Intelligence

Task ini menggabungkan Reverse Geocoding dan Geofencing sesuai materi Week 10.

## A. Reverse Geocoding

### Tujuan

Mengubah koordinat GPS menjadi alamat yang mudah dibaca.

### Penerapan

1. Pengguna mengambil lokasi GPS.
2. `services/location.js` menjalankan `Location.reverseGeocodeAsync({ latitude, longitude })`.
3. Hasil alamat disusun dari nama jalan, nomor, distrik, kota, provinsi, kode pos, dan negara jika tersedia.
4. Alamat otomatis dimasukkan ke kolom lokasi laporan.
5. Pengguna masih dapat mengedit alamat secara manual.

Reverse geocoding hanya dijalankan saat pengguna meminta lokasi, bukan pada setiap update GPS, agar tidak membebani baterai atau layanan geocoding.

## B. Geofencing

### Tujuan

Mendeteksi ketika perangkat masuk atau keluar dari area yang ditentukan dan memberikan feedback kepada pengguna.

### Penerapan

Pada tab **Peta**, pengguna dapat:
- Menekan lama peta untuk menentukan pusat area pantauan.
- Atau menggunakan lokasi GPS saat ini sebagai pusat area.
- Memilih radius 150 meter, 300 meter, atau 500 meter.
- Menekan **Mulai Pemantauan Area**.
- Menerima `Alert` ketika perangkat terdeteksi masuk atau keluar dari radius.

Fungsi jarak menggunakan rumus Haversine pada `utils/locationMath.mjs`. Pemantauan lokasi menggunakan `Location.watchPositionAsync()`.

### Batasan implementasi

Versi praktikum ini menggunakan geofencing **foreground** agar dapat didemonstrasikan melalui Expo Go. Pemantauan berlangsung selama halaman Peta terbuka dan subscription dihentikan saat halaman ditinggalkan.

Geofencing native di latar belakang memerlukan `TaskManager`, izin background location, konfigurasi native, dan development build. Pemantauan latar belakang tidak diaktifkan pada ZIP ini; aplikasi tidak mengklaim memantau lokasi ketika ditutup.

## C. Battery Optimization

- Menggunakan `Location.Accuracy.Balanced`, bukan akurasi maksimum sepanjang waktu.
- Update pemantauan dibatasi minimal 10 detik (`timeInterval: 10000`).
- Update berbasis jarak minimum 25 meter (`distanceInterval: 25`).
- Reverse geocoding dilakukan hanya ketika diminta pengguna.
- Subscription lokasi dibersihkan ketika pemantauan dihentikan atau halaman Peta dilepas.
- Pengguna dapat menghentikan pemantauan kapan saja.
- Pusat geofence dan radius disimpan di AsyncStorage sehingga tidak perlu diatur ulang setiap kali halaman Peta dibuka.
- Sampel dengan akurasi GPS lebih buruk dari 100 meter diabaikan.
- Batas geofence memakai toleransi (hysteresis) untuk mengurangi notifikasi berulang ketika GPS bergeser sedikit.

## Checklist demo

- [ ] Koordinat GPS dapat diterjemahkan menjadi alamat.
- [ ] Pusat geofence dapat ditentukan melalui peta.
- [ ] Radius area dapat dipilih.
- [ ] Status di dalam/di luar area ditampilkan.
- [ ] Alert muncul ketika terjadi perubahan masuk/keluar area.
- [ ] Pemantauan dapat dihentikan.
- [ ] Subscription berhenti saat halaman Peta ditinggalkan.
- [ ] Pengaturan akurasi, interval, dan jarak update dapat dijelaskan.
- [ ] Pusat dan radius geofence tetap tersimpan setelah berpindah halaman.
- [ ] Sampel GPS berakurasi rendah tidak memicu transisi area.
