/**
 * Data Model & DTO Barang - TemuKampus
 * Week 4 Task 01: Model The Data
 * 
 * Resource: Barang
 * Field:
 * - id (Number): Pengenal unik barang
 * - nama (String): Nama atau judul barang
 * - kategori (String): Kategori barang (Elektronik, Dokumen, Pakaian, Aksesoris, Perlengkapan, Lainnya)
 * - deskripsi (String): Rincian spesifikasi atau kronologi barang
 * - lokasi (String): Tempat kehilangan atau penemuan
 * - tanggal (String): Tanggal kejadian format YYYY-MM-DD
 * - image (String): URL atau path gambar barang
 * - status (String): "Hilang" | "Ditemukan" | "Dikembalikan"
 * - pelapor (String): Nama pelapor barang
 * - ownerId (Number): ID user pembuat laporan (relasi ke User)
 * - verificationStatus (String): "Belum diverifikasi" | "Terverifikasi"
 */

export const categories = [
  'Elektronik',
  'Dokumen',
  'Pakaian',
  'Aksesoris',
  'Perlengkapan',
  'Lainnya',
];

/**
 * Representasi kelas Data Model Barang
 */
export class Barang {
  constructor({
    id = 0,
    nama = '',
    kategori = 'Lainnya',
    deskripsi = '',
    lokasi = '',
    tanggal = '',
    image = '',
    status = 'Hilang',
    pelapor = '',
    ownerId = 0,
    verificationStatus = 'Belum diverifikasi',
  } = {}) {
    this.id = Number(id ?? 0);
    this.nama = String(nama ?? '');
    this.kategori = String(kategori ?? 'Lainnya');
    this.deskripsi = String(deskripsi ?? '');
    this.lokasi = String(lokasi ?? '');
    this.tanggal = String(tanggal ?? '');
    this.image = String(image ?? '');
    this.status = String(status ?? 'Hilang');
    this.pelapor = String(pelapor ?? '');
    this.ownerId = Number(ownerId ?? 0);
    this.verificationStatus = String(verificationStatus ?? 'Belum diverifikasi');
  }

  /**
   * Factory method untuk konversi JSON Object ke instance Barang
   * @param {Object} json
   * @returns {Barang}
   */
  static fromJSON(json = {}) {
    const data = json || {};
    return new Barang(data);
  }

  /**
   * Serialisasi instance Barang ke JSON Object (DTO murni)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      nama: this.nama,
      kategori: this.kategori,
      deskripsi: this.deskripsi,
      lokasi: this.lokasi,
      tanggal: this.tanggal,
      image: this.image,
      status: this.status,
      pelapor: this.pelapor,
      ownerId: this.ownerId,
      verificationStatus: this.verificationStatus,
    };
  }
}

/**
 * Week 4 DTO mapping function:
 * Memastikan payload response dari REST API memiliki tipe data & default yang aman untuk UI.
 * @param {Object} item - Data barang mentah dari response API
 * @returns {Object} DTO Barang yang siap dikonsumsi komponen UI
 */
export const mapBarang = (item = {}) => {
  const safeItem = item || {};
  return {
    id: Number(safeItem.id ?? 0),
    nama: String(safeItem.nama ?? ''),
    kategori: String(safeItem.kategori ?? 'Lainnya'),
    deskripsi: String(safeItem.deskripsi ?? ''),
    lokasi: String(safeItem.lokasi ?? ''),
    tanggal: String(safeItem.tanggal ?? ''),
    image: String(safeItem.image ?? ''),
    status: String(safeItem.status ?? ''),
    pelapor: String(safeItem.pelapor ?? ''),
    ownerId: Number(safeItem.ownerId ?? 0),
    verificationStatus: String(safeItem.verificationStatus ?? 'Belum diverifikasi'),
  };
};

export default Barang;
