/**
 * Data Model & DTO Barang - TemuKampus.
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
  'Menunggu Verifikasi',
  'Menunggu Pengambilan',
  'Selesai Dikembalikan',
  'Belum Terselesaikan',
];

export function normalizeBarangStatus(status, jenisLaporan, verificationStatus) {
  const legacy = String(status ?? '');
  let normalized = legacy;
  if (legacy === 'Hilang') normalized = 'Belum Ditemukan';
  if (legacy === 'Ditemukan') normalized = 'Menunggu Pemilik';
  if (legacy === 'Dikembalikan') normalized = 'Selesai Dikembalikan';
  if (legacy === 'Menunggu Verifikasi') {
    normalized = jenisLaporan === 'Ditemukan' ? 'Menunggu Pemilik' : 'Belum Ditemukan';
  }
  if (verificationStatus === 'Terverifikasi' && normalized !== 'Selesai Dikembalikan' && normalized !== 'Belum Terselesaikan') {
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
    };
  }
}

export const mapBarang = (item = {}) => Barang.fromJSON(item).toJSON();

export default Barang;
