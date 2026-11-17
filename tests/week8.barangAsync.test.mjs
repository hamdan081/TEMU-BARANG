import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { createApp } = require('../server/server.js');

test('Week 8 TemuKampus async flow: GET, POST, PATCH, dan error response', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'temukampus-week8-'));
  const server = createApp({ dataDir, secret: 'week8-integration-test-secret' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });

  const request = async (path, { method = 'GET', body, token } = {}) => {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  // API yang dilindungi menolak GET tanpa token.
  const unauthorized = await request('/barang');
  assert.equal(unauthorized.status, 401);

  const login = await request('/auth/login', {
    method: 'POST', body: { email: 'demo@kampus.ac.id', password: 'Demo123!' },
  });
  assert.equal(login.status, 200);
  const token = login.body.access_token;
  assert.ok(token);

  // GET: aplikasi mengambil daftar laporan barang dari server.
  const initialList = await request('/barang', { token });
  assert.equal(initialList.status, 200);
  assert.ok(Array.isArray(initialList.body.data));
  assert.ok(initialList.body.data.length >= 1);
  assert.ok(['Hilang', 'Ditemukan'].includes(initialList.body.data[0].jenisLaporan));
  assert.ok(['Belum Ditemukan', 'Menunggu Pemilik', 'Menunggu Pengambilan', 'Selesai Dikembalikan'].includes(initialList.body.data[0].status));

  // POST: mahasiswa membuat laporan barang temuan.
  const created = await request('/barang', {
    method: 'POST', token, body: {
      nama: 'Payung lipat biru',
      kategori: 'Aksesoris',
      deskripsi: 'Payung lipat warna biru dengan tali hitam.',
      lokasi: 'Selasar Gedung C',
      jenisLaporan: 'Ditemukan',
      verificationSecret: 'tali hitam',
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.nama, 'Payung lipat biru');
  assert.equal(created.body.data.jenisLaporan, 'Ditemukan');
  assert.equal(created.body.data.status, 'Menunggu Pemilik');
  const itemId = created.body.data.id;

  // PATCH ditolak sebelum barang diverifikasi.
  const prematureUpdate = await request(`/barang/${itemId}/status`, {
    method: 'PATCH', token, body: { status: 'Selesai Dikembalikan' },
  });
  assert.equal(prematureUpdate.status, 400);

  // Verifikasi berhasil mengubah status penanganan menjadi Menunggu Pengambilan.
  const verified = await request(`/barang/${itemId}/verify`, {
    method: 'POST', token, body: { jawaban: 'tali hitam' },
  });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.data.status, 'Menunggu Pengambilan');

  const updated = await request(`/barang/${itemId}/status`, {
    method: 'PATCH', token, body: { status: 'Selesai Dikembalikan' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.status, 'Selesai Dikembalikan');

  // GET berikutnya memperlihatkan hasil terbaru setelah refresh.
  const refreshedList = await request('/barang', { token });
  const refreshedItem = refreshedList.body.data.find((item) => item.id === itemId);
  assert.equal(refreshedItem.status, 'Selesai Dikembalikan');

  // POST laporan kehilangan mendapat status awal yang sesuai dengan jenis laporannya.
  const lostReport = await request('/barang', {
    method: 'POST', token, body: {
      nama: 'Flashdisk 32 GB', kategori: 'Elektronik',
      deskripsi: 'Flashdisk hitam dengan gantungan merah.',
      lokasi: 'Laboratorium Komputer', jenisLaporan: 'Hilang',
      verificationSecret: 'gantungan merah',
    },
  });
  assert.equal(lostReport.status, 201);
  assert.equal(lostReport.body.data.jenisLaporan, 'Hilang');
  assert.equal(lostReport.body.data.status, 'Belum Ditemukan');

  const failedRequest = await request('/test/error-500', { token });
  assert.equal(failedRequest.status, 500);
});


test('Week 8 migrates legacy item statuses into report type and handling status', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'temukampus-week8-migration-'));
  const legacyDb = {
    users: [],
    revokedJtis: [],
    barang: [
      { id: 11, nama: 'Dompet', kategori: 'Aksesoris', deskripsi: 'Dompet cokelat', lokasi: 'Gedung A', tanggal: '2026-10-01', image: '', status: 'Hilang', pelapor: 'Mahasiswa', ownerId: 0, verificationStatus: 'Belum diverifikasi', verificationSecret: 'jahitan biru' },
      { id: 12, nama: 'Payung', kategori: 'Lainnya', deskripsi: 'Payung merah', lokasi: 'Kantin', tanggal: '2026-10-02', image: '', status: 'Ditemukan', pelapor: 'Mahasiswa', ownerId: 0, verificationStatus: 'Belum diverifikasi', verificationSecret: 'gagang kayu' },
      { id: 13, nama: 'Kartu', kategori: 'Dokumen', deskripsi: 'Kartu mahasiswa', lokasi: 'Perpus', tanggal: '2026-10-03', image: '', status: 'Dikembalikan', pelapor: 'Mahasiswa', ownerId: 0, verificationStatus: 'Terverifikasi', verificationSecret: 'foto lama' },
    ],
  };
  writeFileSync(join(dataDir, 'database.json'), JSON.stringify(legacyDb));
  const server = createApp({ dataDir, secret: 'week8-migration-test-secret' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@kampus.ac.id', password: 'Demo123!' }),
  });
  const { access_token: token } = await login.json();
  const response = await fetch(`${baseUrl}/barang`, { headers: { Authorization: `Bearer ${token}` } });
  const { data } = await response.json();
  const byId = Object.fromEntries(data.map((item) => [item.id, item]));

  assert.equal(byId[11].jenisLaporan, 'Hilang');
  assert.equal(byId[11].status, 'Belum Ditemukan');
  assert.equal(byId[12].jenisLaporan, 'Ditemukan');
  assert.equal(byId[12].status, 'Menunggu Pemilik');
  assert.equal(byId[13].jenisLaporan, 'Hilang');
  assert.equal(byId[13].status, 'Selesai Dikembalikan');

  const savedDb = JSON.parse(readFileSync(join(dataDir, 'database.json'), 'utf8'));
  assert.equal(savedDb.barang.find((item) => item.id === 11).status, 'Belum Ditemukan');
});

