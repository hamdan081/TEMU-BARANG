# Week 4 Task 03 — Display API Data

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 3):** Fawwaz (`fawwaz` / `icamrz8@gmail.com`)  
**Tanggung Jawab:** Front-End Developer, API Integration Developer & Git Specialist  
**Fokus:** Menampilkan data REST API pada antarmuka pengguna (UI) TemuKampus sehingga daftar barang menjadi dinamis menggunakan FlatList, menghubungkan hasil Data Model dari Task 01 dan REST API Client dari Task 02.

---

## 1. Ringkasan Tugas & Hasil Integrasi

Pada tahap ini, seluruh daftar barang yang sebelumnya bersifat statis (*hard-coded*) pada UI digantikan sepenuhnya oleh data dinamis yang bersumber dari REST API backend melalui endpoint `GET /barang`.

Hasil integrasi mencakup:
1. **React State Management:** Mengelola `items`, `loadingItems`, `itemsError`, filter pencarian `search`, filter kategori `category`, status barang `statusFilter`, dan item terpilih `selected`.
2. **Komponen `FlatList`:** Menampilkan daftar barang secara efisien dengan *lazy loading*, pull-to-refresh (`onRefresh`), dan penanganan *empty state*.
3. **Komponen `ItemCard`:** Setiap card menampilkan nama barang, kategori, lokasi, tanggal, status dengan badge berwarna, serta gambar/thumbnail (dengan fallback placeholder jika foto kosong atau gagal dimuat).
4. **Data Model & DTO Integration:** Menggunakan `mapBarang` dan class `Barang` dari Task 01 (`models/Barang.js`) untuk memvalidasi dan memetakan struktur JSON API ke DTO yang aman bagi UI.
5. **Bagian "Barang Terbaru" (Home):** Komponen `LatestItems.js` kini menerima data dinamis dari state API (`items.slice(0, 3)`) dan membuka detail item saat ditekan.
6. **Layar Detail Barang:** Menampilkan informasi lengkap sesuai item yang dipilih pengguna (nama, status, kategori, lokasi, tanggal, pelapor, deskripsi/ciri-ciri, verifikasi, dan gambar beresolusi penuh).
7. **Pencarian & Filter Kategori:** Fitur pencarian multi-field (nama, lokasi, kategori, deskripsi) dan filter kategori (`categories` dari `models/Barang.js`) bekerja secara dinamis terhadap data API.
8. **Loading, Error, & Empty State:** Spinner `ActivityIndicator`, pesan error ramah pengguna (misal API offline/timeout), dan pesan saat tidak ada barang yang sesuai.

---

## 2. File UI yang Dibuat & Dimodifikasi

