import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { createApp } = require('../server/server.js');

async function startTestServer(t, prefix = 'temubarang-week9-') {
  const dataDir = mkdtempSync(join(tmpdir(), prefix));
  const server = createApp({ dataDir, secret: `${prefix}test-secret` });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });
  const request = async (path, { method = 'GET', body, token } = {}) => {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    return { status: response.status, body: payload };
  };
  const login = async (email = 'demo@kampus.ac.id', password = 'Demo123!') => {
    const result = await request('/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(result.status, 200);
    return result.body.access_token;
  };
  const register = async (name, email) => {
    const result = await request('/auth/register', {
      method: 'POST', body: { name, email, password: 'Password123!' },
    });
    assert.equal(result.status, 201);
    return login(email, 'Password123!');
  };
  return { dataDir, request, login, register };
}

const createLostReport = (overrides = {}) => ({
  nama: 'Dompet kulit hitam', kategori: 'Aksesoris',
  deskripsi: 'Dompet kulit hitam dengan logo perak kecil di bagian depan.',
  lokasi: 'Perpustakaan Gedung A', jenisLaporan: 'Hilang',
  verificationSecret: 'logo perak', latitude: -7.966612, longitude: 112.632612,
  accuracy: 8, alamat: 'Perpustakaan, Gedung A, Kampus', ...overrides,
});
const createFoundReport = (overrides = {}) => ({
  nama: 'Dompet hitam', kategori: 'Aksesoris',
  deskripsi: 'Dompet kulit warna hitam, logo kecil warna perak di depan.',
  lokasi: 'Perpustakaan Gedung A', jenisLaporan: 'Ditemukan',
  latitude: -7.96682, longitude: 112.63272, accuracy: 12,
  alamat: 'Perpustakaan, Gedung A, Kampus', ...overrides,
});

test('Week 9: klaim barang temuan memasangkan laporan hilang dan temuan dengan verifikasi pemilik', async t => {
  const { request, login, register } = await startTestServer(t);
  const lostOwnerToken = await login();
  const finderToken = await register('Penemu Barang', 'finder@kampus.ac.id');
  const outsiderToken = await register('Pengguna Lain', 'outsider@kampus.ac.id');

  const unauthorized = await request('/barang', {});
  assert.equal(unauthorized.status, 401);

  const lost = await request('/barang', { method: 'POST', token: lostOwnerToken, body: createLostReport() });
  assert.equal(lost.status, 201);
  assert.equal(lost.body.data.status, 'Belum Ditemukan');
  assert.equal(lost.body.data.latitude, -7.966612, 'pemilik melihat koordinat presisi');
  assert.equal(Object.hasOwn(lost.body.data, 'verificationSecret'), false);

  const found = await request('/barang', { method: 'POST', token: finderToken, body: createFoundReport() });
  assert.equal(found.status, 201);
  assert.equal(found.body.data.status, 'Menunggu Pemilik');
  assert.equal(found.body.data.verificationStatus, 'Belum diverifikasi');
  const finderCannotClaimOwnReport = await request(`/barang/${found.body.data.id}/claim`, {
    method: 'POST', token: finderToken, body: { lostReportId: lost.body.data.id, jawaban: 'logo perak' },
  });
  assert.equal(finderCannotClaimOwnReport.status, 403);

  const missingSecret = await request(`/barang/${found.body.data.id}/claim`, {
    method: 'POST', token: lostOwnerToken, body: { lostReportId: lost.body.data.id, jawaban: 'salah' },
  });
  assert.equal(missingSecret.status, 400);

  const wrongOwner = await request(`/barang/${found.body.data.id}/claim`, {
    method: 'POST', token: outsiderToken, body: { lostReportId: lost.body.data.id, jawaban: 'logo perak' },
  });
  assert.equal(wrongOwner.status, 403);

  const claim = await request(`/barang/${found.body.data.id}/claim`, {
    method: 'POST', token: lostOwnerToken, body: { lostReportId: lost.body.data.id, jawaban: 'LOGO PERAK' },
  });
  assert.equal(claim.status, 200);
  assert.equal(claim.body.foundItem.status, 'Menunggu Pengambilan');
  assert.equal(claim.body.lostItem.status, 'Menunggu Pengambilan');
  assert.equal(claim.body.foundItem.matchedReportId, lost.body.data.id);
  assert.equal(claim.body.lostItem.matchedReportId, found.body.data.id);

  const oldUnsafeVerify = await request(`/barang/${found.body.data.id}/verify`, {
    method: 'POST', token: finderToken, body: { jawaban: 'apa saja' },
  });
  assert.equal(oldUnsafeVerify.status, 410);

  const forbiddenReturn = await request(`/barang/${lost.body.data.id}/status`, {
    method: 'PATCH', token: finderToken, body: { status: 'Selesai Dikembalikan' },
  });
  assert.equal(forbiddenReturn.status, 403);

  const returned = await request(`/barang/${lost.body.data.id}/status`, {
    method: 'PATCH', token: lostOwnerToken, body: { status: 'Selesai Dikembalikan' },
  });
  assert.equal(returned.status, 200);
  assert.equal(returned.body.data.status, 'Selesai Dikembalikan');
  assert.equal(returned.body.pairedItem.status, 'Selesai Dikembalikan');

  const refreshed = await request('/barang', { token: finderToken });
  const refreshedFound = refreshed.body.data.find(item => item.id === found.body.data.id);
  assert.equal(refreshedFound.status, 'Selesai Dikembalikan');
});

