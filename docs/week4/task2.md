# Week 4 - Task 02: Connect to REST API

## Deskripsi Tugas

Menghubungkan Data Model Barang (Task 01) dengan REST API menggunakan HTTP Request (Fetch API), JSON parsing, dan data mapping ke Data Model Barang. Mengimplementasikan penanganan loading dan error pada setiap request.

---

## Endpoint API yang Digunakan

Server REST lokal berjalan di `http://<LAN-IP>:4000` (konfigurasi melalui `.env`).

| Method | Endpoint             | Auth         | Fungsi                                          |
|--------|----------------------|--------------|-------------------------------------------------|
| GET    | `/health`            | Publik       | Cek status server                               |
| POST   | `/auth/login`        | Publik       | Login, mendapatkan JWT token                    |
| POST   | `/auth/register`     | Publik       | Registrasi akun baru                            |
| GET    | `/barang`            | Bearer Token | **Ambil daftar barang (fokus utama Task 02)**   |
| GET    | `/barang/:id`        | Bearer Token | Ambil detail satu barang                        |
| POST   | `/barang`            | Bearer Token | Buat laporan barang baru                        |
| POST   | `/barang/:id/verify` | Bearer Token | Verifikasi ciri barang                          |
| PATCH  | `/barang/:id/status` | Bearer Token | Tandai barang dikembalikan                      |

---

## Fungsi fetchBarang()

Implementasi di `services/api.js` (baris 41-45):

```js
// Week 4: GET response JSON -> DTO Barang -> UI.
export const fetchBarang = async () => {
  const response = await request('/barang', { authenticated: true });
  if (!Array.isArray(response.data)) throw new ApiError('Format data API tidak sesuai.');
  return response.data.map(mapBarang);
};
```

Fungsi `request()` (basis semua HTTP call) menggunakan:
- **async/await** untuk non-blocking execution
- **try/catch** untuk menangkap network error, timeout, dan AbortError
- **Pemeriksaan status HTTP**: `if (!response.ok)` menangani 4xx/5xx
- **Timeout 15 detik** via `AbortController`
- **Bearer Token** otomatis dari SecureStore (`authenticated: true`)

---

## Contoh JSON Response dari GET /barang

```json
{
  "data": [
    {
      "id": 4,
      "nama": "Kartu Mahasiswa",
      "kategori": "Dokumen",
      "deskripsi": "Kartu mahasiswa ditemukan di dekat ruang kelas.",
      "lokasi": "Gedung B",
      "tanggal": "2026-10-15",
      "image": "",
      "status": "Ditemukan",
      "pelapor": "Tim Kampus",
      "ownerId": 0,
      "verificationStatus": "Belum diverifikasi"
    },
    {
      "id": 1,
      "nama": "Dompet Hitam",
      "kategori": "Aksesoris",
      "deskripsi": "Dompet hitam dengan jahitan di sudut kiri.",
      "lokasi": "Gedung A",
      "tanggal": "2026-10-12",
      "image": "",
      "status": "Hilang",
      "pelapor": "Tim Kampus",
      "ownerId": 0,
      "verificationStatus": "Belum diverifikasi"
    }
  ]
}
```

> Catatan: Server mengembalikan array diurutkan terbaru di atas (id DESC).
> Field `verificationSecret` TIDAK dikembalikan ke client (disembunyikan oleh publicBarang() di server).

---

## Hasil Mapping Data Model Barang

Fungsi `mapBarang` di `models/Barang.js`:

```js
/** Week 4 - DTO mapping: hanya field yang diperlukan UI. */
export const mapBarang = item => ({
  id:                 Number(item.id),
  nama:               String(item.nama ?? ''),
  kategori:           String(item.kategori ?? 'Lainnya'),
  deskripsi:          String(item.deskripsi ?? ''),
  lokasi:             String(item.lokasi ?? ''),
  tanggal:            String(item.tanggal ?? ''),
  image:              String(item.image ?? ''),
  status:             String(item.status ?? ''),
  pelapor:            String(item.pelapor ?? ''),
  ownerId:            Number(item.ownerId ?? 0),
  verificationStatus: String(item.verificationStatus ?? 'Belum diverifikasi'),
});
```

Contoh output mapping satu item dari JSON response:
- `id: 1` (raw number/string) -> DTO `id: 1` (Number, type-safe)
- `nama: "Dompet Hitam"` -> `nama: "Dompet Hitam"` (String, fallback '')
- `kategori: "Aksesoris"` -> `kategori: "Aksesoris"` (String, fallback 'Lainnya')
- `ownerId: 0` -> `ownerId: 0` (Number, fallback 0)
- `verificationStatus: "Belum diverifikasi"` -> safe String