| File | Status | Peran & Perubahan |
|---|---|---|
| [`App.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/App.js) | Dimodifikasi | Menyimpan state API (`items`, `loadingItems`, `itemsError`, dsb), fungsi `refreshItems()`, implementasi `FlatList` pada tab Daftar, integrasi modal/layar Detail Barang, serta pemfilteran dinamis. |
| [`components/ItemCard.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/components/ItemCard.js) | Dibuat | Komponen card item untuk `FlatList` dan `LatestItems`. Menampilkan nama, kategori, lokasi, tanggal, status badge, foto dengan `resolveImageUrl` & fallback emoji box, serta label accessibility. |
| [`components/LatestItems.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/components/LatestItems.js) | Dimodifikasi | Menghapus data hard-coded (Dompet Hitam & Kunci Motor statis). Menerima props `{ items, onOpen, onViewAll }` dan merender card dinamis dari 3 data terbaru API beserta fallback empty state. |
| [`components/CategoryList.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/components/CategoryList.js) | Dimodifikasi | Menggunakan daftar kategori dari `models/Barang.js`, mendukung interaksi `onSelect(category)` untuk memfilter daftar barang secara dinamis. |
| [`components/ActionMenu.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/components/ActionMenu.js) | Dimodifikasi | Mendukung callback navigasi pelaporan cepat (`onLost`, `onFound`). |
| [`components/BottomNav.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/components/BottomNav.js) | Dimodifikasi | Navigasi tab interaktif (Beranda, Daftar, Lapor, Profil) dengan state aktif. |
| [`components/SearchBar.js`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/components/SearchBar.js) | Dimodifikasi | Menerima value dan event `onChangeText` untuk pencarian realtime pada `FlatList`. |
| [`docs/week4/task3.md`](file:///c:/Users/LENOVO/Downloads/TemuKampus_Reaudit_Final/TEMU-BARANG/docs/week4/task3.md) | Dibuat | Dokumentasi lengkap implementasi Task 03 ini. |

---

## 3. Alur Data: API → JSON → Mapping → State → UI

```
┌────────────────────────────────────────────────────────┐
│ 1. REST API (Node.js Server)                           │
│    Endpoint: GET /barang (Protected Bearer Token)      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP 200 JSON
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Raw JSON Response                                   │
│    { "data": [ { "id": 1, "nama": "...", ... } ] }     │
└───────────────────────────┬────────────────────────────┘
                            │ response.data.map(mapBarang)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Data Model & DTO Mapping (models/Barang.js)         │
│    - mapBarang() membersihkan tipe data                │
│    - Default fallback untuk field null/undefined       │
└───────────────────────────┬────────────────────────────┘
                            │ DTO Array
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. React State (App.js)                                │
│    - setItems(list)                                    │
│    - filtered = useMemo(...) berdasarkan pencarian     │
│    - setLoadingItems(false)                            │
└───────────────────────────┬────────────────────────────┘
                            │ Props data
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. UI Rendering                                        │
│    - FlatList pada layar "Daftar Barang"               │
│    - LatestItems pada layar "Beranda"                  │
│    - Detail Screen pada layar "Detail Barang"          │
└────────────────────────────────────────────────────────┘
```

---

## 4. Implementasi FlatList

Komponen `FlatList` diimplementasikan pada layar **Daftar Barang** (`App.js`):

```jsx
<FlatList
  data={filtered}
  keyExtractor={item => String(item.id)}
  renderItem={({ item }) => (
    <ItemCard
      item={item}
      compact={compactMode}
      onPress={() => selectItem(item)}
    />
  )}
  contentContainerStyle={[
    styles.listContent,
    { maxWidth: wide ? 860 : 600, paddingHorizontal: wide ? 30 : 18 }
  ]}
  ListEmptyComponent={
    <Text style={styles.muted}>
      {loadingItems ? 'Memuat data...' : 'Tidak ada barang yang sesuai.'}
    </Text>
  }
  refreshing={loadingItems}
  onRefresh={refreshItems}
/>
```

### Fitur FlatList:
- **`data={filtered}`:** Menampilkan hasil filter gabungan antara query teks dan kategori aktif.
- **`keyExtractor`:** Menggunakan `String(item.id)` sebagai key stabil dan unik.
- **`renderItem`:** Merender `ItemCard` yang modular dan responsif.
- **`ListEmptyComponent`:** Menampilkan umpan balik ketika data kosong atau sedang dimuat.
- **`refreshing` & `onRefresh`:** Mendukung gestur *pull-to-refresh* untuk mengambil ulang data terbaru dari REST API.

---

## 5. Implementasi ItemCard (`components/ItemCard.js`)

Setiap kartu barang menampilkan:
- **Nama barang** (`item.nama`)
- **Kategori & Tanggal** (`item.kategori • item.tanggal`)
- **Lokasi** (`📍 item.lokasi`)
- **Badge Status** (`Hilang`: merah muda, `Ditemukan`: hijau muda, `Dikembalikan`: indigo)
- **Gambar:** Menggunakan `Image` dengan URL yang di-resolve (`resolveImageUrl(item.image)`). Jika URL kosong atau gagal dimuat (`onError`), kartu secara elegan menampilkan placeholder box (`📦`).
- **Aksesibilitas:** Dilengkapi `accessibilityRole="button"`, `accessibilityLabel`, dan `accessibilityHint`.

---

## 6. Penanganan Loading, Error, dan Empty State

1. **Loading State:**
   - Spinner `ActivityIndicator` ditampilkan saat pengambilan data awal atau saat booting sesi.
   - Indikator `refreshing` pada `FlatList` aktif saat pengguna melakukan pull-to-refresh.
   - Tombol "Muat ulang data barang" dinonaktifkan (`disabled={loadingItems}`) saat proses pemuatan berlangsung.

2. **Error State:**
   - Pesan error ditangkap melalui `try/catch` dan ditampilkan via komponen `StatusMessage` dengan gaya teks merah yang kontras.
   - Jika sesi berakhir (HTTP 401), aplikasi secara otomatis membersihkan token lokal dan mengarahkan pengguna ke halaman login dengan notifikasi yang jelas.

3. **Empty State:**
   - Jika server mengembalikan array kosong (`[]`), UI menampilkan: `"Tidak ada barang yang sesuai."` atau `"Belum ada laporan barang."`.
   - Tidak pernah menampilkan raw JSON atau layar putih kosong (*blank screen*).

---

## 7. Hasil Pengujian

Pengujian unit dan otomatisasi backend dijalankan untuk memastikan endpoint REST API yang dikonsumsi oleh UI berfungsi dengan sempurna:

```bash
npm run test:api
```

**Hasil:**
```
✔ Week 4 REST API + Week 5 token authentication, protected route, logout (496ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Semua pengujian lolos (100% PASS).
