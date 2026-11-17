# Peta Kesesuaian Materi Dosen — TemuBarang

Urutan yang digunakan adalah sembilan modul yang diberikan dosen: Week 1–7, Week 9, dan Week 10. Tidak ada file/modul resmi Week 8 pada urutan ini.

| Minggu | Fokus pada materi dosen | Penerapan di TemuBarang | File utama |
|---|---|---|---|
| 1 | Course Orientation & Project Kickoff: pengguna, masalah, solusi, Product Canvas, tim, workflow, GitHub | Product Canvas aplikasi pelaporan barang hilang/temuan, backlog, siklus sprint, dokumentasi kontribusi | `docs/week1/project-kickoff.md`, `README.md` |
| 2 | React Native + Expo Go, Mobile UI, Responsive/Adaptive Layout, Inclusive Design & Accessibility | Komponen React Native, layout Flexbox, `useWindowDimensions`, portrait/landscape, label dan role aksesibilitas | `App.js`, `components/`, `app.json`, `docs/week2/responsive-accessibility.md` |
| 3 | Authentication & Local Data Security | Register/login, validasi credential, SecureStore untuk token, AsyncStorage untuk preferensi, logout | `App.js`, `services/api.js`, `storage/session.js`, `server/server.js` |
| 4 | Data Modeling + RESTful API | Model/DTO Barang, JSON, GET/POST/PATCH/DELETE, client-server | `models/Barang.js`, `services/api.js`, `server/server.js`, `docs/week4/` |
| 5 | Secure API: token authentication, attach token, protect session | JWT access/refresh token, Bearer header, protected endpoint, refresh/rotation, logout | `services/api.js`, `storage/session.js`, `server/server.js`, `docs/week5/` |
| 6 | Reliable API: error handling, loading/error/retry, offline | ApiError, HTTP/network/timeout handling, ActivityIndicator, retry, NetInfo/offline feedback | `services/api.js`, `App.js`, `docs/week6/` |
| 7 | Device Sensor: accelerometer/gyroscope concepts, sensor data and interaction | Accelerometer X/Y/Z, real-time display, shake detection, vibration feedback | `hooks/useAccelerometer.js`, `hooks/useShakeDetection.js`, `components/sensors/`, `docs/week7/` |
| 9 | Asynchronous Programming: GET, Loading, POST, PATCH, Error Handling, Refresh | GET laporan, ActivityIndicator, POST laporan, PATCH pengembalian, try/catch/Alert, refresh dan request cancellation | `App.js`, `services/api.js`, `server/server.js`, `docs/week9/` |
| 10 | Location-Based Services: GPS, Map, Reverse Geocoding, Geofencing, Battery Optimization | Lokasi laporan, marker peta, reverse geocode, geofence foreground, optimasi update GPS | `services/location.js`, `components/LocationScreen.js`, `components/ReportLocationPicker.js`, `docs/week10/` |

## Catatan penilaian

- Tabel ini menunjukkan pemetaan implementasi source code, bukan klaim bahwa semua pengujian perangkat sudah lulus.
- Week 2 perlu diuji manual pada berbagai ukuran layar dan orientasi.
- Week 3/5 perlu diuji dengan skenario login, token, dan logout.
- Week 7 sensor perlu diuji pada smartphone fisik; accelerometer yang diimplementasikan, sementara gyroscope tercantum sebagai konsep pada materi.
- Week 9 integrasi server perlu diuji setelah dependency terpasang.
- Week 10 GPS, Map, dan Geofencing perlu diuji pada perangkat; Geofencing saat ini foreground-only.
