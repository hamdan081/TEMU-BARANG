# TemuBarang UI Redesign — Modern Premium / Balanced

## Tujuan

Menyatukan tampilan TemuBarang menjadi aplikasi layanan kampus yang modern, bersih, mudah dipindai, dan konsisten. Redesign berfokus pada presentasi; alur bisnis, API, model data, database, autentikasi, navigasi tujuan, sensor, dan fitur lokasi dipertahankan.

## Design system

- Primary: `#1D5FAF`; dark primary: `#174B8B`; soft primary: `#EAF2FF`.
- Background: `#F5F7FB`; surface: `#FFFFFF`; border: `#E4EAF2`.
- Text: `#17263C`; muted: `#68778C`.
- Success: `#13845D`; danger: `#B9384B`; warning: `#A66B16`.
- Radius: 10 / 14 / 18 / 22 dp; control minimum height: approximately 44–50 dp.
- Icon family: Ionicons via the already declared `@expo/vector-icons` dependency.
- Layout: balanced spacing, responsive widths, restrained borders/shadows, and consistent badges.

## Area yang diperbarui

| Area | File |
|---|---|
| Design tokens | `theme.js` |
| Header | `components/Header.js` |
| Search | `components/SearchBar.js` |
| Action cards | `components/ActionMenu.js` |
| Category grid | `components/CategoryList.js` |
| Latest reports | `components/LatestItems.js` |
| Report cards | `components/ItemCard.js` |
| Bottom navigation | `components/BottomNav.js` |
| Shared screen, form, detail, auth, modal, status, and profile styles | `App.js` |
| Map and geofence screen | `components/LocationScreen.js` |
| Manual location picker | `components/ReportLocationPicker.js` |
| Sensor control screen | `components/sensors/SensorScreen.js` |
| Sensor dashboard | `components/sensors/SensorDashboard.js` |
| Motion alarm panel | `components/sensors/SensorInteraction.js` |

## Perilaku yang dipertahankan

- Navigasi utama: Beranda, Daftar, Lapor, Peta, Lainnya.
- Menu Lainnya tetap membuka Tindak Lanjut Laporan, Pengaman Meja, dan Profil.
- Jenis laporan, status penanganan, pencocokan, klaim, konfirmasi pengembalian, edit/hapus, dan moderasi laporan tidak diubah.
- REST API, JWT/session, SecureStore, AsyncStorage, database JSON, upload foto, dan konfigurasi server tidak diubah.
- GPS, reverse geocoding, marker peta, geofencing foreground, dan sensor tetap menggunakan implementasi sebelumnya.

## Verifikasi

- Pemeriksaan sintaks/transpilasi dilakukan pada file JavaScript/MJS.
- Test matching, Week 7 sensor, dan Week 10 location dijalankan terpisah.
- Test Week 9 dan server memerlukan dependency project terpasang; jika `multer` belum ada, jalankan `npm install` sebelum `npm run test:all`.
- Tampilan akhir tetap perlu diuji melalui Expo Go pada ukuran layar perangkat yang digunakan.
