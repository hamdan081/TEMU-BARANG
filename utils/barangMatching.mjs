/**
 * Pencocokan awal laporan barang hilang dan ditemukan.
 * Skor hanya rekomendasi untuk membantu pengguna; bukan keputusan verifikasi otomatis.
 */
const STOP_WORDS = new Set([
  'dan', 'yang', 'di', 'ke', 'dari', 'dengan', 'untuk', 'pada', 'ada', 'atau',
  'warna', 'buah', 'buahnya', 'barang', 'saya', 'milik', 'sebuah', 'ini', 'itu',
  'the', 'a', 'an', 'of', 'with', 'at', 'in', 'on',
]);

export function normalizeMatchText(value) {
  return String(value ?? '')
    .toLocaleLowerCase('id')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(value) {
  return new Set(
    normalizeMatchText(value)
      .split(' ')
      .filter(token => token.length > 1 && !STOP_WORDS.has(token))
  );
}

export function textSimilarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function distanceMeters(a, b) {
  const valid = point => point && point.latitude !== null && point.latitude !== undefined && point.latitude !== '' &&
    point.longitude !== null && point.longitude !== undefined && point.longitude !== '' &&
    Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)) &&
    Number(point.latitude) >= -90 && Number(point.latitude) <= 90 &&
    Number(point.longitude) >= -180 && Number(point.longitude) <= 180;
  if (!valid(a) || !valid(b)) return null;
  const toRad = degrees => degrees * Math.PI / 180;
  const dLat = toRad(Number(b.latitude) - Number(a.latitude));
  const dLon = toRad(Number(b.longitude) - Number(a.longitude));
  const lat1 = toRad(Number(a.latitude));
  const lat2 = toRad(Number(b.latitude));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function dateSimilarity(left, right) {
  if (!left || !right) return 0;
  const a = Date.parse(left);
  const b = Date.parse(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const days = Math.abs(a - b) / 86400000;
  if (days <= 3) return 5;
  if (days <= 7) return 4;
  if (days <= 14) return 2;
  return 0;
}

export function scoreBarangMatch(report, candidate) {
  if (!report || !candidate || report.id === candidate.id) {
    return { score: 0, reasons: [], distance: null };
  }
  if (report.jenisLaporan === candidate.jenisLaporan) {
    return { score: 0, reasons: [], distance: null };
  }
  const reasons = [];
  let score = 0;

  const name = textSimilarity(report.nama, candidate.nama);
  const description = textSimilarity(report.deskripsi, candidate.deskripsi);
  const locationText = textSimilarity(report.lokasi || report.alamat, candidate.lokasi || candidate.alamat);
  const distance = distanceMeters(report, candidate);

  if (name >= 0.25) {
    const points = Math.round(name * 40);
    score += points;
    reasons.push('Nama barang mirip');
  }
  if (report.kategori && candidate.kategori && normalizeMatchText(report.kategori) === normalizeMatchText(candidate.kategori)) {
    score += 15;
    reasons.push('Kategori sama');
  }
  if (description >= 0.2) {
    const points = Math.round(description * 20);
    score += points;
    reasons.push('Ciri-ciri memiliki kesamaan');
  }

  if (distance !== null) {
    const points = distance <= 100 ? 20 : distance <= 250 ? 16 : distance <= 500 ? 12 : distance <= 1000 ? 6 : 0;
    score += points;
    if (points) reasons.push(distance <= 250 ? 'Lokasi berdekatan' : 'Lokasi masih dalam area sekitar');
  } else if (locationText >= 0.25) {
    score += Math.round(locationText * 20);
    reasons.push('Lokasi laporan mirip');
  }

  const datePoints = dateSimilarity(report.tanggal, candidate.tanggal);
  score += datePoints;
  if (datePoints >= 4) reasons.push('Tanggal laporan berdekatan');

  return { score: Math.min(100, score), reasons, distance };
}

export function findPotentialMatches(report, reports = [], { viewerId, threshold = 30, limit = 5 } = {}) {
  if (!report) return [];
  if (viewerId !== undefined) {
    const viewerOwnsTarget = Number(report.ownerId) === Number(viewerId);
    if (report.jenisLaporan === 'Hilang' && !viewerOwnsTarget) return [];
    if (report.jenisLaporan === 'Ditemukan' && viewerOwnsTarget) return [];
  }
  return reports
    .filter(candidate => {
      if (!candidate || candidate.id === report.id) return false;
      if (candidate.jenisLaporan === report.jenisLaporan) return false;
      if (candidate.status === 'Selesai Dikembalikan' || candidate.matchedReportId) return false;
      if (report.status === 'Selesai Dikembalikan' || report.matchedReportId) return false;
      if (viewerId !== undefined) {
        const viewerOwnsTarget = Number(report.ownerId) === Number(viewerId);
        if (report.jenisLaporan === 'Hilang' && viewerOwnsTarget && Number(candidate.ownerId) === Number(viewerId)) return false;
        if (report.jenisLaporan === 'Ditemukan' && !viewerOwnsTarget && Number(candidate.ownerId) !== Number(viewerId)) return false;
      }
      return true;
    })
    .map(candidate => ({ item: candidate, ...scoreBarangMatch(report, candidate) }))
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score || Number(b.item.id) - Number(a.item.id))
    .slice(0, limit);
}
