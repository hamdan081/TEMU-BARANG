# TemuKampus — Aplikasi Pelaporan Barang Hilang dan Temuan

TemuKampus membantu mahasiswa melaporkan barang hilang, melaporkan barang yang ditemukan, melihat daftar barang, memverifikasi kepemilikan, dan memantau proses pengembalian barang. Project menggunakan React Native + Expo dan backend REST API Node.js.

## Menjalankan aplikasi

1. Install Node.js LTS dan buka folder project di terminal.
2. Jalankan `npm install`.
3. Jalankan `npm run dev`. Perintah ini menyalakan backend pada port `4000` dan Expo Metro.
4. Pastikan laptop dan smartphone berada pada jaringan Wi-Fi yang sama.
5. Buka Expo Go pada smartphone dan scan QR code dari terminal.
6. Jika server tidak terdeteksi otomatis, buka Pengaturan API di aplikasi dan isi alamat LAN laptop, misalnya `http://192.168.1.5:4000`. Jangan gunakan `localhost` dari smartphone.

Akun demo lokal: `demo@kampus.ac.id` / `Demo123!`. Gunakan hanya untuk pengujian lokal.

## Penerapan asynchronous Week 8 pada TemuKampus

Materi asynchronous diterapkan pada alur laporan barang. Tidak ada Todo List generik atau daftar tugas kuliah. Konsep daftar tugas disesuaikan menjadi fitur **Tindak Lanjut Laporan**, yaitu daftar laporan yang masih perlu diperhatikan oleh pelapor atau pengguna.

- **GET** `GET /barang`: mengambil daftar laporan barang dari backend. Pemanggilan awal dilakukan setelah sesi pengguna pulih melalui `useEffect`.
- **Loading Indicator**: `ActivityIndicator` muncul ketika daftar laporan sedang dimuat atau request sedang diproses.
- **POST** `POST /barang`: mengirim laporan barang hilang atau barang ditemukan melalui formulir Lapor Barang.
- **PATCH** `PATCH /barang/:id/status`: pelapor mengonfirmasi barang sudah diterima setelah ciri khusus berhasil diverifikasi.
- **Error Handling**: operasi asynchronous memakai `async/await`, `try/catch`, pesan kesalahan, dan `Alert` pada kegagalan pengiriman, verifikasi, atau konfirmasi pengembalian.
- **Refresh**: tombol muat ulang di Beranda, Daftar Barang, dan Tindak Lanjut serta pull-to-refresh memanggil GET kembali.

### Pemisahan jenis laporan dan status penanganan

`jenisLaporan` menjelaskan jenis informasi yang dibuat pengguna, sedangkan `status` menunjukkan perkembangan proses penanganannya.

| Jenis laporan | Status awal | Makna |
|---|---|---|
| Hilang | Belum Ditemukan | Laporan kehilangan sudah masuk dan menunggu kecocokan barang temuan |
| Ditemukan | Menunggu Pemilik | Barang temuan sudah dilaporkan dan menunggu pemilik mengenali ciri khusus |

Setelah verifikasi ciri khusus berhasil, status berubah menjadi **Menunggu Pengambilan**. Setelah pelapor mengonfirmasi barang benar-benar sudah diterima, status berubah menjadi **Selesai Dikembalikan**.

### Fitur Tindak Lanjut Laporan

Halaman Tindak Lanjut menampilkan laporan aktif dan saran tindakan yang sesuai konteksnya, misalnya memantau laporan kehilangan, memeriksa kecocokan barang temuan, atau mengonfirmasi pengembalian. Daftar ini dibentuk dari data laporan API (GET), bukan tabel Todo terpisah. Tindakan konfirmasi menggunakan PATCH.

## Pengujian

```bash
npm run test:week8
npm run test:week7
npm run test:api
```

`test:week8` menguji alur GET, POST, verifikasi, PATCH status penanganan, refresh, dan respons error pada REST API barang. Pengujian tersebut tidak menggantikan uji UI langsung melalui Expo Go.

## Catatan migrasi data

Saat backend dimulai, status lama dinormalisasi secara otomatis:

- `Hilang` menjadi jenis laporan `Hilang` dengan status `Belum Ditemukan`.
- `Ditemukan` menjadi jenis laporan `Ditemukan` dengan status `Menunggu Pemilik`.
- `Dikembalikan` menjadi status `Selesai Dikembalikan`.
- Laporan lama yang sudah `Terverifikasi` tetapi belum selesai menjadi `Menunggu Pengambilan`.

Backend menyimpan data lokal di `server/data/` dan membuat folder tersebut saat dijalankan. File `.env` berisi alamat API lokal dan tidak disertakan; script `npm run dev` mencoba mendeteksi IP LAN serta membuat `.env` otomatis.
