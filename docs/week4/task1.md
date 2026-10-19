# Week 4 Task 01 — Model The Data

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 1):** Hamdan (`hamdan081` / `hamdanjulfa698@gmail.com`)  
**Fokus:** Menentukan resource, struktur field, tipe data, implementasi Data Model / DTO (`models/Barang.js`), serta representasi JSON Object & Array.

---

## 1. Resource Utama: `Barang`

Resource utama pada aplikasi TemuKampus adalah **Barang**, yang merepresentasikan setiap item yang dilaporkan baik dalam status **Hilang** (*lost item*) maupun **Ditemukan** (*found item*) di area kampus.

### Tabel Spesifikasi Field & Tipe Data

| Field | Tipe Data | Nullable / Default | Deskripsi & Validasi |
|---|---|---|---|
| `id` | `Number` | Wajib (default `0`) | Identifikator unik barang (dihasilkan oleh database / server). |
| `nama` | `String` | Wajib (default `''`) | Nama barang singkat dan jelas (misal: "Dompet Kulit Hitam"). |
| `kategori` | `String` | Wajib (default `'Lainnya'`) | Salah satu dari kategori: `Elektronik`, `Dokumen`, `Pakaian`, `Aksesoris`, `Perlengkapan`, `Lainnya`. |
| `deskripsi` | `String` | Wajib (default `''`) | Penjelasan detail karakteristik, ciri-ciri, warna, atau isi barang. |
| `lokasi` | `String` | Wajib (default `''`) | Tempat barang hilang atau ditemukan (misal: "Perpustakaan Lt. 2"). |
| `tanggal` | `String` | Wajib (default `''`) | Tanggal kejadian dalam format `YYYY-MM-DD`. |
| `image` | `String` | Opsional (default `''`) | URL publik atau path relatif foto barang yang diunggah ke server. |
| `status` | `String` | Wajib (default `'Hilang'`) | Status barang: `'Hilang'`, `'Ditemukan'`, atau `'Dikembalikan'`. |
| `pelapor` | `String` | Wajib (default `''`) | Nama mahasiswa / sivitas kampus yang membuat laporan. |
| `ownerId` | `Number` | Opsional (default `0`) | ID akun user pelapor (relasi ke resource User). |
| `verificationStatus` | `String` | Opsional (default `'Belum diverifikasi'`) | Status verifikasi klaim kepemilikan: `'Belum diverifikasi'` atau `'Terverifikasi'`. |

---

## 2. Implementasi Model & DTO (`models/Barang.js`)

