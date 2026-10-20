# Week 6 Task 02 — Loading, Error & Retry

**Aplikasi:** TemuKampus (Aplikasi Pelaporan Barang Hilang & Ditemukan di Kampus)  
**Pelaksana (Orang 2):** frmaannn (`frmaannn` / `firmanvirdauz@gmail.com`)  
**Tanggung Jawab:** Senior React Native Developer, UI/UX Developer, API Integration Specialist, dan Git Specialist  
**Fokus Utama:** Mengembangkan mekanisme antarmuka pengguna (*UI Feedback States*) pada aplikasi TemuKampus selama dan setelah interaksi API berlangsung:
1. **Loading State:** Memberikan umpan balik visual animasi saat request API sedang berjalan.
2. **Error State:** Menampilkan pesan kesalahan yang jelas ketika terjadi kegagalan (server error, HTTP client error, atau gangguan jaringan).
3. **Empty State:** Menampilkan pesan khusus ketika data barang kosong, dibedakan secara tegas dari kondisi error.
4. **Retry Button ("Coba Lagi"):** Tombol interaktif untuk memicu pengambilan ulang data dari server tanpa me-restart aplikasi.
5. **Pencegahan Request Ganda:** Memastikan tidak terjadi request ganda/berulang (*duplicate in-flight request*) saat tombol ditekan berulang kali.
6. **Accessibility:** Menambahkan atribut aksesibilitas (`accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityLiveRegion`).

---

## 1. Komponen Antarmuka State

### 1.1 LoadingStateView
Menggunakan `ActivityIndicator` dan teks indikator status:
```jsx
function LoadingStateView({message='Memuat data barang...'}){
 return <View style={styles.stateContainer} accessibilityRole="progressbar" accessibilityLabel={message}>
  <ActivityIndicator size="large" color={primary}/>
  <Text style={styles.stateText}>{message}</Text>
 </View>;
}
```

### 1.2 ErrorStateView & Tombol Coba Lagi
Menyajikan umpan balik kegagalan beserta tombol retry interaktif yang memiliki pencegahan request ganda:
```jsx
function ErrorStateView({error,onRetry,retrying=false,isOffline=false}){
 const isTimeout = Boolean(error?.isTimeout);
 const isNetErr = Boolean(error?.isNetworkError || error?.status === 0);

 let title = 'Gagal Mengambil Data';
 let msg = error?.message || 'Gagal mengambil data barang. Silakan coba lagi.';
 let icon = '⚠️';

 if (isOffline) {
  icon = '📡🚫';
  title = 'Tidak Ada Koneksi Internet';
  msg = 'Periksa koneksi Anda dan coba lagi.';
 } else if (isTimeout) {
  icon = '⏱️';
  title = 'Koneksi Waktu Habis';
  msg = 'Server membutuhkan waktu terlalu lama untuk merespons. Periksa koneksi Anda dan coba lagi.';
 } else if (isNetErr) {
  icon = '🔌';
  title = 'Server Tidak Terjangkau';
  msg = 'Perangkat terhubung ke jaringan, tetapi server API TemuKampus tidak dapat dijangkau. Pastikan server lokal aktif.';
 } else if (error?.status >= 500) {
  icon = '🖥️';
  title = 'Gangguan Server';
  msg = error?.message || 'Terjadi kesalahan pada server (5xx). Silakan coba lagi nanti.';
 } else if (error?.status >= 400) {
  icon = '⚠️';
  title = 'Permintaan Gagal';
  msg = error?.message || 'Permintaan tidak dapat diproses oleh server.';
 }

 return <View style={styles.stateContainer} accessibilityLiveRegion="polite">
  <Text style={styles.stateIcon}>{icon}</Text>
  <Text style={styles.stateTitle} accessibilityRole="header">{title}</Text>
  <Text style={styles.stateMessage}>{msg}</Text>
  {onRetry && (
   <UIButton
    title={retrying ? 'Memproses...' : 'Coba Lagi'}
    onPress={onRetry}
    disabled={retrying}
    accessibilityLabel="Coba Lagi"
    accessibilityHint="Mencoba kembali mengambil data barang dari server setelah koneksi aktif"
    style={styles.retryBtn}
   />
  )}
 </View>;
}
```

### 1.3 EmptyStateView
Membedakan kondisi data kosong dari kondisi error:
```jsx
function EmptyStateView({title='Belum Ada Barang',message='Belum ada laporan barang.'}){
 return <View style={styles.stateContainer}>
  <Text style={styles.stateIcon}>📦</Text>
  <Text style={styles.stateTitle} accessibilityRole="header">{title}</Text>
  <Text style={styles.stateMessage}>{message}</Text>
 </View>;
}
```

---

## 2. Mekanisme Retry & Pencegahan Request Ganda

Pada `App.js`, fungsi `handleRetry` dilengkapi guard in-flight:
```javascript
const handleRetry = useCallback(async () => {
  if (loadingItems) return; // Cegah request ganda saat request sedang berlangsung
  try {
    const state = await NetInfo.fetch();
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    setIsOnline(online);
    if (!online) {
      Alert.alert('Tidak Ada Koneksi Internet', 'Periksa koneksi Anda dan coba lagi.');
      return;
    }
  } catch {}
  await refreshItems();
}, [loadingItems, refreshItems]);
```

---

## 3. Hasil Pengujian Otomatis

Pengujian dijalankan melalui suite tes `server/server.test.js`:

```text
✔ Week 6 Task 02 - Loading, Error, Retry, and Empty State Lifecycle
  - Loading State Lifecycle (Active saat fetch, nonaktif setelah selesai)
  - Error State Lifecycle (Menangkap error 500 dan memunculkan pesan error)
  - Retry Mechanism (Error -> Coba Lagi -> Berhasil memuat data)
  - Pencegahan Request Ganda (Debouncing in-flight request blocking)
  - Empty State Distinction (Data kosong dibedakan dari Error State)
```

Status Pengujian: **PASS (100%)**
