# Week 7 Task 02 — Real-time Table Stability Dashboard

Modul visualisasi real-time stabilitas permukaan meja pada fitur "Jaga Meja" TemuKampus.

## Tanggung Jawab Anggota 2

1. **Komponen Visualisasi `SensorDashboard.js`**:
   - Membangun antarmuka visual dengan judul *"Pemantau Stabilitas Meja (Real-time)"*.
   - Menyediakan 3 kartu sumbu independen dengan kode warna:
     - **Sumbu X**: Kiri - Kanan (`#DC2626` / Merah)
     - **Sumbu Y**: Maju - Mundur (`#15803D` / Hijau)
     - **Sumbu Z**: Gravitasi Vertikal (`#2563EB` / Biru)
   - Nilai percepatan disajikan dalam satuan **m/s²** (dikonversi langsung dari data accelerometer hook `useAccelerometer` menggunakan konstanta gravitasi `9.80665 m/s²`).

2. **Grafik Riwayat Real-Time**:
   - Menampilkan visualisasi riwayat **24 sampel terakhir** dalam bentuk chart titik responsif.
   - Menggunakan rentang skala visual **±20 m/s²**.
   - Memungkinkan pengguna membedakan:
     - **Kondisi meja tenang**: Garis titik mendatar stabil pada gravitasi bumi (~9.8 m/s² pada sumbu Z, ~0 m/s² pada sumbu X & Y).
     - **Kondisi meja terguncang / tersenggol**: Lonjakan titik ekstrem dan fluktuasi tajam pada sumbu X, Y, maupun Z.

3. **Integrasi ke `SensorScreen.js`**:
   - Menghubungkan `SensorDashboard` ke dalam alur kontrol `SensorScreen.js`.
   - Menjamin riwayat sampel otomatis di-reset (`[]`) dan nilai sumbu kembali ke status kosong (`—`) saat sensor dinonaktifkan (`active = false`).

## Panduan Pengujian Manual

1. Buka aplikasi TemuKampus, navigasikan ke menu **Jaga Meja** (Tab Pengaman / Sensor).
2. Tekan tombol **Aktifkan Pengaman Meja**.
3. Letakkan ponsel di atas meja yang tenang:
   - Amati sumbu Z stabil di kisaran `~9.8 m/s²`.
   - Sumbu X dan Y berada di kisaran `~0.0 m/s²`.
   - Grafik 24 sampel menunjukkan garis titik horizontal stabil.
4. Goyangkan atau senggol meja/ponsel:
   - Nilai sumbu X, Y, Z berubah dinamis secara instan.
   - Grafik titik melonjak merefleksikan getaran.
5. Tekan **Matikan Pengaman Meja**:
   - Nilai pada kartu kembali menampilkan `—`.
   - Riwayat grafik titik ter-reset dan menampilkan pesan panduan aktivasi.
