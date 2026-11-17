# Week 2 — React Native UI, Responsive Layout & Accessibility

Dokumen ini memetakan task pada PPT Week 2 ke interface TemuBarang. Contoh PresidentKu pada slide digunakan sebagai contoh pembelajaran; implementasi mengikuti tema dan kebutuhan TemuBarang.

## Task 01 — Build the Mobile UI

- Project menggunakan React Native dan Expo.
- UI dibangun dari komponen `View`, `Text`, `Image`, `Pressable`, `TextInput`, `ScrollView`, `FlatList`, dan komponen reusable seperti `Header`, `SearchBar`, `ItemCard`, `CategoryList`, `LatestItems`, serta `BottomNav`.
- Halaman utama memiliki header, area pencarian, aksi laporan hilang/temuan, kategori, daftar barang terbaru, dan navigasi.
- Form dan detail laporan menggunakan hierarki informasi yang sesuai dengan alur TemuBarang.

## Task 02 — Make the UI Responsive

- `app.json` memakai orientasi `default` agar aplikasi dapat diuji dalam portrait dan landscape.
- `App.js` menggunakan `useWindowDimensions()` untuk mendeteksi lebar layar dan menyesuaikan `maxWidth` serta padding konten.
- Layout menggunakan Flexbox dan komponen yang dapat membungkus konten.
- Uji manual sesuai matriks berikut:

| Skenario | Pemeriksaan |
|---|---|
| Layar kecil/phone | Tidak ada komponen keluar layar; teks dan tombol tetap terbaca |
| Layar normal/phone | Spacing dan hierarki tetap nyaman |
| Layar lebar/tablet | Konten memiliki lebar maksimum dan tidak melebar berlebihan |
| Portrait | Navigasi, form, dan daftar dapat digunakan |
| Landscape | Form/daftar dapat discroll; tombol tidak tertutup dan teks tidak terpotong |

## Task 03 — Inclusive Design & Accessibility

- Komponen tombol menggunakan `accessibilityRole`, `accessibilityLabel`, dan bila relevan `accessibilityHint` serta `accessibilityState`.
- Pesan status menggunakan `accessibilityLiveRegion` agar perubahan status dapat diumumkan oleh teknologi pembaca layar.
- Teks menggunakan kontras warna yang jelas dan ukuran yang dapat dibaca.
- Target sentuh kontrol utama disetel minimal sekitar 44 dp.
- Informasi penting tidak hanya dibedakan dengan warna: jenis laporan, status, dan pesan juga memiliki label teks.

## Pemeriksaan sebelum demo

- [ ] Jalankan aplikasi di Expo Go.
- [ ] Uji ukuran layar kecil, normal, dan lebar/tablet.
- [ ] Uji portrait dan landscape.
- [ ] Pastikan tidak ada teks terpotong atau komponen keluar layar.
- [ ] Pastikan semua tombol utama mudah disentuh.
- [ ] Periksa label/role/hint pada elemen interaktif menggunakan screen reader jika tersedia.
- [ ] Pastikan warna bukan satu-satunya pembeda status.

Catatan: pengujian visual dan screen reader harus dilakukan pada perangkat/emulator. Source code saja tidak membuktikan semua ukuran layar dan teknologi aksesibilitas sudah lulus.
