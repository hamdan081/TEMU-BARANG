# Week 1 — Course Orientation & Project Kickoff

Dokumen ini mengadaptasi keluaran kickoff pada materi dosen ke proyek TemuBarang. Materi Week 1 meminta tim memulai dari masalah pengguna, merumuskan solusi, menentukan aplikasi dan fitur minimum, menyusun product canvas, serta menyiapkan repository tim.

## Product canvas TemuBarang

| Elemen | Rumusan proyek |
|---|---|
| Pengguna | Mahasiswa dan sivitas kampus yang kehilangan atau menemukan barang di lingkungan kampus |
| Masalah | Informasi barang hilang dan barang temuan tersebar; pemilik sulit mengetahui apakah barangnya ditemukan dan bagaimana mengurus pengembalian |
| Solusi | Aplikasi mobile untuk membuat laporan hilang/temuan, melihat laporan, mencari potensi kecocokan, mengajukan klaim kepemilikan, dan memantau pengembalian |
| Nama aplikasi | TemuBarang |
| Platform | React Native + Expo |
| Fitur minimum | Registrasi/login, daftar laporan, form laporan hilang/temuan, detail laporan, dan pengelolaan status |
| Pengembangan lanjutan | Foto, pencocokan laporan, verifikasi ciri rahasia, peta lokasi, sensor Pengaman Meja |

## Workflow pengembangan tim

Ikuti siklus yang dijelaskan pada materi: **Backlog → Sprint → Build → Test → Demo → Improve**. Setiap sprint memilih kebutuhan dari backlog, membangun fitur, menguji, mendemonstrasikan, lalu memperbaiki berdasarkan umpan balik.

## Pembagian peran yang disarankan

| Peran | Tanggung jawab |
|---|---|
| UI/Frontend | Komponen React Native, navigasi, tampilan form dan daftar |
| Backend/API | Endpoint, validasi, autentikasi, penyimpanan data |
| Device Feature/Integration | GPS, Map, sensor, integrasi dan pengujian perangkat |
| Seluruh anggota | Review kode, memahami alur aplikasi, dokumentasi, dan mampu menjelaskan kontribusi masing-masing |

Peran dapat disesuaikan dengan jumlah anggota kelompok. Pembagian peran tidak menggantikan kewajiban setiap anggota memahami aplikasi secara keseluruhan.

## GitHub sebagai tempat kerja tim

- Repository menyimpan source code dan dokumentasi.
- Branch digunakan untuk mengerjakan fitur secara terpisah.
- Commit mencatat perubahan yang benar-benar dilakukan.
- Pull Request meminta review sebelum perubahan digabungkan.
- Jangan memasukkan `.env`, token, password, `node_modules`, atau data pengguna.

## Checkpoint penggunaan AI

Mengikuti materi Week 1, AI digunakan sebagai asisten development, bukan pengganti pemahaman. Sebelum mengumpulkan kode, setiap anggota harus dapat: **Understand** (menjelaskan kode), **Verify** (memeriksa kebenaran dan keamanan), dan **Modify** (menyesuaikan kode dengan kebutuhan TemuBarang).

## Bukti yang perlu disiapkan untuk demo

- Product canvas dan alasan memilih masalah.
- Repository GitHub dan riwayat commit/PR setiap anggota.
- Backlog atau daftar fitur yang dikerjakan.
- Demo alur laporan hilang hingga pengembalian.
- Penjelasan kontribusi pribadi masing-masing anggota.
