# Week 3 — Authentication & Local Data Security

Dokumen ini memetakan materi Pertemuan 3 pada PPT dosen: autentikasi pengguna, validasi credential, pemisahan data biasa dan data sensitif, Secure Storage, serta validasi keamanan.

## 1. Authentication

Pada TemuBarang, pengguna membuat akun atau masuk melalui form autentikasi.

- `App.js` — `doRegister()` memvalidasi nama, email, panjang password, dan konfirmasi password sebelum mengirim registrasi.
- `App.js` — `doLogin()` memvalidasi input, mengirim credential ke API, menerima access token dan profil, lalu mengubah authentication state.
- `services/api.js` — `registerUser()` dan `loginWithAPI()` mengirim request ke endpoint autentikasi backend.
- `server/server.js` — backend memverifikasi password yang telah di-hash dengan scrypt; password plaintext tidak disimpan.

## 2. Normal Data vs Sensitive Data

| Jenis data | Penyimpanan TemuBarang | Contoh |
|---|---|---|
| Data biasa | AsyncStorage | Preferensi mode ringkas, profil non-sensitif, alamat API lokal |
| Data sensitif | Expo SecureStore | Access token dan refresh token |
| Password | Tidak disimpan di perangkat | Hanya dikirim saat login/register melalui request HTTPS pada deployment; server menyimpan hash password |

`storage/session.js` menggunakan `expo-secure-store` untuk token dan AsyncStorage untuk preferensi/profil non-sensitif. Nama key `temukampus_*` yang lama dipertahankan untuk kompatibilitas data lokal; nama tersebut bukan nama tampilan aplikasi.

## 3. Secure Storage

- `saveSession()` menyimpan access token dan refresh token di SecureStore.
- `getToken()` dan `getRefreshToken()` membaca token dari SecureStore.
- `clearSession()` menghapus token dari SecureStore dan profil cache dari AsyncStorage.
- `savePreference()` hanya menyimpan preferensi UI di AsyncStorage.

Jangan menyimpan password plaintext atau token pada AsyncStorage.

## 4. Security Validation

Materi meminta pengujian credential benar/salah, input kosong, logout, dan perlindungan data sensitif. Jalankan skenario berikut:

| Skenario | Hasil yang diharapkan |
|---|---|
| Email/password benar | Login berhasil dan authentication state aktif |
| Password salah | Login ditolak dengan pesan yang sesuai |
| Input kosong | Validasi form menolak sebelum request |
| Password tidak memenuhi aturan | Validasi menampilkan pesan |
| Logout | Token di SecureStore dihapus dan pengguna kembali ke layar login |
| Endpoint terlindungi tanpa token | Backend menolak request |
| Data sensitif | Token tidak ditemukan di AsyncStorage |

## 5. File penerapan

- `App.js` — form register/login, validasi, authentication state, logout.
- `services/api.js` — request register/login dan endpoint terautentikasi.
- `storage/session.js` — SecureStore dan AsyncStorage.
- `server/server.js` — hash password, verifikasi credential, JWT/session backend.
- `server/server.test.js` — pengujian autentikasi dan endpoint.

## 6. Checklist demo

- [ ] Register dengan input valid.
- [ ] Register dengan input kosong atau email tidak valid.
- [ ] Login dengan credential benar.
- [ ] Login dengan password salah.
- [ ] Tunjukkan bahwa token disimpan melalui SecureStore, bukan AsyncStorage.
- [ ] Logout dan pastikan session lokal dibersihkan.
- [ ] Coba endpoint protected tanpa token dan pastikan akses ditolak.

Catatan: Week 3 menekankan autentikasi dan keamanan data lokal. Detail token-based API, Bearer header, refresh token, dan HTTPS juga dibahas pada materi Secure API Week 5.