test('Week 9: CRUD laporan dibatasi pada pemilik dan laporan selesai/pasangan dikunci', async t => {
  const { request, login, register } = await startTestServer(t, 'temubarang-crud-');
  const ownerToken = await login();
  const otherToken = await register('Pengguna B', 'userb@kampus.ac.id');
  const created = await request('/barang', { method: 'POST', token: ownerToken, body: createLostReport({ nama: 'Kartu Akses Biru' }) });
  const id = created.body.data.id;

  const forbiddenEdit = await request(`/barang/${id}`, {
    method: 'PATCH', token: otherToken, body: createLostReport({ nama: 'Diubah pengguna lain' }),
  });
  assert.equal(forbiddenEdit.status, 403);

  const updated = await request(`/barang/${id}`, {
    method: 'PATCH', token: ownerToken, body: createLostReport({ nama: 'Kartu Akses Biru Revisi', deskripsi: 'Kartu biru dengan gantungan merah.', verificationSecret: 'ciri baru rahasia' }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.nama, 'Kartu Akses Biru Revisi');
  assert.ok(updated.body.data.editedAt);

  const found = await request('/barang', { method: 'POST', token: otherToken, body: createFoundReport({ nama: 'Kartu Akses Biru', kategori: 'Dokumen', deskripsi: 'Kartu biru dengan gantungan merah.', lokasi: 'Perpustakaan Gedung A' }) });
  const claimWithUpdatedSecret = await request(`/barang/${found.body.data.id}/claim`, { method: 'POST', token: ownerToken, body: { lostReportId: id, jawaban: 'ciri baru rahasia' } });
  assert.equal(claimWithUpdatedSecret.status, 200);
  const editAfterPair = await request(`/barang/${id}`, { method: 'PATCH', token: ownerToken, body: createLostReport() });
  assert.equal(editAfterPair.status, 409);

  const deletable = await request('/barang', { method: 'POST', token: ownerToken, body: createLostReport({ nama: 'Laporan yang Dapat Dihapus' }) });
  const deleted = await request(`/barang/${deletable.body.data.id}`, { method: 'DELETE', token: ownerToken });
  assert.equal(deleted.status, 200);
  const missing = await request(`/barang/${deletable.body.data.id}`, { token: ownerToken });
  assert.equal(missing.status, 404);
});

test('Week 9: laporan penyalahgunaan dapat dikirim satu kali per pengguna per barang', async t => {
  const { request, login, register } = await startTestServer(t, 'temubarang-report-');
  const ownerToken = await login();
  const reporterToken = await register('Pelapor Konten', 'reporter@kampus.ac.id');
  const created = await request('/barang', { method: 'POST', token: ownerToken, body: createLostReport() });
  const id = created.body.data.id;

  const report = await request(`/barang/${id}/report`, {
    method: 'POST', token: reporterToken, body: { reason: 'Informasi palsu', description: 'Lokasi dan foto tidak sesuai.' },
  });
  assert.equal(report.status, 201);
  assert.equal(report.body.report.status, 'Menunggu Tinjauan');

  const duplicate = await request(`/barang/${id}/report`, {
    method: 'POST', token: reporterToken, body: { reason: 'Foto tidak sesuai' },
  });
  assert.equal(duplicate.status, 409);
});

test('Week 9: migrasi menyimpan hash rahasia, bukan plaintext', async t => {
  const { dataDir, request, login } = await startTestServer(t, 'temubarang-migrate-');
  const dbPath = join(dataDir, 'database.json');
  const saved = JSON.parse(readFileSync(dbPath, 'utf8'));
  const first = saved.barang[0];
  assert.ok(first.verificationSecretHash);
  assert.equal(Object.hasOwn(first, 'verificationSecret'), false);
  const token = await login();
  const list = await request('/barang', { token });
  assert.equal(list.status, 200);
  assert.equal(list.body.data.some(item => Object.hasOwn(item, 'verificationSecretHash')), false);
});

test('Week 9: lokasi publik dibulatkan, pemilik dan pihak yang dipasangkan melihat koordinat presisi', async t => {
  const { request, login, register } = await startTestServer(t, 'temubarang-privacy-');
  const ownerToken = await login();
  const otherToken = await register('Pengguna Publik', 'public@kampus.ac.id');
  const created = await request('/barang', { method: 'POST', token: ownerToken, body: createLostReport() });
  const publicList = await request('/barang', { token: otherToken });
  const publicItem = publicList.body.data.find(item => item.id === created.body.data.id);
  assert.equal(publicItem.latitude, -7.967);
  assert.equal(publicItem.longitude, 112.633);
  assert.equal(publicItem.alamat, '');
  assert.equal(publicItem.ownerId, null);
  assert.equal(publicItem.pelapor, 'Mahasiswa');
  const ownerList = await request('/barang', { token: ownerToken });
  const ownerItem = ownerList.body.data.find(item => item.id === created.body.data.id);
  assert.equal(ownerItem.latitude, -7.966612);
  assert.equal(ownerItem.alamat, 'Perpustakaan, Gedung A, Kampus');
});

test('migrasi laporan lama meng-hash rahasia dan mengembalikan laporan temuan yang diverifikasi dengan alur lama', async t => {
  const dataDir = mkdtempSync(join(tmpdir(), 'temubarang-legacy-'));
  const legacyDb = {
    users: [], revokedJtis: [],
    barang: [
      { id: 31, nama: 'Tas', kategori: 'Pakaian', deskripsi: 'Tas hitam', lokasi: 'Gedung B', tanggal: '2026-10-01', jenisLaporan: 'Hilang', status: 'Belum Ditemukan', ownerId: 0, verificationStatus: 'Belum diverifikasi', verificationSecret: 'resleting emas' },
      { id: 32, nama: 'Payung', kategori: 'Lainnya', deskripsi: 'Payung merah', lokasi: 'Kantin', tanggal: '2026-10-02', jenisLaporan: 'Ditemukan', status: 'Menunggu Pengambilan', ownerId: 0, verificationStatus: 'Terverifikasi', verificationSecret: 'gagang kayu' },
      { id: 33, nama: 'Buku', kategori: 'Dokumen', deskripsi: 'Buku catatan', lokasi: 'Lab', tanggal: '2026-10-03', jenisLaporan: 'Hilang', status: 'Menunggu Pengambilan', ownerId: 0, verificationStatus: 'Terverifikasi', verificationSecret: 'stiker hijau' },
    ],
  };
  writeFileSync(join(dataDir, 'database.json'), JSON.stringify(legacyDb));
  const server = createApp({ dataDir, secret: 'temubarang-legacy-migration-secret' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    rmSync(dataDir, { recursive: true, force: true });
  });

  const stored = JSON.parse(readFileSync(join(dataDir, 'database.json'), 'utf8'));
  const lost = stored.barang.find(item => item.id === 31);
  const found = stored.barang.find(item => item.id === 32);
  const oldVerifiedLost = stored.barang.find(item => item.id === 33);
  assert.ok(lost.verificationSecretHash);
  assert.equal(Object.hasOwn(lost, 'verificationSecret'), false);
  assert.equal(found.status, 'Menunggu Pemilik');
  assert.equal(found.verificationStatus, 'Belum diverifikasi');
  assert.equal(Object.hasOwn(found, 'verificationSecret'), false);
  assert.equal(oldVerifiedLost.status, 'Belum Ditemukan');
  assert.equal(oldVerifiedLost.verificationStatus, 'Belum diverifikasi');
});