Implementasi model di [`models/Barang.js`](file:///c:/A%20PENTING/TUGAS%20SEMESTER%205/PEMROGRAMAN%20MOBILE/TemuKampus_Reaudit_Final/models/Barang.js) dirancang dengan pendekatan gabungan:
1. **Class-based OOP Model (`Barang`)**: Memiliki constructor dengan nilai default defensif, method serialisasi `toJSON()`, dan static factory `fromJSON(json)`.
2. **DTO Mapper Function (`mapBarang`)**: Memastikan data mentah dari API (`GET /barang` atau response `POST /barang`) memiliki tipe data yang konsisten (string sanitization, number conversion, null-safety) sebelum dikonsumsi oleh komponen UI (`FlatList`, `ItemCard`, dsb).
3. **Kategori Standar (`categories`)**: Ekspor daftar kategori resmi kampus untuk filter dan form pembuatan laporan.

---

## 3. Contoh Representasi JSON

### A. Contoh JSON Object — Barang Hilang

```json
{
  "id": 1,
  "nama": "Dompet Kulit Hitam",
  "kategori": "Aksesoris",
  "deskripsi": "Dompet hitam lipat dua dengan gantungan kartu dan sedikit jahitan lepas di sudut kiri.",
  "lokasi": "Gedung Kuliah Bersama A, Ruang 302",
  "tanggal": "2026-10-12",
  "image": "http://192.168.1.5:4000/uploads/dompet-hitam.jpg",
  "status": "Hilang",
  "pelapor": "Ahmad Fauzi",
  "ownerId": 1,
  "verificationStatus": "Belum diverifikasi"
}
```

### B. Contoh JSON Object — Barang Ditemukan

```json
{
  "id": 2,
  "nama": "Kunci Motor Honda Vario",
  "kategori": "Aksesoris",
  "deskripsi": "Kunci motor dengan gantungan berbentuk bintang warna biru dan remote alarm hitam.",
  "lokasi": "Area Parkir Motor Barat Dekat Pos Satpam",
  "tanggal": "2026-10-13",
  "image": "http://192.168.1.5:4000/uploads/kunci-motor.jpg",
  "status": "Ditemukan",
  "pelapor": "Budi Santoso (Petugas Parkir)",
  "ownerId": 2,
  "verificationStatus": "Belum diverifikasi"
}
```

### C. Contoh JSON Array — Kumpulan Laporan Barang (Hilang & Ditemukan)

```json
[
  {
    "id": 1,
    "nama": "Dompet Kulit Hitam",
    "kategori": "Aksesoris",
    "deskripsi": "Dompet hitam lipat dua dengan gantungan kartu dan sedikit jahitan lepas di sudut kiri.",
    "lokasi": "Gedung Kuliah Bersama A, Ruang 302",
    "tanggal": "2026-10-12",
    "image": "http://192.168.1.5:4000/uploads/dompet-hitam.jpg",
    "status": "Hilang",
    "pelapor": "Ahmad Fauzi",
    "ownerId": 1,
    "verificationStatus": "Belum diverifikasi"
  },
  {
    "id": 2,
    "nama": "Kunci Motor Honda Vario",
    "kategori": "Aksesoris",
    "deskripsi": "Kunci motor dengan gantungan berbentuk bintang warna biru dan remote alarm hitam.",
    "lokasi": "Area Parkir Motor Barat Dekat Pos Satpam",
    "tanggal": "2026-10-13",
    "image": "http://192.168.1.5:4000/uploads/kunci-motor.jpg",
    "status": "Ditemukan",
    "pelapor": "Budi Santoso (Petugas Parkir)",
    "ownerId": 2,
    "verificationStatus": "Belum diverifikasi"
  },
  {
    "id": 3,
    "nama": "Laptop ASUS Vivobook 14",
    "kategori": "Elektronik",
    "deskripsi": "Laptop warna abu-abu gelap dengan stiker GitHub di bagian belakang layar. Tertinggal di meja baca.",
    "lokasi": "Perpustakaan Pusat Lantai 2",
    "tanggal": "2026-10-14",
    "image": "http://192.168.1.5:4000/uploads/laptop-asus.jpg",
    "status": "Hilang",
    "pelapor": "Hamdan",
    "ownerId": 1,
    "verificationStatus": "Belum diverifikasi"
  },
  {
    "id": 4,
    "nama": "Kartu Tanda Mahasiswa (KTM)",
    "kategori": "Dokumen",
    "deskripsi": "KTM Program Studi Teknik Informatika atas nama Muhammad Rizky, ditemukan terselip di bangku taman.",
    "lokasi": "Taman Rektorat",
    "tanggal": "2026-10-15",
    "image": "",
    "status": "Ditemukan",
    "pelapor": "Siti Nurhaliza",
    "ownerId": 3,
    "verificationStatus": "Belum diverifikasi"
  },
  {
    "id": 5,
    "nama": "Jaket Bomber Hitam Kampus",
    "kategori": "Pakaian",
    "deskripsi": "Jaket bomber parasut warna hitam dengan bordir logo fakultas, tertinggal di kursi kantin.",
    "lokasi": "Kantin Utama Gedung B",
    "tanggal": "2026-10-16",
    "image": "",
    "status": "Dikembalikan",
    "pelapor": "Pengelola Kantin",
    "ownerId": 1,
    "verificationStatus": "Terverifikasi"
  }
]
```

---

## 4. Hasil Verifikasi & Pengujian Sintaks

1. **Uji Instance Class `Barang`**:
   - `Barang.fromJSON(...)` berhasil menginstansiasi objek `Barang`.
   - Method `toJSON()` menghasilkan objek murni yang siap diserialisasi.
2. **Uji DTO `mapBarang`**:
   - Berhasil memetakan input objek utuh.
   - Bersifat null-safe terhadap `null` dan `undefined` input (mengembalikan default empty strings/0 tanpa runtime error).
3. **Uji Konsumsi Backend (`server/server.test.js`)**:
   - Pengujian integrasi API berjalan sukses (`1 pass, 0 fail`).

---

## 5. Batas Pengerjaan & Handover

- **Tugas yang diselesaikan:** Week 4 Task 01 — Model The Data.
- **Tugas berikutnya:** Week 4 Task 02 — Connect to REST API (akan dilanjutkan oleh Orang 2: integrasi fetch HTTP, parsing JSON, mapping DTO di `services/api.js`).
