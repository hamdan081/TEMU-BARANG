# Week 7 Task 02 — Display Sensor Data

Tujuan: menampilkan nilai accelerometer **X, Y, Z secara real-time** di halaman TemuKampus.

## Implementasi

- `components/sensors/SensorDashboard.js` menampilkan tiga kartu data dengan warna berbeda: X (merah), Y (hijau), dan Z (biru).
- Nilai dibaca langsung dari `useAccelerometer()` pada Task 01, bukan angka contoh atau respons REST API.
- Setiap pembacaan mengubah `state` React Native sehingga UI ikut berubah otomatis.
- Panel riwayat menggunakan 24 sampel terakhir sebagai grafik titik sederhana; rentang visual ±20 m/s² dan nilai di luar rentang dibatasi pada tepi grafik.
- Saat sensor berhenti, riwayat dibersihkan dan tampilan menampilkan tanda `—`.

## Pengujian manual

1. Login, buka **Sensor**, lalu tekan **Mulai Sensor**.
2. Perhatikan nilai X/Y/Z pada kartu; gerakkan dan putar perangkat untuk memastikan angka berubah.
3. Perhatikan riwayat titik pada panel di bawah kartu. Tutup sensor; nilai dan grafik seharusnya ter-reset.
4. Bandingkan output console Task 01 dengan nilai pada UI Task 02 (keduanya m/s²).

> Grafik adalah visualisasi tambahan agar perubahan real-time mudah diamati; target minimum pada materi ialah nilai X/Y/Z muncul di UI.
