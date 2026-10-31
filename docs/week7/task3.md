# Week 7 Task 03 — Sensor Interaction

Tujuan: mendeteksi gerakan perangkat berdasarkan accelerometer, menghasilkan feedback getaran, dan mengganti status di antarmuka TemuKampus.

## Implementasi

- `utils/shakeMotion.mjs`: menghitung perubahan percepatan (`Δx, Δy, Δz`) dalam satuan **g** antarsampel.
- `hooks/useShakeDetection.js`: gerakan terdeteksi jika besar perubahan mencapai **0,85 g**, dengan cooldown **2 detik**. Metode selisih dipakai agar gravitasi ~1 g saat ponsel diam tidak otomatis memicu shake.
- `Vibration.vibrate(300)` dipanggil ketika perangkat fisik mendukung getaran; web hanya menampilkan feedback visual.
- `components/sensors/SensorInteraction.js`: status **Siap mendeteksi gerakan** atau **Goyang Terdeteksi!**, serta penghitung jumlah gerakan.
- Setelah sekitar 1,6 detik, status kembali ke keadaan siap. Listener sensor tetap berasal dari Task 01 sehingga tidak ada subscription ganda.

## Pengujian

1. Jalankan `npm run test:week7` untuk pengujian fungsi threshold tanpa perangkat.
2. Buka TemuKampus di ponsel fisik, login, lalu pilih tab **Sensor** dan tekan **Mulai Sensor**.
3. Goyangkan ponsel. Status berubah menjadi **Goyang Terdeteksi!** dan ponsel bergetar selama 300 ms (apabila perangkat mendukung).
4. Pastikan penghitung bertambah dan tidak ada getaran beruntun dalam waktu kurang dari 2 detik.
5. Tekan **Hentikan Sensor**, lalu pastikan status kembali nonaktif dan tidak ada deteksi baru.

> Threshold adalah parameter praktikum yang dapat disesuaikan dengan sensitivitas perangkat. Pengujian getaran sebenarnya harus dilakukan secara manual pada ponsel.
