# Pembagian Kolaborasi GitHub — TemuBarang Week 9

Repository: https://github.com/hamdan081/TEMU-BARANG

Setiap anggota menggunakan akun GitHub masing-masing, bekerja pada branch fitur, membuat Pull Request ke `main`, dan tidak melakukan force push.

## Orang 1 — GET, loading, refresh, dan pencocokan awal

Branch: `week9/anggota-1-get-matching`

- GET laporan hilang dan ditemukan.
- useEffect, ActivityIndicator, refresh, dan empty/error state.
- Algoritma skor kemiripan sebagai saran, bukan verifikasi otomatis.

File utama: `App.js`, `services/api.js`, `utils/barangMatching.mjs`, `models/Barang.js`, `tests/barangMatching.test.mjs`.

Commit: `feat(week9): load and suggest matching barang reports`

## Orang 2 — POST, edit/hapus, dan pelaporan penyalahgunaan

Branch: `week9/anggota-2-report-crud`

- POST laporan Hilang dan Ditemukan.
- Validasi form dan loading.
- Edit/hapus laporan milik sendiri sebelum dipasangkan/selesai.
- Kirim laporan penyalahgunaan dengan alasan terstruktur.

File utama: `App.js`, `services/api.js`, `server/server.js`.

Commit: `feat(week9): add report submission and owner CRUD`

## Orang 3 — Klaim, PATCH status, keamanan, dan pengujian integrasi

Branch: `week9/anggota-3-claim-patch`

- Verifikasi ciri rahasia pada laporan kehilangan milik pengklaim.
- Memasangkan laporan hilang dan temuan.
- PATCH pengembalian pada kedua laporan.
- Hash rahasia, pembatasan kepemilikan, migrasi data, dan pengujian.

File utama: `server/server.js`, `services/api.js`, `App.js`, `tests/week9.barangAsync.test.mjs`, `server/server.test.js`.

Commit: `feat(week9): secure claim pairing and return workflow`

## Urutan

1. Orang 1 membuat PR dan merge.
2. Orang 2 menarik `main` terbaru, mengerjakan, lalu membuat PR.
3. Orang 3 menarik `main` terbaru, mengerjakan, lalu membuat PR.
4. Koordinator menguji seluruh alur GET → POST → pencocokan/klaim → PATCH.

```bash
git checkout main
git pull origin main
git checkout -b week9/nama-branch
# implementasikan ruang lingkup yang ditugaskan
git add <file-yang-diubah>
git commit -m "pesan commit sesuai tugas"
git push -u origin week9/nama-branch
```

Jangan commit `.env`, `server/data/`, `node_modules`, token, password, atau credential.
