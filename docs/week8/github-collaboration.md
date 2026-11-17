# Pembagian Kolaborasi GitHub — TemuKampus Week 8 Async

Tujuan kolaborasi ini adalah membagi penerapan GET, loading, POST, PATCH, error handling, dan refresh pada alur laporan barang TemuKampus. Contoh Todo List pada materi disesuaikan menjadi **Tindak Lanjut Laporan**, bukan aplikasi Todo terpisah.

## Aturan kerja

- Gunakan satu repository bersama dan `main` sebagai branch utama.
- Setiap anggota bekerja pada branch fitur dan mengirim Pull Request (PR).
- Merge dilakukan berurutan. Anggota berikutnya menarik perubahan terbaru dari `main` sebelum mulai.
- Minimal satu anggota lain melakukan review PR.
- Jangan commit `.env`, `server/data/`, `node_modules/`, token, atau kredensial.

## Pembagian tiga anggota

| Anggota | Tanggung jawab | Materi Week 8 | File utama |
|---|---|---|---|
| Orang 1 | GET laporan, pemuatan awal melalui useEffect, loading, refresh, dan pemisahan filter jenis/status | GET, useEffect, ActivityIndicator, Refresh | `services/api.js`, `App.js`, `models/Barang.js`, `components/ItemCard.js` |
| Orang 2 | POST laporan barang hilang/temuan dan halaman Tindak Lanjut yang menampilkan aksi sesuai konteks laporan | POST, async/await, loading, daftar tindak lanjut | `App.js`, `services/api.js`, `components/BottomNav.js` |
| Orang 3 | Verifikasi dan PATCH status penanganan, error handling, migrasi status lama, serta pengujian | PATCH, try/catch, Alert, testing | `server/server.js`, `App.js`, `services/api.js`, `tests/week8.barangAsync.test.mjs` |

## Urutan branch dan commit

### 1. Orang pertama — GET, loading, refresh

```bash
git checkout main
git pull origin main
git checkout -b week8/anggota-1-get-refresh
# Kerjakan GET, useEffect, loading, refresh, dan pemisahan jenis/status.
git add App.js services/api.js models/Barang.js components/ItemCard.js
git commit -m "feat(week8): load barang reports asynchronously"
git push -u origin week8/anggota-1-get-refresh
```

Buat PR ke `main`. Setelah direview dan di-merge, anggota kedua mengambil perubahan terbaru.

### 2. Orang kedua — POST dan Tindak Lanjut

```bash
git checkout main
git pull origin main
git checkout -b week8/anggota-2-post-followup
# Kerjakan POST laporan dan halaman Tindak Lanjut Laporan.
git add App.js services/api.js components/BottomNav.js docs/week8
git commit -m "feat(week8): add report submission and follow-up list"
git push -u origin week8/anggota-2-post-followup
```

Buat PR ke `main`. Setelah merge, anggota ketiga mengambil perubahan terbaru.

### 3. Orang ketiga — PATCH, error handling, testing

```bash
git checkout main
git pull origin main
git checkout -b week8/anggota-3-patch-status-test
# Kerjakan verifikasi, PATCH status, error handling, migrasi data, dan pengujian.
git add App.js services/api.js server/server.js tests/week8.barangAsync.test.mjs docs/week8
git commit -m "feat(week8): update report handling status and test async flow"
git push -u origin week8/anggota-3-patch-status-test
```

Buat PR ke `main`. Setelah merge, jalankan seluruh pengujian dan uji aplikasi melalui Expo Go.

## Pengujian sebelum merge final

```bash
npm install
npm run test:week8
npm run test:week7
npm run test:api
npm run dev
```

## Catatan kontribusi

Pembagian ini adalah rencana pembagian kerja. Setiap anggota harus benar-benar mengerjakan dan melakukan commit pada branch masing-masing agar riwayat kontribusi GitHub sesuai dengan pekerjaan yang dilakukan. Jangan membuat commit seolah-olah dibuat anggota lain.
