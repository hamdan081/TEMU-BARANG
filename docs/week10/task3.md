# Week 10 — Task 03: Location Intelligence & Battery Optimization

Dokumen ini menjelaskan implementasi **Task 03 Week 10: Location Intelligence** pada aplikasi **TemuBarang**, mencakup **Reverse Geocoding**, **Geofencing**, dan **Location Battery Optimization**.

---

## A. Tujuan Pekerjaan

1. Menerapkan **Location Intelligence** sesuai materi perkuliahan Week 10:
   - **Reverse Geocoding**: Mengubah koordinat GPS (Latitude dan Longitude) menjadi alamat teks yang dapat dibaca manusia.
   - **Geofencing**: Memantau area geografis virtual di sekitar lingkungan kampus untuk mendeteksi peristiwa masuk (*Enter Event*) dan keluar (*Exit Event*).
2. Menerapkan **Location Battery Optimization** sebagai materi pendukung:
   - Pengaturan interval waktu dan jarak minimum pembaruan lokasi.
   - Pemilihan tingkat akurasi yang seimbang (*Balanced*).
   - Pembersihan *subscription listener* saat tidak digunakan atau saat komponen di-*unmount*.
   - Filter sampel GPS berakurasi rendah (*accuracy threshold*).
   - Toleransi batas radius (*hysteresis buffer*) untuk meredam *drift* GPS.
   - Penjelasan komprehensif perbedaan *foreground* dan *background tracking*.
3. Mengintegrasikan seluruh fitur secara harmonis dengan **Task 01 (GPS Location)** dan **Task 02 (Map View Integration)** tanpa duplikasi kode.

---

## B. Reverse Geocoding

### 1. Konsep & Arsitektur
Reverse Geocoding adalah proses komputasi yang menerjemahkan pasangan koordinat geografis $(latitude, longitude)$ menjadi representasi alamat spasial berupa nama jalan, nomor bangunan, kelurahan/distrik, kota/kabupaten, provinsi, kode pos, hingga negara.

Pada TemuBarang, layanan ini disediakan secara terpusat melalui fungsi:
- `reverseGeocodeCoordinates({ latitude, longitude })` pada `services/location.js`
- `formatGeocodedAddress(place)` pada `utils/locationMath.mjs` (dan diekspor ulang oleh `services/location.js`)

### 2. Alur Kerja Reverse Geocoding
1. **Validasi Koordinat**: Koordinat diperiksa menggunakan `hasValidCoordinates` (Latitude antara -90° s/d 90°, Longitude antara -180° s/d 180°, bukan `null`/`NaN`).
2. **Pemanggilan API**: Memanggil `Location.reverseGeocodeAsync({ latitude, longitude })` dari *library* `expo-location`.
3. **Penyusunan Alamat Terstruktur**: Komponen alamat diformat dan digabungkan secara unik (`joinUniqueAddressParts`) untuk mencegah redundansi (misalnya kota dan kabupaten dengan nama identik).
4. **Penanganan Kasus Alamat Tidak Ditemukan**: Jika hasil geocoding berupa array kosong atau tidak memiliki komponen alamat yang valid, sistem mengembalikan *warning* eksplisit: `"Alamat tidak ditemukan untuk koordinat tersebut."`
5. **Loading & Error Handling**:
   - Selama proses berjalan, antarmuka menampilkan `ActivityIndicator` dan teks *"Menerjemahkan koordinat ke alamat..."*.
   - Jika koneksi jaringan gagal atau koordinat di luar jangkauan peta, sistem menampilkan pesan *error* yang ramah pengguna tanpa menyebabkan aplikasi *crash*.

### 3. Pengujian Contoh Dosen
- **Input Koordinat**:
  - Latitude: `-7.9666`
  - Longitude: `112.6326`
