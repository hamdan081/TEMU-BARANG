# Pembagian Kolaborasi GitHub — TemuBarang Week 10 dan penyempurnaan integrasi

Repository: https://github.com/hamdan081/TEMU-BARANG

Setiap anggota mengerjakan branch sendiri, menggunakan akun GitHub masing-masing, membuat Pull Request ke `main`, dan tidak melakukan force push.

## Orang 1 — Task 01: GPS dan pemilihan titik lokasi

Branch: `week10/anggota-1-gps-picker`

- Meminta izin lokasi foreground.
- Mengambil latitude, longitude, dan accuracy.
- Menambahkan pemilih titik manual untuk lokasi kejadian sebelumnya.
- Menghapus koordinat lama jika lokasi teks diubah manual.

File utama: `services/location.js`, `components/ReportLocationPicker.js`, `App.js`, `models/Barang.js`.

Commit: `feat(week10): add GPS and manual report location picker`

## Orang 2 — Task 02: Map dan navigasi

Branch: `week10/anggota-2-map-navigation`

- Menampilkan MapView dan marker laporan.
- Menampilkan lokasi perangkat.
- Menampilkan label lokasi perkiraan untuk pengguna yang tidak berhak melihat koordinat presisi.
- Merapikan BottomNav menjadi lima menu utama dan menempatkan fitur pendukung pada Menu Lainnya.

File utama: `components/LocationScreen.js`, `components/BottomNav.js`, `App.js`, `models/Barang.js`.

Commit: `feat(week10): refine map privacy and mobile navigation`

## Orang 3 — Task 03: Reverse Geocoding, Geofencing, dan optimasi

Branch: `week10/anggota-3-geofence-optimization`

- Reverse Geocoding sesuai permintaan pengguna.
- Geofencing foreground dengan filter akurasi dan hysteresis.
- Menyimpan pusat/radius area menggunakan AsyncStorage.
- Menghentikan subscription saat halaman Peta ditinggalkan.
- Menambah pengujian fungsi jarak dan geofence.

File utama: `services/location.js`, `components/LocationScreen.js`, `utils/locationMath.mjs`, `tests/week10.location.test.mjs`, `docs/week10/`.

Commit: `feat(week10): persist and optimize foreground geofencing`

## Urutan

1. Orang 1 membuat PR dan merge.
2. Orang 2 mengambil `main` terbaru, lalu mengerjakan Task 02.
3. Orang 3 mengambil `main` terbaru, lalu mengerjakan Task 03.
4. Koordinator menguji GPS, pemilihan titik, peta, reverse geocoding, dan geofence pada smartphone.

```bash
git checkout main
git pull origin main
git checkout -b week10/nama-branch
git add <file-yang-diubah>
git commit -m "pesan commit sesuai tugas"
git push -u origin week10/nama-branch
```

Jangan commit `.env`, `server/data/`, `node_modules`, API key, token, password, atau credential.
