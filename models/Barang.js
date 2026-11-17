/**
 * Data Model & DTO Barang - TemuBarang.
 * jenisLaporan menjelaskan kategori laporan (Hilang/Ditemukan), sedangkan
 * status menjelaskan perkembangan penanganan laporan.
 */
export const categories = [
  'Elektronik',
  'Dokumen',
  'Pakaian',
  'Aksesoris',
  'Perlengkapan',
  'Lainnya',
];

export const reportTypes = ['Hilang', 'Ditemukan'];
export const handlingStatuses = [
  'Belum Ditemukan',
  'Menunggu Pemilik',
  'Menunggu Pengambilan',
  'Selesai Dikembalikan',
];

export function normalizeBarangStatus(status, jenisLaporan, verificationStatus) {
  const legacy = String(status ?? '');
  let normalized = legacy;
  if (legacy === 'Hilang') normalized = 'Belum Ditemukan';
  if (legacy === 'Ditemukan') normalized = 'Menunggu Pemilik';
  if (legacy === 'Dikembalikan') normalized = 'Selesai Dikembalikan';
  if (verificationStatus === 'Terverifikasi' && normalized !== 'Selesai Dikembalikan') {
    normalized = 'Menunggu Pengambilan';
  }
  return handlingStatuses.includes(normalized)
    ? normalized
    : (jenisLaporan === 'Hilang' ? 'Belum Ditemukan' : 'Menunggu Pemilik');
}

export class Barang {
  constructor({
    id = 0,
    nama = '',
    kategori = 'Lainnya',
    deskripsi = '',
    lokasi = '',
    tanggal = '',
    image = '',
    jenisLaporan = 'Hilang',
    status = 'Belum Ditemukan',
    pelapor = '',
    ownerId = 0,
    verificationStatus = 'Belum diverifikasi',
    latitude = null,
    longitude = null,
    accuracy = null,
    alamat = '',
    matchedReportId = null,
    matchedAt = null,
    editedAt = null,
    locationPrecision = 'precise',
  } = {}) {
    const legacyStatus = String(status ?? '');
    this.id = Number(id ?? 0);
    this.nama = String(nama ?? '');
    this.kategori = String(kategori ?? 'Lainnya');
    this.deskripsi = String(deskripsi ?? '');
    this.lokasi = String(lokasi ?? '');
    this.tanggal = String(tanggal ?? '');
    this.image = String(image ?? '');
    this.jenisLaporan = reportTypes.includes(jenisLaporan)
      ? jenisLaporan
      : legacyStatus === 'Ditemukan' ? 'Ditemukan' : 'Hilang';
    this.status = normalizeBarangStatus(legacyStatus, this.jenisLaporan, verificationStatus);
    this.pelapor = String(pelapor ?? '');
    this.ownerId = Number(ownerId ?? 0);
    this.verificationStatus = String(verificationStatus ?? 'Belum diverifikasi');
    this.latitude = latitude === null || latitude === undefined || latitude === '' ? null : Number(latitude);
    this.longitude = longitude === null || longitude === undefined || longitude === '' ? null : Number(longitude);
    this.accuracy = accuracy === null || accuracy === undefined || accuracy === '' ? null : Number(accuracy);
    this.alamat = String(alamat ?? '');
    this.matchedReportId = matchedReportId === null || matchedReportId === undefined || matchedReportId === '' ? null : Number(matchedReportId);
    this.matchedAt = matchedAt ? String(matchedAt) : null;
    this.editedAt = editedAt ? String(editedAt) : null;
    this.locationPrecision = locationPrecision === 'approximate' ? 'approximate' : 'precise';
  }

  static fromJSON(json = {}) {
    return new Barang(json || {});
  }

  toJSON() {
    return {
      id: this.id,
      nama: this.nama,
      kategori: this.kategori,
      deskripsi: this.deskripsi,
      lokasi: this.lokasi,
      tanggal: this.tanggal,
      image: this.image,
      jenisLaporan: this.jenisLaporan,
      status: this.status,
      pelapor: this.pelapor,
      ownerId: this.ownerId,
      verificationStatus: this.verificationStatus,
      latitude: Number.isFinite(this.latitude) ? this.latitude : null,
      longitude: Number.isFinite(this.longitude) ? this.longitude : null,
      accuracy: Number.isFinite(this.accuracy) ? this.accuracy : null,
      alamat: this.alamat,
      matchedReportId: Number.isFinite(this.matchedReportId) ? this.matchedReportId : null,
      matchedAt: this.matchedAt,
      editedAt: this.editedAt,
      locationPrecision: this.locationPrecision,
    };
  }
}

export const mapBarang = (item = {}) => Barang.fromJSON(item).toJSON();

export default Barang;
