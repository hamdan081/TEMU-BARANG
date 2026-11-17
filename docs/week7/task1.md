# Week 7 Task 01 — Connect TemuBarang to Sensor (Pengaman Meja)

Tujuan: aplikasi TemuBarang membaca nilai **X, Y, Z accelerometer** menggunakan `expo-sensors`, mengintegrasikannya ke Menu Lainnya > **Pengaman Meja** (Anti-Theft Table Guard), lalu menampilkan nilainya pada console dan halaman aplikasi secara aman.

## Implementasi Anggota 1

- `expo-sensors` dipasang untuk proyek Expo SDK yang aktif.
- `hooks/useAccelerometer.js` meminta izin melalui tombol **Aktifkan Pengaman Meja**, memeriksa ketersediaan sensor, menjalankan `Accelerometer.addListener`, dan menghapus listener saat berhenti atau halaman ditutup.
- `components/sensors/SensorScreen.js` menyediakan layar **Pengaman Meja & Sensor Gerak** yang dibuka melalui Menu Lainnya; navigasi utama tetap ringkas.
- Interval pembaruan **200 ms** (5 sampel/detik) untuk mengurangi beban sensor dan baterai. Logging console dibatasi maksimal sekali per detik. Expo memberikan nilai dalam **g**; UI dan console menampilkan **m/s²** setelah dikalikan 9,80665.
- Bila izin ditolak atau perangkat tidak memiliki accelerometer, antarmuka memberikan pesan ramah pengguna tanpa membuat aplikasi crash.

## Pengujian Manual

1. Jalankan `npm run dev` (atau `npm run start`), kemudian buka aplikasi di ponsel fisik melalui Expo Go.
2. Masuk ke aplikasi TemuBarang, buka Menu Lainnya lalu pilih **Pengaman Meja** (🛡️), kemudian tekan **Aktifkan Pengaman Meja**.
3. Setujui permintaan izin jika ditampilkan. Perhatikan log Metro (`[Week 7 / Accelerometer] ...`).
4. Gerakkan ponsel dan pastikan nilai accelerometer merespons; tekan **Matikan Pengaman Meja** untuk menghentikan pembacaan.
5. Pindah ke halaman lain (Beranda/Daftar) untuk memastikan listener dibersihkan dengan benar.