---

## Penanganan Loading dan Error

State loading dan error dikelola di `App.js`:

- **Loading** (`loading: true`) saat `fetchBarang()` dipanggil -> indikator spinner di UI
- **HTTP 401** -> navigasi otomatis ke layar Login (sesi habis atau invalid)
- **Network timeout (15s)** -> pesan: "Koneksi API terlalu lama. Periksa jaringan."
- **Tidak bisa terhubung** -> pesan: "Tidak dapat terhubung ke API. Periksa alamat IP server dan Wi-Fi."
- **Format JSON salah** -> pesan: "Format data API tidak sesuai."
- **HTTP 403** -> pesan: "Akses ditolak."

---

## File yang Diverifikasi / Dibuat

| File                    | Status   | Keterangan                                                  |
|-------------------------|----------|-------------------------------------------------------------|
| `services/api.js`       | Verified | Fetch API, async/await, try/catch, mapBarang, Bearer token  |
| `models/Barang.js`      | Verified | DTO mapping Task 01 - field konsisten, tidak ada model baru |
| `server/server.js`      | Verified | REST endpoint GET /barang mengembalikan JSON valid          |
| `server/server.test.js` | Verified | Test otomatis Week 4 + Week 5 - semua LULUS                 |
| `docs/week4/task2.md`   | Baru     | Dokumentasi Task 02 ini                                     |

---

## Hasil Pengujian API

Dijalankan: `node --test server/server.test.js`

```
OK  Week 4 REST API + Week 5 token authentication, protected route, logout (455ms)
tests       1
pass        1
fail        0
duration_ms 1152ms
```

| #  | Skenario                                             | Hasil |
|----|------------------------------------------------------|-------|
| 1  | GET /barang tanpa token -> HTTP 401                  | PASS  |
| 2  | GET /barang token tidak valid -> HTTP 401            | PASS  |
| 3  | Login password salah -> HTTP 401                     | PASS  |
| 4  | Login input kosong -> HTTP 400                       | PASS  |
| 5  | Login berhasil -> token JWT valid (header.payload.sig) | PASS |
| 6  | GET /me dengan token valid -> HTTP 200               | PASS  |
| 7  | GET /barang dengan token valid -> 4 item JSON        | PASS  |
| 8  | POST /barang buat laporan baru -> HTTP 201           | PASS  |
| 9  | verificationSecret tidak bocor di response           | PASS  |
| 10 | PATCH status sebelum verifikasi -> HTTP 400          | PASS  |
| 11 | POST verify jawaban salah -> HTTP 400                | PASS  |
| 12 | POST verify jawaban benar -> HTTP 200                | PASS  |
| 13 | PATCH status setelah verifikasi -> HTTP 200          | PASS  |
| 14 | POST /auth/logout -> revoke token, HTTP 200          | PASS  |
| 15 | GET /barang setelah logout -> HTTP 401               | PASS  |
| 16 | Register akun baru -> HTTP 201                       | PASS  |
| 17 | Login akun baru -> HTTP 200                          | PASS  |
| 18 | PATCH status oleh non-owner -> HTTP 403              | PASS  |
| 19 | Upload foto tanpa auth -> HTTP 401                   | PASS  |
| 20 | Upload file bukan gambar -> HTTP 400                 | PASS  |
| 21 | Upload foto JPG valid -> HTTP 201 + URL foto         | PASS  |
| 22 | Akses URL foto yang diunggah -> HTTP 200 + image/jpeg | PASS |

**Total: 22 assertion, 0 gagal.**

---

## Cara Menjalankan dan Menguji

```bash
# 1. Jalankan server REST lokal
node server/server.js
# Server berjalan di http://localhost:4000

# 2. Uji endpoint manual (ganti TOKEN dengan access_token dari login)
curl http://localhost:4000/health

curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@kampus.ac.id\",\"password\":\"Demo123!\"}"

curl http://localhost:4000/barang \
  -H "Authorization: Bearer TOKEN"

# 3. Jalankan test otomatis
node --test server/server.test.js
```

---

## Catatan Keamanan

- `.env` sudah masuk `.gitignore` - tidak ada IP atau kredensial yang ter-push
- `server/data/` sudah masuk `.gitignore` - tidak ada token secret atau data user
- Token JWT hanya disimpan di SecureStore (tidak di AsyncStorage)
- `verificationSecret` tidak pernah dikembalikan oleh GET /barang atau GET /barang/:id

---

Dikerjakan oleh: Anggota 2 | Week 4 Task 02 - Connect to REST API