- **Output Hasil Reverse Geocoding**:
  - Alamat Terbaca: `Jl. Mayjend Panjaitan / Jl. Veteran, Klojen / Lowokwaru, Kota Malang, Jawa Timur, Indonesia`
  - Hasil dapat langsung diaplikasikan sebagai pusat area pantauan geofence dengan satu ketukan tombol.

### 4. Integrasi pada Aplikasi TemuBarang
- **Kartu Interaktif Reverse Geocoding** (`components/LocationScreen.js`): Pengguna dapat memilih preset *"Contoh Dosen (-7.9666, 112.6326)"*, *"GPS Pengguna"*, atau *"Titik Terpilih Peta"*, lalu menekan tombol konversi alamat.
- **Formulir Lapor Barang** (`App.js` & `components/ReportLocationPicker.js`): Saat pengguna menekan *"Ambil Lokasi GPS"* atau memilih titik kejadian pada peta, alamat otomatis terisi ke kolom teks lokasi laporan.

---

## C. Geofencing (Area Pantauan Kampus)

### 1. Konsep & Kasus Penggunaan TemuBarang
Geofencing adalah pembatasan perimeter geografis virtual di sekitar titik koordinat tertentu dengan radius melingkar. Dalam aplikasi TemuBarang, fitur ini digunakan untuk **Area Pantauan Barang Kampus**, misalnya:
- Memberitahu mahasiswa ketika mereka memasuki zona kampus tempat mereka sering kehilangan atau menitipkan barang.
- Memberikan pengingat visual ketika meninggalkan zona pantauan kampus.

### 2. Penentuan Area & Radius Pantauan
Pengguna memiliki fleksibilitas tinggi dalam menentukan pusat area pantauan:
1. **Preset Zona Kampus TemuBarang**:
   - *Rektorat & Kampus Pusat* (`-7.9666, 112.6326`, radius default 300m)
   - *Perpustakaan Pusat* (`-7.9655, 112.6311`, radius default 150m)
   - *Gedung Informatika & Lab Komputer* (`-7.9648, 112.6335`, radius default 150m)
   - *Gedung Kuliah Bersama (GKB)* (`-7.9675, 112.6340`, radius default 300m)
2. **Titik Koordinat GPS Terkini**: Tombol *"Gunakan Lokasi GPS Saya sebagai Pusat"*.
3. **Titik Bebas pada Peta**: Tekan lama (*long press*) pada titik mana pun di peta interaktif.
4. **Hasil Reverse Geocoding**: Tombol *"Jadikan Pusat Area Geofence"*.
5. **Pilihan Radius**: Chip pilihan instan `100 m`, `150 m`, `300 m`, dan `500 m`. Visualisasi lingkaran ungu transparan (`Circle`) langsung diperbarui secara *real time* di peta.
6. **Persistensi Data**: Pengaturan pusat area dan radius disimpan ke `AsyncStorage` (`temubarang.geofence.settings.v1.<userId>`), sehingga tetap tersimpan saat pengguna keluar-masuk tab atau me-*restart* aplikasi.

### 3. Rumus Haversine & Deteksi Transisi
Jarak antara posisi perangkat pengguna $P_1(\phi_1, \lambda_1)$ dan pusat geofence $P_2(\phi_2, \lambda_2)$ dihitung menggunakan rumus **Haversine** murni di `utils/locationMath.mjs`:

$$\Delta\phi = \frac{(\phi_2 - \phi_1) \cdot \pi}{180}, \quad \Delta\lambda = \frac{(\lambda_2 - \lambda_1) \cdot \pi}{180}$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\left(\frac{\phi_1 \cdot \pi}{180}\right) \cos\left(\frac{\phi_2 \cdot \pi}{180}\right) \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$d = 2 \cdot R \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right) \quad (R = 6.371.000\text{ m})$$