test('Week 9 Task 02 POST laporan barang: validasi form, barang hilang vs temuan, dan error handling', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'temukampus-week9-post-'));
  const server = createApp({ dataDir, secret: 'week9-post-test-secret' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });

  const request = async (path, { method = 'GET', body, token } = {}) => {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  const login = await request('/auth/login', {
    method: 'POST', body: { email: 'demo@kampus.ac.id', password: 'Demo123!' },
  });
  const token = login.body.access_token;
  assert.ok(token);

  // 1. Validasi input: field wajib kosong ditolak dengan status 400
  const invalidEmpty = await request('/barang', {
    method: 'POST', token, body: { nama: '', kategori: 'Elektronik', lokasi: '', deskripsi: '', jenisLaporan: 'Hilang', verificationSecret: 'abc' }
  });
  assert.equal(invalidEmpty.status, 400);

  // 2. Validasi secret kurang dari 4 karakter ditolak dengan status 400
  const invalidSecret = await request('/barang', {
    method: 'POST', token, body: { nama: 'Kunci', kategori: 'Aksesoris', lokasi: 'Kantin', deskripsi: 'Kunci motor', jenisLaporan: 'Hilang', verificationSecret: '123' }
  });
  assert.equal(invalidSecret.status, 400);

  // 3. POST laporan barang hilang berhasil -> jenisLaporan 'Hilang', status awal 'Belum Ditemukan'
  const postHilang = await request('/barang', {
    method: 'POST', token, body: {
      nama: 'Jaket Almamater',
      kategori: 'Pakaian',
      deskripsi: 'Jaket almamater biru ukuran L tertinggal di kursi.',
      lokasi: 'Gedung Serbaguna',
      jenisLaporan: 'Hilang',
      verificationSecret: 'nama hamdan di saku',
    }
  });
  assert.equal(postHilang.status, 201);
  assert.equal(postHilang.body.data.nama, 'Jaket Almamater');
  assert.equal(postHilang.body.data.jenisLaporan, 'Hilang');
  assert.equal(postHilang.body.data.status, 'Belum Ditemukan');
  assert.equal(postHilang.body.data.verificationStatus, 'Belum diverifikasi');

  // 4. POST laporan barang temuan berhasil -> jenisLaporan 'Ditemukan', status awal 'Menunggu Pemilik'
  const postTemuan = await request('/barang', {
    method: 'POST', token, body: {
      nama: 'Tumbler Minum Biru',
      kategori: 'Lainnya',
      deskripsi: 'Tumbler stainless warna biru merk LocknLock.',
      lokasi: 'Perpustakaan Lt. 2',
      jenisLaporan: 'Ditemukan',
      verificationSecret: 'stiker kucing di tutup',
    }
  });
  assert.equal(postTemuan.status, 201);
  assert.equal(postTemuan.body.data.nama, 'Tumbler Minum Biru');
  assert.equal(postTemuan.body.data.jenisLaporan, 'Ditemukan');
  assert.equal(postTemuan.body.data.status, 'Menunggu Pemilik');

  // 5. GET /barang memastikan kedua laporan baru muncul dalam daftar terbaru
  const list = await request('/barang', { token });
  assert.equal(list.status, 200);
  const foundHilang = list.body.data.find(b => b.nama === 'Jaket Almamater');
  const foundTemuan = list.body.data.find(b => b.nama === 'Tumbler Minum Biru');
  assert.ok(foundHilang, 'Laporan barang hilang harus ada di daftar');
  assert.ok(foundTemuan, 'Laporan barang temuan harus ada di daftar');
});

