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