### 4. Enter Event & Exit Event dengan Hysteresis Buffer
Untuk mencegah alarm palsu (*bouncing/flapping*) akibat fluktuasi sinyal GPS (*jitter*) ketika pengguna berada persis di garis batas radius:
- **Toleransi Hysteresis** ($\delta$): Ditetapkan antara 10 s/d 25 meter ($\delta = \max(10, \min(25, \text{radius} \times 0.1))$).
- **Deteksi Enter Event**: Terjadi jika status sebelumnya di luar area (`wasInside = false`) dan jarak $d \le (\text{radius} - \delta)$.
- **Deteksi Exit Event**: Terjadi jika status sebelumnya di dalam area (`wasInside = true`) dan jarak $d > (\text{radius} + \delta)$.
- **Feedback & Notifikasi Aktual**:
  - `Alert.alert('🔔 Memasuki Area Pantauan', ...)` ketika masuk.
  - `Alert.alert('⚠️ Keluar dari Area Pantauan', ...)` ketika keluar.
  - Badge status *live*: `● DI DALAM AREA` (hijau) atau `○ DI LUAR AREA` (merah).
  - Kotak riwayat log peristiwa dengan *timestamp* aktual.

### 5. Penanganan Izin Ditolak & GPS Tidak Aktif
Sebelum pemantauan dijalankan:
- `isLocationServiceEnabled()` memeriksa status sensor perangkat. Jika GPS mati, muncul peringatan: *"Layanan GPS/lokasi pada perangkat tidak aktif. Mohon aktifkan GPS perangkat Anda terlebih dahulu."*
- `Location.requestForegroundPermissionsAsync()` memeriksa izin lokasi. Jika ditolak, muncul peringatan: *"Izin lokasi diperlukan untuk memantau area..."*

### 6. Mode Simulasi Pengujian (Lab Demo)
Untuk mempermudah pengujian dosen dan asisten praktikum di dalam ruangan kelas tanpa harus berjalan keluar ratusan meter:
- Tombol **Simulasi Masuk (ENTER)**: Mensimulasikan posisi pengguna berpindah ke dalam radius (jarak ~40m dari pusat). Rumus Haversine dan transisi geofence dieksekusi secara nyata dan memicu Enter Alert.
- Tombol **Simulasi Keluar (EXIT)**: Mensimulasikan posisi pengguna berpindah ke luar radius (jarak ~450m dari pusat) dan memicu Exit Alert.

---

## D. Location Battery Optimization

Penggunaan sensor GPS tanpa optimasi adalah salah satu penyebab utama borosnya baterai (*battery drain*) pada aplikasi *mobile*. Pada Week 10 ini, TemuBarang menerapkan 6 pilar optimasi daya baterai:

| No | Pilar Optimasi | Penerapan pada TemuBarang | Alasan & Manfaat Daya |
|---|---|---|---|
| 1 | **Tingkat Akurasi** | `Location.Accuracy.Balanced` | Menghindari penggunaan modul GPS daya tinggi (*High/BestForNavigation*) secara berlebihan; memadukan Wi-Fi, Cell Tower, dan GPS secara seimbang. |
| 2 | **Interval Pembaruan** | `timeInterval: 10000` (10 detik) | Membatasi polling lokasi maksimal satu kali setiap 10 detik. |
| 3 | **Filter Jarak Minimum** | `distanceInterval: 25` (25 meter) | GPS tidak memicu *callback* jika perangkat stasioner/diam di tempat, menghemat siklus CPU. |
| 4 | **Filter Sinyal Rendah** | Akurasi $> 100\text{ m}$ diabaikan | Mengabaikan bacaan GPS yang tidak akurat, mencegah *wake-lock* komputasi sia-sia. |
| 5 | **Hysteresis Buffer** | $10\text{ m} - 25\text{ m}$ batas perbatasan | Menghilangkan *flapping alert* berulang-ulang di garis batas akibat *drift* satelit. |
| 6 | **Pembersihan Listener** | `watchRef.current.remove()` | Listener dihentikan seketika saat tombol Stop ditekan atau saat berpindah tab/halaman (*component unmount*). |

### Perbedaan Foreground Tracking vs Background Tracking

