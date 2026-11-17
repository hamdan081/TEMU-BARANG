import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, findPotentialMatches, scoreBarangMatch, textSimilarity } from '../utils/barangMatching.mjs';

const lost = {
  id: 1, ownerId: 10, jenisLaporan: 'Hilang', status: 'Belum Ditemukan',
  nama: 'Dompet kulit hitam', kategori: 'Aksesoris',
  deskripsi: 'Dompet kulit hitam dengan logo kecil warna perak di bagian depan',
  lokasi: 'Perpustakaan Gedung A', tanggal: '2026-11-10', latitude: -7.9666, longitude: 112.6326,
};
const found = {
  id: 2, ownerId: 20, jenisLaporan: 'Ditemukan', status: 'Menunggu Pemilik',
  nama: 'Dompet hitam', kategori: 'Aksesoris',
  deskripsi: 'Dompet hitam kulit, logo perak kecil di depan',
  lokasi: 'Perpustakaan Gedung A', tanggal: '2026-11-11', latitude: -7.9668, longitude: 112.6327,
};

test('normalisasi dan kemiripan teks mengabaikan kapitalisasi dan tanda baca', () => {
  assert.ok(textSimilarity('Dompet Kulit-Hitam', 'dompet kulit hitam') > 0.9);
});

test('jarak koordinat dihitung dan kandidat berlawanan jenis mendapat skor', () => {
  assert.ok(distanceMeters(lost, found) < 100);
  assert.equal(distanceMeters({ latitude: null, longitude: null }, { latitude: null, longitude: null }), null);
  const result = scoreBarangMatch(lost, found);
  assert.ok(result.score >= 70);
  assert.ok(result.reasons.includes('Kategori sama'));
});

test('daftar kecocokan hanya menampilkan kandidat aktif dari pengguna lain', () => {
  const closed = { ...found, id: 3, status: 'Selesai Dikembalikan' };
  const own = { ...found, id: 4, ownerId: 10 };
  const sameType = { ...lost, id: 5, ownerId: 30 };
  const matches = findPotentialMatches(lost, [found, closed, own, sameType], { viewerId: 10 });
  assert.deepEqual(matches.map(match => match.item.id), [2]);
  const foundOwnerView = findPotentialMatches(found, [lost, { ...lost, id: 6, ownerId: 99 }], { viewerId: 10 });
  assert.deepEqual(foundOwnerView.map(match => match.item.id), [1]);
});

test('laporan yang sudah dipasangkan tidak ditawarkan lagi', () => {
  const paired = { ...found, matchedReportId: 1 };
  assert.equal(findPotentialMatches(lost, [paired], { viewerId: 10 }).length, 0);
});