test('Week 9 Task 03 PATCH status barang dan error handling: transisi status, izin owner, dan update data', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'temukampus-week9-patch-'));
  const server = createApp({ dataDir, secret: 'week9-patch-test-secret' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });

  const request = async (path, { method = 'GET', body, token } = {}) => {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  // 1. Login user demo (owner)
  const loginDemo = await request('/auth/login', {
    method: 'POST', body: { email: 'demo@kampus.ac.id', password: 'Demo123!' },
  });
  const tokenOwner = loginDemo.body.access_token;
  assert.ok(tokenOwner);

  // 2. Registrasi dan login user lain (non-owner) untuk uji validasi hak akses
  const registerOther = await request('/auth/register', {
    method: 'POST', body: { name: 'User Lain', email: 'other@kampus.ac.id', password: 'Password123!' },
  });
  assert.equal(registerOther.status, 201);
  const loginOther = await request('/auth/login', {
    method: 'POST', body: { email: 'other@kampus.ac.id', password: 'Password123!' },
  });
  const tokenOther = loginOther.body.access_token;
  assert.ok(tokenOther);

  // 3. POST laporan barang baru oleh owner
  const postRes = await request('/barang', {
    method: 'POST', token: tokenOwner, body: {
      nama: 'Tas Ransel Abu-abu',
      kategori: 'Aksesoris',
      deskripsi: 'Tas ransel abu-abu tertinggal di lab komputer.',
      lokasi: 'Lab Komputer 3',
      jenisLaporan: 'Ditemukan',
      verificationSecret: 'ada stiker react di gantungan',
    }
  });
  assert.equal(postRes.status, 201);
  const itemId = postRes.body.data.id;
  assert.equal(postRes.body.data.status, 'Menunggu Pemilik');

  // 4. Uji Hak Akses: User lain tidak diizinkan mengubah status (403 Forbidden)
  const forbiddenStatus = await request(`/barang/${itemId}/status`, {
    method: 'PATCH', token: tokenOther, body: { status: 'Selesai Dikembalikan' }
  });
  assert.equal(forbiddenStatus.status, 403);
  assert.match(forbiddenStatus.body.message, /Hanya pembuat laporan/);

  // 5. Uji Validasi Alur Status: Selesai Dikembalikan ditolak jika belum diverifikasi (400 Bad Request)
  const prematurePatch = await request(`/barang/${itemId}/status`, {
    method: 'PATCH', token: tokenOwner, body: { status: 'Selesai Dikembalikan' }
  });
  assert.equal(prematurePatch.status, 400);
  assert.match(prematurePatch.body.message, /Barang harus terverifikasi/);

  // 6. Verifikasi ciri khusus berhasil -> status beralih menjadi 'Menunggu Pengambilan'
  const verifyRes = await request(`/barang/${itemId}/verify`, {
    method: 'POST', token: tokenOther, body: { jawaban: 'ada stiker react di gantungan' }
  });
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.data.status, 'Menunggu Pengambilan');

  // 7. PATCH status berhasil -> 'Selesai Dikembalikan'
  const patchSuccess = await request(`/barang/${itemId}/status`, {
    method: 'PATCH', token: tokenOwner, body: { status: 'Selesai Dikembalikan' }
  });
  assert.equal(patchSuccess.status, 200);
  assert.equal(patchSuccess.body.data.status, 'Selesai Dikembalikan');

  // 8. Verifikasi konsistensi data setelah PATCH via GET /barang
  const getUpdated = await request(`/barang/${itemId}`, { token: tokenOwner });
  assert.equal(getUpdated.status, 200);
  assert.equal(getUpdated.body.data.status, 'Selesai Dikembalikan');

  // 9. Uji PATCH status menjadi 'Belum Terselesaikan' pada laporan baru
  const postLost = await request('/barang', {
    method: 'POST', token: tokenOwner, body: {
      nama: 'Buku Catatan Pemrograman',
      kategori: 'Dokumen',
      deskripsi: 'Buku bergaris cover cokelat.',
      lokasi: 'Perpustakaan Lt. 1',
      jenisLaporan: 'Hilang',
      verificationSecret: 'tanda tangan di halaman 1',
    }
  });
  assert.equal(postLost.status, 201);
  const lostId = postLost.body.data.id;

  const patchUnresolved = await request(`/barang/${lostId}/status`, {
    method: 'PATCH', token: tokenOwner, body: { status: 'Belum Terselesaikan' }
  });
  assert.equal(patchUnresolved.status, 200);
  assert.equal(patchUnresolved.body.data.status, 'Belum Terselesaikan');

  // 10. Uji PATCH pembaruan informasi laporan (PATCH /barang/:id)
  const patchInfo = await request(`/barang/${lostId}`, {
    method: 'PATCH', token: tokenOwner, body: {
      nama: 'Buku Catatan Mobile Programming',
      lokasi: 'Perpustakaan Lt. 2 Ruang Diskusi',
      deskripsi: 'Buku bergaris cover cokelat dengan catatan Week 1-8.',
    }
  });
  assert.equal(patchInfo.status, 200);
  assert.equal(patchInfo.body.data.nama, 'Buku Catatan Mobile Programming');
  assert.equal(patchInfo.body.data.lokasi, 'Perpustakaan Lt. 2 Ruang Diskusi');
  assert.equal(patchInfo.body.data.deskripsi, 'Buku bergaris cover cokelat dengan catatan Week 1-8.');

  // 11. Uji Error Handling: Status tidak valid ditolak (400 Bad Request)
  const invalidStatus = await request(`/barang/${lostId}/status`, {
    method: 'PATCH', token: tokenOwner, body: { status: 'StatusTidakValid123' }
  });
  assert.equal(invalidStatus.status, 400);

  // 12. Uji Error Handling: ID barang tidak ditemukan (404 Not Found)
  const notFound = await request('/barang/999999/status', {
    method: 'PATCH', token: tokenOwner, body: { status: 'Belum Terselesaikan' }
  });
  assert.equal(notFound.status, 404);
});