```
+-------------------------------------------------------------------------+
|                  FOREGROUND TRACKING (Dipakai di Praktikum)             |
+-------------------------------------------------------------------------+
| • Berjalan HANYA saat aplikasi aktif di layar pengguna.                |
| • Menggunakan izin aman: requestForegroundPermissionsAsync.              |
| • Sangat hemat baterai karena GPS mati total saat tab ditinggalkan.      |
| • Kompatibel penuh dengan Expo Go tanpa build native khusus.             |
+-------------------------------------------------------------------------+
                                    VS
+-------------------------------------------------------------------------+
|                    BACKGROUND TRACKING (Materi Teori)                   |
+-------------------------------------------------------------------------+
| • Memantau koordinat terus-menerus meskipun aplikasi diminimalkan/tutup. |
| • Membutuhkan TaskManager dan izin invasif: ACCESS_BACKGROUND_LOCATION.  |
| • Berpotensi menguras baterai drastis akibat CPU wake-lock konstan.     |
| • Memerlukan konfigurasi native build (EAS / bare React Native).        |
| • Sangat ketat diawasi oleh Google Play Store & Apple App Store.        |
+-------------------------------------------------------------------------+
```

---

## E. Integrasi Task 01, Task 02, dan Task 03

- **Task 01 (GPS Service)**: Fungsi `getGPSCoordinates` dan `getCurrentLocationWithAddress` menjadi fondasi data koordinat bagi Task 02 dan Task 03.
- **Task 02 (Interactive Map)**: Peta menampilkan marker GPS pengguna (biru), marker barang hilang (merah), marker barang temuan (hijau), dan visualisasi lingkaran radius Geofence (ungu).
- **Task 03 (Intelligence)**: Mengolah koordinat dari Task 01 dan Task 02 untuk diterjemahkan menjadi alamat manusia (*Reverse Geocoding*) dan dihitung batas perimeter spasialnya (*Geofencing*).
- **Bebas Duplikasi**: Semua rumus spasial dan kalkulasi jarak disatukan di `utils/locationMath.mjs` sehingga dapat digunakan baik di *runtime* aplikasi maupun di *unit testing*.

---

## F. Checklist Pengujian & Kriteria Keberhasilan

- [x] **Reverse Geocoding**: Koordinat GPS berhasil diterjemahkan menjadi alamat lengkap yang dapat dibaca.
- [x] **Koordinat Contoh Dosen**: Evaluasi `Lat: -7.9666, Lng: 112.6326` sukses menghasilkan alamat di Kota Malang.
- [x] **Penanganan Alamat Tidak Ditemukan**: Menampilkan pesan peringatan informatif tanpa menyebabkan *crash*.
- [x] **Pusat Geofence**: Dapat dipilih melalui preset kampus, GPS pengguna, titik peta (*long press*), atau hasil Reverse Geocoding.
- [x] **Radius Area**: Pengguna dapat memilih radius 100m, 150m, 300m, atau 500m secara dinamis.
- [x] **Deteksi Enter Event**: Sistem mendeteksi perangkat masuk ke area pantauan dan menampilkan `Alert`.
- [x] **Deteksi Exit Event**: Sistem mendeteksi perangkat keluar dari area pantauan dan menampilkan `Alert`.
- [x] **Hysteresis Buffer**: Toleransi 10–25m berhasil mencegah *flapping alert* di perbatasan radius.
- [x] **Location Battery Optimization**: Akurasi *Balanced*, interval 10 detik, *distanceFilter* 25m, filter akurasi $>100\text{ m}$.
- [x] **Pembersihan Listener**: Subscription otomatis dibersihkan saat pemantauan dihentikan atau halaman dilepas.
- [x] **Integrasi Utuh**: Fitur Task 01 (GPS) dan Task 02 (Map) tetap berfungsi 100% normal.
- [x] **Unit Test Suite**: 9 unit test di `tests/week10.location.test.mjs` lulus 100% tanpa kegagalan.
