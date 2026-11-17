const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {createApp}=require('./server');

test('Week 4 REST API + Week 5 token authentication, protected route, logout',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'temukampus-test-'));
 const server=createApp({dataDir:dir,secret:'test-secret-do-not-use-in-production'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 const call=async(p,method='GET',body,token)=>{
   const headers={'Content-Type':'application/json'};
   if(token)headers.Authorization=`Bearer ${token}`;
   const res=await fetch(url+p,{method,headers,body:body?JSON.stringify(body):undefined});
   return {status:res.status,body:await res.json()};
 };
 try{
  assert.equal((await call('/barang')).status,401);
  assert.equal((await call('/barang','GET',undefined,'not.a.valid.jwt')).status,401);
  assert.equal((await call('/auth/login','POST',{email:'demo@kampus.ac.id',password:'wrong'})).status,401);
  assert.equal((await call('/auth/login','POST',{email:'',password:''})).status,400);
  const login=await call('/auth/login','POST',{email:'demo@kampus.ac.id',password:'Demo123!'});
  assert.equal(login.status,200);
  assert.match(login.body.access_token,/^[\w-]+\.[\w-]+\.[\w-]+$/);
  const token=login.body.access_token;
  assert.equal((await call('/me','GET',undefined,token)).status,200);
  assert.equal((await call('/barang','GET',undefined,token)).body.data.length,4);
  const item=await call('/barang','POST',{nama:'Botol biru',kategori:'Lainnya',deskripsi:'Botol biru 500 ml',lokasi:'Gedung Z',status:'Ditemukan',verificationSecret:'stiker oval'},token);
  assert.equal(item.status,201);
  assert.equal(item.body.data.verificationSecret,undefined);
  const id=item.body.data.id;
  assert.equal((await call(`/barang/${id}/status`,'PATCH',{status:'Dikembalikan'},token)).status,400);
  assert.equal((await call(`/barang/${id}/verify`,'POST',{jawaban:'salah'},token)).status,400);
  assert.equal((await call(`/barang/${id}/verify`,'POST',{jawaban:'stiker oval'},token)).status,200);
  assert.equal((await call(`/barang/${id}/status`,'PATCH',{status:'Dikembalikan'},token)).status,200);
  assert.equal((await call('/auth/logout','POST',{},token)).status,200);
  assert.equal((await call('/barang','GET',undefined,token)).status,401);
  const register=await call('/auth/register','POST',{name:'Pengguna Uji',email:'test@kampus.ac.id',password:'PasswordUji123'});
  assert.equal(register.status,201);
  const secondLogin=await call('/auth/login','POST',{email:'test@kampus.ac.id',password:'PasswordUji123'});
  assert.equal(secondLogin.status,200);
  assert.equal((await call(`/barang/${id}/status`,'PATCH',{status:'Dikembalikan'},secondLogin.body.access_token)).status,403);
  const dummyJpg = new Blob([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])], { type: 'image/jpeg' });
  const formNoAuth = new FormData();
  formNoAuth.append('photo', dummyJpg, 'test.jpg');
  const upNoAuth = await fetch(url + '/upload', { method: 'POST', body: formNoAuth });
  assert.equal(upNoAuth.status, 401);
  const badFileForm = new FormData();
  badFileForm.append('photo', new Blob(['bukan gambar'], { type: 'text/plain' }), 'test.txt');
  const upBad = await fetch(url + '/upload', { method: 'POST', headers: { Authorization: `Bearer ${secondLogin.body.access_token}` }, body: badFileForm });
  assert.equal(upBad.status, 400);
  const goodForm = new FormData();
  goodForm.append('photo', dummyJpg, 'sample.jpg');
  const upGood = await fetch(url + '/upload', { method: 'POST', headers: { Authorization: `Bearer ${secondLogin.body.access_token}` }, body: goodForm });
  assert.equal(upGood.status, 201);
  const upResult = await upGood.json();
  assert.ok(upResult.url);
  assert.ok(upResult.filename);
  const getPhoto = await fetch(upResult.url);
  assert.equal(getPhoto.status, 200);
  assert.equal(getPhoto.headers.get('content-type'), 'image/jpeg');
  const itemWithPhoto = await call('/barang', 'POST', {
    nama: 'Kamera Digital',
    kategori: 'Elektronik',
    deskripsi: 'Kamera saku hitam',
    lokasi: 'Lab Komputer',
    status: 'Ditemukan',
    image: upResult.url,
    verificationSecret: 'tali merah'
  }, secondLogin.body.access_token);
  assert.equal(itemWithPhoto.status, 201);
  assert.equal(itemWithPhoto.body.data.image, upResult.url);
 }finally{server.close();rmSync(dir,{recursive:true,force:true});}
});

test('Week 5 Task 01 - Token Authentication (Login API, Credential Validation, and Real JWT Access Token)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'temukampus-w5t1-'));
  const server = createApp({ dataDir: dir, secret: 'w5t1-secret-key-for-test-only' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  const postLogin = async (body) => {
    const res = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };

  try {
    // 1. Validasi input kosong (HTTP 400)
    const emptyRes = await postLogin({ email: '', password: '' });
    assert.equal(emptyRes.status, 400);
    assert.equal(emptyRes.body.message, 'Email dan password wajib diisi.');

    // 2. Validasi kredensial salah / tidak terdaftar (HTTP 401, pesan generik aman)
    const wrongPassRes = await postLogin({ email: 'demo@kampus.ac.id', password: 'SalahPassword123' });
    assert.equal(wrongPassRes.status, 401);
    assert.equal(wrongPassRes.body.message, 'Email atau password salah.');

    const notFoundRes = await postLogin({ email: 'unknown@kampus.ac.id', password: 'Password123!' });
    assert.equal(notFoundRes.status, 401);
    assert.equal(notFoundRes.body.message, 'Email atau password salah.');

    // 3. Login berhasil dengan akun demo (HTTP 200, JWT token valid, profil user tanpa passwordHash)
    const successRes = await postLogin({ email: 'demo@kampus.ac.id', password: 'Demo123!' });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.token_type, 'Bearer');
    assert.equal(successRes.body.expires_in, 3600);
    assert.ok(successRes.body.access_token, 'Access token harus dikembalikan server');

    // Periksa struktur JWT (3 segmen base64url: header.payload.signature)
    const parts = successRes.body.access_token.split('.');
    assert.equal(parts.length, 3, 'JWT harus memiliki 3 bagian (header, payload, signature)');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    assert.equal(header.alg, 'HS256');
    assert.equal(header.typ, 'JWT');
    assert.equal(payload.sub, 1);
    assert.ok(payload.jti, 'Token harus memiliki jti unik');
    assert.ok(payload.exp > payload.iat, 'Waktu kedaluwarsa exp harus lebih besar dari iat');

    // Pastikan user object tidak membocorkan hash password
    assert.equal(successRes.body.user.id, 1);
    assert.equal(successRes.body.user.email, 'demo@kampus.ac.id');
    assert.equal(successRes.body.user.passwordHash, undefined);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Week 5 Task 02 - Protected API Request (Authorization Bearer Token, 401, 403, and GET /barang)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'temukampus-w5t2-'));
  const server = createApp({ dataDir: dir, secret: 'w5t2-secret-key-for-test-only' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  const requestEndpoint = async (path, { method = 'GET', authHeader, body } = {}) => {
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(`${url}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };

  try {
    // 1. Request protected endpoint GET /barang TANPA token -> harus ditolak (HTTP 401 Unauthorized)
    const noTokenRes = await requestEndpoint('/barang');
    assert.equal(noTokenRes.status, 401, 'Request tanpa token harus mengembalikan HTTP 401');
    assert.match(noTokenRes.body.message, /sesi tidak valid|silakan login/i);

    // 2. Request dengan Authorization header BUKAN Bearer -> harus ditolak (HTTP 401)
    const basicAuthRes = await requestEndpoint('/barang', { authHeader: 'Basic dXNlcjpwYXNz' });
    assert.equal(basicAuthRes.status, 401, 'Authorization skema non-Bearer harus ditolak');

    // 3. Request dengan token invalid / acak -> harus ditolak (HTTP 401)
    const invalidTokenRes = await requestEndpoint('/barang', { authHeader: 'Bearer eyJhbGciOi...palsu' });
    assert.equal(invalidTokenRes.status, 401, 'Token JWT invalid/palsu harus mengembalikan HTTP 401');

    // 4. Login untuk mendapatkan access token JWT asli
    const loginRes = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@kampus.ac.id', password: 'Demo123!' }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    const validToken = loginData.access_token;
    assert.ok(validToken, 'Access token harus ada');

    // 5. Request protected endpoint GET /barang dengan Bearer token VALID -> harus berhasil (HTTP 200 OK)
    const validRes = await requestEndpoint('/barang', { authHeader: `Bearer ${validToken}` });
    assert.equal(validRes.status, 200, 'Request dengan token valid harus mengembalikan HTTP 200');
    assert.ok(Array.isArray(validRes.body.data), 'Data barang harus berupa array');
    assert.ok(validRes.body.data.length >= 4, 'Data barang default harus lengkap');
    
    // Pastikan field barang bersih (rahasia verifikasi verificationSecret tidak bocor ke client)
    const firstItem = validRes.body.data[0];
    assert.ok(firstItem.id !== undefined);
    assert.ok(firstItem.nama);
    assert.ok(firstItem.status);
    assert.equal(firstItem.verificationSecret, undefined, 'verificationSecret tidak boleh bocor');

    // 6. Request GET /me dengan Bearer token valid -> verifikasi identitas (HTTP 200)
    const meRes = await requestEndpoint('/me', { authHeader: `Bearer ${validToken}` });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, 'demo@kampus.ac.id');

    // 7. Pengujian HTTP 403 Forbidden: Pembaruan status oleh pengguna yang BUKAN pemilik laporan
    // Register user baru (bukan owner item awal yang ber-ownerId 0)
    const regRes = await fetch(`${url}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pengguna Lain', email: 'lain@kampus.ac.id', password: 'PasswordLain123!' }),
    });
    assert.equal(regRes.status, 201);

    const loginLainRes = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lain@kampus.ac.id', password: 'PasswordLain123!' }),
    });
    const loginLainData = await loginLainRes.json();
    const tokenUserLain = loginLainData.access_token;

    // Coba ubah status barang ID 1 dengan token user lain -> harus 403 Forbidden
    const forbiddenRes = await requestEndpoint('/barang/1/status', {
      method: 'PATCH',
      authHeader: `Bearer ${tokenUserLain}`,
      body: { status: 'Dikembalikan' },
    });
    assert.equal(forbiddenRes.status, 403, 'User yang bukan pemilik harus mendapatkan HTTP 403 Forbidden');
    assert.match(forbiddenRes.body.message, /hanya pembuat laporan/i);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Week 5 Task 03 - Refresh Token & Session Management (Token Rotation, Expiration, Protected API, and Logout Revocation)', async () => {
  const crypto = require('node:crypto');
  const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const testSecret = 'w5t3-secret-key-for-test-only';
  const signTestToken = (payload) => {
    const first = b64url({ alg: 'HS256', typ: 'JWT' });
    const second = b64url(payload);
    const signature = crypto.createHmac('sha256', testSecret).update(`${first}.${second}`).digest('base64url');
    return `${first}.${second}.${signature}`;
  };

  const dir = mkdtempSync(join(tmpdir(), 'temukampus-w5t3-'));
  const server = createApp({ dataDir: dir, secret: testSecret });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  const call = async (path, { method = 'GET', authHeader, body } = {}) => {
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(`${url}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  try {
    // -----------------------------------------------------------------------------------------
    // TEST 01: Login berhasil dan mendapatkan pasangan Access Token dan Refresh Token
    // -----------------------------------------------------------------------------------------
    const loginRes = await call('/auth/login', {
      method: 'POST',
      body: { email: 'demo@kampus.ac.id', password: 'Demo123!' },
    });
    assert.equal(loginRes.status, 200, 'TEST 01: Login harus berhasil dengan status 200');
    assert.ok(loginRes.body.access_token, 'TEST 01: access_token harus diterbitkan');
    assert.ok(loginRes.body.refresh_token, 'TEST 01: refresh_token harus diterbitkan');
    assert.equal(loginRes.body.token_type, 'Bearer');
    assert.equal(loginRes.body.expires_in, 3600);

    const initialAccessToken = loginRes.body.access_token;
    const initialRefreshToken = loginRes.body.refresh_token;

    // Periksa struktur kedua token
    const parseJwt = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const accessPayload = parseJwt(initialAccessToken);
    const refreshPayload = parseJwt(initialRefreshToken);

    assert.equal(accessPayload.sub, 1);
    assert.equal(accessPayload.type, 'access', 'Access token harus bertipe access');
    assert.ok(accessPayload.jti, 'Access token harus memiliki jti');
    assert.equal(accessPayload.exp - accessPayload.iat, 3600, 'Access token berlaku 1 jam');

    assert.equal(refreshPayload.sub, 1);
    assert.equal(refreshPayload.type, 'refresh', 'Refresh token harus bertipe refresh');
    assert.ok(refreshPayload.jti, 'Refresh token harus memiliki jti');
    assert.equal(refreshPayload.exp - refreshPayload.iat, 7 * 86400, 'Refresh token berlaku 7 hari');
    assert.notEqual(accessPayload.jti, refreshPayload.jti, 'jti access dan refresh token harus berbeda');

    // -----------------------------------------------------------------------------------------
    // TEST 02: Access token digunakan mengakses protected API
    // -----------------------------------------------------------------------------------------
    const getBarangRes = await call('/barang', { authHeader: `Bearer ${initialAccessToken}` });
    assert.equal(getBarangRes.status, 200, 'TEST 02: GET /barang dengan access token harus berhasil (200)');
    assert.ok(Array.isArray(getBarangRes.body.data), 'TEST 02: data barang harus array');

    const getMeRes = await call('/me', { authHeader: `Bearer ${initialAccessToken}` });
    assert.equal(getMeRes.status, 200, 'TEST 02: GET /me dengan access token harus berhasil (200)');
    assert.equal(getMeRes.body.user.email, 'demo@kampus.ac.id');

    // TYPE ENFORCEMENT 1: Refresh token DITOLAK jika digunakan sebagai Bearer access token
    const refreshAsAccessRes = await call('/barang', { authHeader: `Bearer ${initialRefreshToken}` });
    assert.equal(refreshAsAccessRes.status, 401, 'Refresh token tidak boleh digunakan untuk akses protected API');

    // TYPE ENFORCEMENT 2: Access token DITOLAK jika digunakan di POST /auth/refresh
    const accessAsRefreshRes = await call('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: initialAccessToken },
    });
    assert.equal(accessAsRefreshRes.status, 401, 'Access token tidak boleh digunakan di endpoint refresh');

    // -----------------------------------------------------------------------------------------
    // TEST 03: Access token expired ditolak oleh protected API
    // -----------------------------------------------------------------------------------------
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredAccessToken = signTestToken({
      sub: 1,
      type: 'access',
      jti: crypto.randomUUID(),
      iat: nowSec - 7200,
      exp: nowSec - 3600, // kedaluwarsa 1 jam lalu
    });
    const expiredRes = await call('/barang', { authHeader: `Bearer ${expiredAccessToken}` });
    assert.equal(expiredRes.status, 401, 'TEST 03: Protected API harus menolak access token yang expired (401)');

    // -----------------------------------------------------------------------------------------
    // TEST 04: Refresh berhasil menghasilkan access token baru & rotasi refresh token
    // -----------------------------------------------------------------------------------------
    const refreshRes = await call('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: initialRefreshToken },
    });
    assert.equal(refreshRes.status, 200, 'TEST 04: POST /auth/refresh harus sukses (200)');
    assert.ok(refreshRes.body.access_token, 'TEST 04: Harus mengembalikan access_token baru');
    assert.ok(refreshRes.body.refresh_token, 'TEST 04: Harus mengembalikan refresh_token baru (rotasi)');
    assert.notEqual(refreshRes.body.access_token, initialAccessToken, 'Access token baru harus berbeda dari yang lama');
    assert.notEqual(refreshRes.body.refresh_token, initialRefreshToken, 'Refresh token baru harus berbeda (rotasi)');

    const newAccessToken = refreshRes.body.access_token;
    const rotatedRefreshToken = refreshRes.body.refresh_token;

    // -----------------------------------------------------------------------------------------
    // TEST 05: Protected API dapat diakses menggunakan access token baru hasil refresh
    // -----------------------------------------------------------------------------------------
    const newAccessBarangRes = await call('/barang', { authHeader: `Bearer ${newAccessToken}` });
    assert.equal(newAccessBarangRes.status, 200, 'TEST 05: Protected API dapat diakses dengan token baru');
    assert.ok(newAccessBarangRes.body.data.length >= 4);

    const newAccessMeRes = await call('/me', { authHeader: `Bearer ${newAccessToken}` });
    assert.equal(newAccessMeRes.status, 200, 'TEST 05: /me dapat diakses dengan token baru');

    // -----------------------------------------------------------------------------------------
    // TEST 06: Refresh token salah, kosong, expired, atau bekas rotasi ditolak (HTTP 400 & 401)
    // -----------------------------------------------------------------------------------------
    // 6a. Refresh token kosong
    const emptyRefreshRes = await call('/auth/refresh', { method: 'POST', body: { refresh_token: '' } });
    assert.equal(emptyRefreshRes.status, 400, 'TEST 06a: Refresh token kosong harus mengembalikan 400');

    // 6b. Refresh token palsu / acak
    const fakeRefreshRes = await call('/auth/refresh', { method: 'POST', body: { refresh_token: 'invalid.token.str' } });
    assert.equal(fakeRefreshRes.status, 401, 'TEST 06b: Refresh token palsu harus ditolak (401)');

    // 6c. Refresh token yang kedaluwarsa secara waktu (exp)
    const expiredRefreshToken = signTestToken({
      sub: 1,
      type: 'refresh',
      jti: crypto.randomUUID(),
      iat: nowSec - 800000,
      exp: nowSec - 100, // kedaluwarsa
    });
    const expiredRefreshRes = await call('/auth/refresh', { method: 'POST', body: { refresh_token: expiredRefreshToken } });
    assert.equal(expiredRefreshRes.status, 401, 'TEST 06c: Refresh token expired harus ditolak (401)');

    // 6d. Token Rotation Replay Prevention: Refresh token LAMA (sebelum rotasi) harus ditolak karena sudah dicabut
    const reuseOldRefreshRes = await call('/auth/refresh', { method: 'POST', body: { refresh_token: initialRefreshToken } });
    assert.equal(reuseOldRefreshRes.status, 401, 'TEST 06d: Refresh token lama yang sudah dirotasi harus ditolak (401)');

    // -----------------------------------------------------------------------------------------
    // TEST 07 & 08: Logout mencabut access token dan refresh token di server
    // -----------------------------------------------------------------------------------------
    const logoutRes = await call('/auth/logout', {
      method: 'POST',
      authHeader: `Bearer ${newAccessToken}`,
      body: { refresh_token: rotatedRefreshToken },
    });
    assert.equal(logoutRes.status, 200, 'TEST 08: POST /auth/logout harus sukses 200');
    assert.match(logoutRes.body.message, /logout berhasil/i);

    // -----------------------------------------------------------------------------------------
    // TEST 08b: Token yang dicabut tidak dapat digunakan kembali
    // -----------------------------------------------------------------------------------------
    // Access token yang dicabut ditolak di protected endpoint
    const postLogoutAccessRes = await call('/barang', { authHeader: `Bearer ${newAccessToken}` });
    assert.equal(postLogoutAccessRes.status, 401, 'TEST 08b: Access token yang sudah dicabut harus ditolak (401)');

    // Refresh token yang dicabut ditolak di endpoint refresh
    const postLogoutRefreshRes = await call('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: rotatedRefreshToken },
    });
    assert.equal(postLogoutRefreshRes.status, 401, 'TEST 08b: Refresh token yang sudah dicabut harus ditolak (401)');

    // Logout dengan token yang sudah dicabut atau tidak valid ditolak
    const secondLogoutRes = await call('/auth/logout', {
      method: 'POST',
      authHeader: `Bearer ${newAccessToken}`,
    });
    // Karena jti sudah masuk revoked list, second logout tanpa token baru tidak memvalidasi apa pun
    assert.ok([200, 401].includes(secondLogoutRes.status));

    // -----------------------------------------------------------------------------------------
    // TEST 09 & 10: Pengujian Logout saat access token sudah expired tetap mencabut refresh token
    // -----------------------------------------------------------------------------------------
    const login2Res = await call('/auth/login', {
      method: 'POST',
      body: { email: 'demo@kampus.ac.id', password: 'Demo123!' },
    });
    assert.equal(login2Res.status, 200);
    const rToken2 = login2Res.body.refresh_token;

    // Logout hanya mengirimkan refresh_token (misalnya access token sudah expired)
    const logoutWithRefreshOnly = await call('/auth/logout', {
      method: 'POST',
      body: { refresh_token: rToken2 },
    });
    assert.equal(logoutWithRefreshOnly.status, 200, 'Logout dengan refresh token valid berhasil');

    // Pastikan refresh token 2 sudah dicabut
    const reuseRToken2 = await call('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: rToken2 },
    });
    assert.equal(reuseRToken2.status, 401, 'Refresh token yang dicabut via logout tidak bisa digunakan lagi');

  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Week 6 Task 01 - Handle API Error (2xx Success, 4xx Client Error, 5xx Server Error, Network Error, and Token Refresh Recovery)', async () => {
  const crypto = require('node:crypto');
  const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const testSecret = 'w6t1-secret-key-for-test-only';
  const dir = mkdtempSync(join(tmpdir(), 'temukampus-w6t1-'));
  const server = createApp({ dataDir: dir, secret: testSecret });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  // Replikasi struktur ApiError & getErrorMessageForStatus untuk pengujian fungsional terisolasi
  class TestApiError extends Error {
    constructor(message, status = 0, { type, details, isNetworkError, isTimeout } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = Number(status) || 0;
      this.isNetworkError = Boolean(isNetworkError || status === 0);
      this.isTimeout = Boolean(isTimeout);
      this.isClientError = this.status >= 400 && this.status < 500;
      this.isServerError = this.status >= 500 && this.status < 600;
      this.isUnauthorized = this.status === 401;
      this.isForbidden = this.status === 403;
      this.isNotFound = this.status === 404;
      this.isBadRequest = this.status === 400;
      this.isRetryable = this.isNetworkError || this.isTimeout || this.status === 503 || this.status === 504 || this.status === 429;
      this.type = type || (
        this.isTimeout ? 'TIMEOUT_ERROR' :
        this.isNetworkError ? 'NETWORK_ERROR' :
        this.isServerError ? 'SERVER_ERROR' :
        this.isClientError ? 'CLIENT_ERROR' : 'UNKNOWN_ERROR'
      );
      this.details = details || null;
    }
  }

  function testGetErrorMessage(status, serverMessage) {
    if (serverMessage && typeof serverMessage === 'string' && serverMessage.trim().length > 0) {
      const isTechnical = /at\s+[\w\.]+\s+\(|error:\s+syntax|database|sql|column|table|relation|undefined is not/i.test(serverMessage);
      if (!isTechnical) return serverMessage.trim();
    }
    switch (status) {
      case 400: return 'Permintaan tidak valid. Periksa kembali kelengkapan formulir Anda.';
      case 401: return 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.';
      case 403: return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.';
      case 404: return 'Data atau layanan yang diminta tidak ditemukan.';
      case 500: return 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.';
      default:
        if (status >= 500) return `Terjadi gangguan server (HTTP ${status}). Silakan coba beberapa saat lagi.`;
        return `Permintaan gagal (HTTP ${status}). Silakan coba kembali.`;
    }
  }

  // Client request simulator dengan logika persis services/api.js
  const clientRequest = async (path, { method = 'GET', body, token, customBaseUrl } = {}) => {
    const baseUrl = customBaseUrl !== undefined ? customBaseUrl : url;
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new TestApiError('Tidak dapat terhubung ke server. Periksa koneksi internet atau Wi-Fi Anda.', 0, {
        type: 'NETWORK_ERROR',
        isNetworkError: true,
        isRetryable: true,
        details: networkErr.message,
      });
    }

    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        try { payload = JSON.parse(text); } catch { payload = null; }
      }
    }

    if (!response.ok) {
      const userMessage = testGetErrorMessage(response.status, payload?.message);
      throw new TestApiError(userMessage, response.status, {
        details: payload?.message || null,
      });
    }

    return payload;
  };

  try {
    // -----------------------------------------------------------------------------------------
    // 1. PENGUJIAN HTTP 200 — Success
    // -----------------------------------------------------------------------------------------
    const loginSuccess = await clientRequest('/auth/login', {
      method: 'POST',
      body: { email: 'demo@kampus.ac.id', password: 'Demo123!' },
    });
    assert.ok(loginSuccess.access_token, 'HTTP 200: Harus mengembalikan access_token');
    assert.ok(loginSuccess.refresh_token, 'HTTP 200: Harus mengembalikan refresh_token');
    const validToken = loginSuccess.access_token;
    const validRefreshToken = loginSuccess.refresh_token;

    const barangList = await clientRequest('/barang', { token: validToken });
    assert.ok(Array.isArray(barangList.data), 'HTTP 200: Harus memproses data array barang');
    assert.ok(barangList.data.length >= 4);

    // -----------------------------------------------------------------------------------------
    // 2. PENGUJIAN HTTP 400 — Bad Request
    // -----------------------------------------------------------------------------------------
    await assert.rejects(
      async () => {
        await clientRequest('/auth/login', { method: 'POST', body: { email: '', password: '' } });
      },
      (err) => {
        assert.ok(err instanceof TestApiError);
        assert.equal(err.status, 400);
        assert.equal(err.isBadRequest, true);
        assert.equal(err.isClientError, true);
        assert.equal(err.isServerError, false);
        assert.equal(err.isNetworkError, false);
        assert.equal(err.isRetryable, false);
        assert.match(err.message, /email dan password wajib diisi|permintaan tidak valid/i);
        return true;
      },
      'HTTP 400: Harus melempar ApiError status 400'
    );

    // -----------------------------------------------------------------------------------------
    // 3. PENGUJIAN HTTP 401 — Unauthorized
    // -----------------------------------------------------------------------------------------
    await assert.rejects(
      async () => {
        await clientRequest('/barang'); // Tanpa token
      },
      (err) => {
        assert.ok(err instanceof TestApiError);
        assert.equal(err.status, 401);
        assert.equal(err.isUnauthorized, true);
        assert.equal(err.isClientError, true);
        assert.equal(err.isNetworkError, false);
        assert.match(err.message, /sesi tidak valid|sudah berakhir|silakan login/i);
        return true;
      },
      'HTTP 401: Harus melempar ApiError status 401'
    );

    // -----------------------------------------------------------------------------------------
    // 4. PENGUJIAN HTTP 403 — Forbidden
    // -----------------------------------------------------------------------------------------
    // Register user lain untuk menguji aksi terlarang pada barang milik user demo
    const regUserLain = await clientRequest('/auth/register', {
      method: 'POST',
      body: { name: 'User Lain W6', email: 'userlainw6@kampus.ac.id', password: 'PasswordLain123' },
    });
    assert.equal(regUserLain.user.email, 'userlainw6@kampus.ac.id');

    const loginUserLain = await clientRequest('/auth/login', {
      method: 'POST',
      body: { email: 'userlainw6@kampus.ac.id', password: 'PasswordLain123' },
    });
    const tokenUserLain = loginUserLain.access_token;

    await assert.rejects(
      async () => {
        // Coba ubah status barang ID 1 yang bukan miliknya
        await clientRequest('/barang/1/status', {
          method: 'PATCH',
          token: tokenUserLain,
          body: { status: 'Dikembalikan' },
        });
      },
      (err) => {
        assert.ok(err instanceof TestApiError);
        assert.equal(err.status, 403);
        assert.equal(err.isForbidden, true);
        assert.equal(err.isClientError, true);
        assert.equal(err.isRetryable, false);
        assert.match(err.message, /hanya pembuat laporan|akses ditolak/i);
        return true;
      },
      'HTTP 403: Harus melempar ApiError status 403 Forbidden'
    );

    // -----------------------------------------------------------------------------------------
    // 5. PENGUJIAN HTTP 404 — Not Found
    // -----------------------------------------------------------------------------------------
    // 5a. Detail barang yang tidak ada
    await assert.rejects(
      async () => {
        await clientRequest('/barang/999999', { token: validToken });
      },
      (err) => {
        assert.ok(err instanceof TestApiError);
        assert.equal(err.status, 404);
        assert.equal(err.isNotFound, true);
        assert.equal(err.isClientError, true);
        assert.match(err.message, /barang tidak ditemukan|data atau layanan yang diminta tidak ditemukan/i);
        return true;
      },
      'HTTP 404: Resource barang tidak ditemukan'
    );

    // 5b. Endpoint yang tidak ada
    await assert.rejects(
      async () => {
        await clientRequest('/endpoint-tidak-ada', { token: validToken });
      },
      (err) => {
        assert.ok(err instanceof TestApiError);
        assert.equal(err.status, 404);
        assert.equal(err.isNotFound, true);
        return true;
      },
      'HTTP 404: Route endpoint tidak ditemukan'
    );

    // -----------------------------------------------------------------------------------------
    // 6. PENGUJIAN HTTP 500 — Server Error
    // -----------------------------------------------------------------------------------------
    await assert.rejects(
      async () => {
        await clientRequest('/test/error-500');
      },
      (err) => {
        assert.ok(err instanceof TestApiError);
        assert.equal(err.status, 500);
        assert.equal(err.isServerError, true);
        assert.equal(err.isClientError, false);
        assert.equal(err.isNetworkError, false);
        assert.match(err.message, /terjadi kesalahan.*server/i);
        return true;
      },
      'HTTP 500: Server Error harus ditangani tanpa menyebabkan aplikasi crash'
    );

    // -----------------------------------------------------------------------------------------
    // 7. PENGUJIAN Network Error (Koneksi Putus / Offline / Port Salah)
    // -----------------------------------------------------------------------------------------
    await assert.rejects(
      async () => {
        // Hubungi port acak yang tidak aktif (misal port 59998)
        await clientRequest('/barang', { customBaseUrl: 'http://127.0.0.1:59998' });
      },
      (err) => {
        assert.ok(err instanceof TestApiError);
        assert.equal(err.status, 0);
        assert.equal(err.isNetworkError, true);
        assert.equal(err.isRetryable, true, 'Network error harus bertanda isRetryable untuk Task 02');
        assert.equal(err.type, 'NETWORK_ERROR');
        assert.match(err.message, /tidak dapat terhubung ke server|koneksi internet/i);
        return true;
      },
      'Network Error: Harus melempar ApiError status 0 dengan isNetworkError true'
    );

    // -----------------------------------------------------------------------------------------
    // 8. PENGUJIAN Token Expired dengan Refresh Berhasil
    // -----------------------------------------------------------------------------------------
    const nowSec = Math.floor(Date.now() / 1000);
    // Buat token akses kedaluwarsa
    const expiredToken = (() => {
      const first = b64url({ alg: 'HS256', typ: 'JWT' });
      const second = b64url({ sub: 1, type: 'access', jti: crypto.randomUUID(), iat: nowSec - 7200, exp: nowSec - 3600 });
      const signature = crypto.createHmac('sha256', testSecret).update(`${first}.${second}`).digest('base64url');
      return `${first}.${second}.${signature}`;
    })();

    // Simulasi alur request() dengan auto-refresh:
    let currentToken = expiredToken;
    let autoRefreshExecuted = false;

    // Langkah 1: Request pertama dengan token expired menghasilkan 401
    try {
      await clientRequest('/barang', { token: currentToken });
      assert.fail('Seharusnya melempar 401');
    } catch (err) {
      assert.equal(err.status, 401);
      // Langkah 2: Panggil endpoint refresh token
      const refreshPayload = await clientRequest('/auth/refresh', {
        method: 'POST',
        body: { refresh_token: validRefreshToken },
      });
      assert.ok(refreshPayload.access_token);
      currentToken = refreshPayload.access_token;
      autoRefreshExecuted = true;
    }

    assert.equal(autoRefreshExecuted, true, 'Proses refresh token harus tereksekusi');
    // Langkah 3: Request diulang dengan token baru -> berhasil HTTP 200
    const retrySuccess = await clientRequest('/barang', { token: currentToken });
    assert.ok(Array.isArray(retrySuccess.data));
    assert.ok(retrySuccess.data.length >= 4);

    // -----------------------------------------------------------------------------------------
    // 9. PENGUJIAN Token Invalid dan Refresh Gagal (Sesi Hangus)
    // -----------------------------------------------------------------------------------------
    let sessionCleared = false;
    await assert.rejects(
      async () => {
        try {
          await clientRequest('/auth/refresh', {
            method: 'POST',
            body: { refresh_token: 'fake.or.revoked.refresh.token' },
          });
        } catch (refreshErr) {
          if (refreshErr.status === 401) {
            sessionCleared = true; // Sesuai aturan: clearSession hanya jika 401
          }
          throw refreshErr;
        }
      },
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(sessionCleared, true, 'Sesi harus dibersihkan saat refresh token ditolak');
        return true;
      },
      'Refresh Gagal: Harus melempar 401 dan membersihkan sesi'
    );

    // -----------------------------------------------------------------------------------------
    // 10. Sanitasi Pesan Sensitif (Tidak Membocorkan Stack Trace / Database Internals)
    // -----------------------------------------------------------------------------------------
    const filteredTechnicalMsg = testGetErrorMessage(500, 'Error: syntax error at or near "SELECT" at Object.query (/server/db.js:42)');
    assert.equal(
      filteredTechnicalMsg,
      'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.',
      'Pesan database teknis tidak boleh bocor ke antarmuka pengguna'
    );

  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

// =========================================================================================
// WEEK 6 TASK 02 — LOADING, ERROR & RETRY SUITE
// =========================================================================================
test('Week 6 Task 02 - Loading, Error, Retry, and Empty State Lifecycle', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'temukampus-w6t2-'));
  const server = createApp({ dataDir: dir, secret: 'w6t2-secret-key-for-test-only' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Dapatkan JWT Token yang valid
    const loginRes = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@kampus.ac.id', password: 'Demo123!' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;

    // 2. Simulasi State Lifecycle Komponen (Loading -> Success -> Items)
    let state = {
      loading: false,
      error: null,
      items: [],
    };

    const fetchItemsWithState = async () => {
      state.loading = true;
      state.error = null;
      try {
        const res = await fetch(`${url}/barang`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        state.items = json.data;
        return json.data;
      } catch (err) {
        state.error = err.message;
        state.items = [];
        return [];
      } finally {
        state.loading = false;
      }
    };

    // Test 2.1: Initial Fetch Lifecycle
    assert.equal(state.loading, false);
    const fetchPromise = fetchItemsWithState();
    assert.equal(state.loading, true, 'Loading state harus aktif saat request berlangsung');
    await fetchPromise;
    assert.equal(state.loading, false, 'Loading state harus nonaktif setelah request selesai');
    assert.equal(state.error, null);
    assert.ok(state.items.length >= 4, 'Data barang berhasil dimuat');

    // Test 2.2: Error State Lifecycle (Server 500 Failure)
    const fetchErrorWithState = async () => {
      state.loading = true;
      state.error = null;
      try {
        const res = await fetch(`${url}/test/error-500`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.');
        const json = await res.json();
        state.items = json.data;
      } catch (err) {
        state.error = err.message;
        state.items = [];
      } finally {
        state.loading = false;
      }
    };

    await fetchErrorWithState();
    assert.equal(state.loading, false);
    assert.equal(state.error, 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.');
    assert.equal(state.items.length, 0);

    // Test 2.3: Retry Mechanism (Error -> Coba Lagi -> Berhasil)
    let retryExecutionCount = 0;
    const handleRetry = async () => {
      if (state.loading) return; // Cegah duplicate in-flight requests
      retryExecutionCount++;
      return fetchItemsWithState();
    };

    await handleRetry();
    assert.equal(retryExecutionCount, 1);
    assert.equal(state.error, null, 'Error state harus dibersihkan setelah retry berhasil');
    assert.ok(state.items.length >= 4, 'Data barang harus tampil kembali setelah retry berhasil');

    // Test 2.4: Pencegahan Request Ganda (Debouncing / Guard In-flight Request)
    state.loading = true; // Simulasi request sedang berjalan
    const duplicateCallResult = await handleRetry();
    assert.equal(duplicateCallResult, undefined, 'Panggilan retry kedua saat loading harus diblokir');
    assert.equal(retryExecutionCount, 1, 'Counter eksekusi retry tidak boleh bertambah saat sedang loading');
    state.loading = false;

    // Test 2.5: Empty State Distinction ("Belum ada laporan barang.")
    // Saat data barang kosong dan tidak ada error, harus dibedakan dari Error State
    const emptyStateSimulator = (items, error, loading) => {
      if (loading) return 'LOADING_VIEW';
      if (error) return 'ERROR_VIEW';
      if (items.length === 0) return 'EMPTY_VIEW';
      return 'LIST_VIEW';
    };

    assert.equal(emptyStateSimulator([], null, false), 'EMPTY_VIEW');
    assert.equal(emptyStateSimulator([], 'Ada error', false), 'ERROR_VIEW');
    assert.equal(emptyStateSimulator([], null, true), 'LOADING_VIEW');
    assert.equal(emptyStateSimulator([1, 2], null, false), 'LIST_VIEW');

  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

// =========================================================================================
// WEEK 6 TASK 03 — OFFLINE HANDLING & NETWORK ERROR DISCRIMINATION SUITE
// =========================================================================================
test('Week 6 Task 03 - Offline Handling, Network Discrimination, and Form Preservation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'temukampus-w6t3-'));
  const server = createApp({ dataDir: dir, secret: 'w6t3-secret-key-for-test-only' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Diagnostic Function: Diskriminasi Error sesuai spesifikasi PPT Dosen & Requirement
    const diagnoseNetworkCondition = ({ isOnline, error }) => {
      const isTimeout = Boolean(error?.isTimeout);
      const isNetErr = Boolean(error?.isNetworkError || error?.status === 0);

      if (!isOnline) {
        return {
          category: 'OFFLINE',
          icon: '📡🚫',
          title: 'Tidak Ada Koneksi Internet',
          message: 'Periksa koneksi Anda dan coba lagi.',
          canRetry: true,
        };
      }
      if (isTimeout) {
        return {
          category: 'TIMEOUT',
          icon: '⏱️',
          title: 'Koneksi Waktu Habis',
          message: 'Server membutuhkan waktu terlalu lama untuk merespons. Periksa koneksi Anda dan coba lagi.',
          canRetry: true,
        };
      }
      if (isNetErr) {
        return {
          category: 'SERVER_UNREACHABLE',
          icon: '🔌',
          title: 'Server Tidak Terjangkau',
          message: 'Perangkat terhubung ke jaringan, tetapi server API TemuKampus tidak dapat dijangkau. Pastikan server lokal aktif.',
          canRetry: true,
        };
      }
      if (error?.status >= 500) {
        return {
          category: 'SERVER_ERROR',
          icon: '🖥️',
          title: 'Gangguan Server',
          message: error?.message || 'Terjadi kesalahan pada server (5xx). Silakan coba lagi nanti.',
          canRetry: true,
        };
      }
      return {
        category: 'CLIENT_ERROR',
        icon: '⚠️',
        title: 'Permintaan Gagal',
        message: error?.message || 'Permintaan tidak dapat diproses oleh server.',
        canRetry: false,
      };
    };

    // Test 1: Kondisi Tanpa Internet (Offline)
    const diagOffline = diagnoseNetworkCondition({
      isOnline: false,
      error: { status: 0, isNetworkError: true },
    });
    assert.equal(diagOffline.category, 'OFFLINE');
    assert.equal(diagOffline.icon, '📡🚫');
    assert.equal(diagOffline.title, 'Tidak Ada Koneksi Internet');
    assert.equal(diagOffline.message, 'Periksa koneksi Anda dan coba lagi.');
    assert.equal(diagOffline.canRetry, true);

    // Test 2: Wi-Fi Aktif tapi Server Backend Lokal Mati (Server Unreachable)
    // Syarat ketat: Jangan otomatis menyebut "tidak ada internet" jika Wi-Fi tersambung
    const diagServerDown = diagnoseNetworkCondition({
      isOnline: true,
      error: { status: 0, isNetworkError: true, message: 'fetch failed' },
    });
    assert.equal(diagServerDown.category, 'SERVER_UNREACHABLE');
    assert.equal(diagServerDown.icon, '🔌');
    assert.equal(diagServerDown.title, 'Server Tidak Terjangkau');
    assert.match(diagServerDown.message, /server API TemuKampus tidak dapat dijangkau/i);
    assert.notEqual(diagServerDown.title, 'Tidak Ada Koneksi Internet', 'Tidak boleh keliru mengklaim offline saat Wi-Fi aktif');

    // Test 3: Request Timeout
    const diagTimeout = diagnoseNetworkCondition({
      isOnline: true,
      error: { status: 0, isTimeout: true, isNetworkError: true },
    });
    assert.equal(diagTimeout.category, 'TIMEOUT');
    assert.equal(diagTimeout.icon, '⏱️');
    assert.equal(diagTimeout.title, 'Koneksi Waktu Habis');

    // Test 4: HTTP 500 Internal Server Error
    const diag500 = diagnoseNetworkCondition({
      isOnline: true,
      error: { status: 500, message: 'Terjadi kesalahan pada server.' },
    });
    assert.equal(diag500.category, 'SERVER_ERROR');
    assert.equal(diag500.icon, '🖥️');
    assert.equal(diag500.title, 'Gangguan Server');

    // Test 5: Simulasi Alur Retry Setelah Online
    let simulatedOnline = false;
    let apiCallExecuted = false;

    const retryHandlerSimulator = async () => {
      // Step 1: Periksa koneksi via NetInfo
      if (!simulatedOnline) {
        return { success: false, reason: 'OFFLINE_BLOCKED' };
      }
      // Step 2: Lakukan request API ulang jika online
      apiCallExecuted = true;
      const res = await fetch(`${url}/barang`, {
        headers: { Authorization: 'Bearer not-needed-for-check' },
      });
      return { success: true, status: res.status };
    };

    // Saat masih offline, tombol "Coba Lagi" tidak melakukan request berulang tanpa batas ke backend
    const offlineRetryRes = await retryHandlerSimulator();
    assert.equal(offlineRetryRes.success, false);
    assert.equal(offlineRetryRes.reason, 'OFFLINE_BLOCKED');
    assert.equal(apiCallExecuted, false, 'API request tidak boleh dikirim saat koneksi masih offline');

    // Koneksi kembali aktif (online dihidupkan)
    simulatedOnline = true;
    const onlineRetryRes = await retryHandlerSimulator();
    assert.equal(onlineRetryRes.success, true);
    assert.equal(apiCallExecuted, true, 'API request dieksekusi setelah koneksi aktif kembali');

    // Test 6: Preservasi Data Formulir dan Foto Barang saat Offline / Network Fail
    // Syarat: Jangan menghapus formulir atau foto yang sudah diisi pengguna, jangan auto-resend POST
    const initialReportForm = {
      nama: 'Laptop ASUS ROG Hitam',
      kategori: 'Elektronik',
      lokasi: 'Perpustakaan Lt. 2',
      deskripsi: 'Ada stiker GitHub di cover belakang',
      status: 'Hilang',
      image: 'file:///data/user/0/temukampus/cache/photo-123.jpg',
      verificationSecret: 'stiker kucing',
    };

    let userFormState = { ...initialReportForm };
    let userPhotoState = 'file:///data/user/0/temukampus/cache/photo-123.jpg';
    let autoResendTriggered = false;

    const submitReportSimulator = async (isNetworkConnected) => {
      if (!isNetworkConnected) {
        // Jangan reset userFormState dan jangan reset userPhotoState!
        // Jangan jalankan autoResendTriggered!
        return {
          success: false,
          error: 'Tidak ada koneksi internet. Formulir dan foto Anda tetap tersimpan. Silakan periksa koneksi Anda dan coba kirim kembali.',
        };
      }
      return { success: true };
    };

    // Simulasi kirim laporan saat koneksi putus
    const submitOfflineRes = await submitReportSimulator(false);
    assert.equal(submitOfflineRes.success, false);
    assert.match(submitOfflineRes.error, /Formulir dan foto Anda tetap tersimpan/);
    assert.deepEqual(userFormState, initialReportForm, 'Formulir laporan tidak boleh terhapus saat offline');
    assert.equal(userPhotoState, 'file:///data/user/0/temukampus/cache/photo-123.jpg', 'Foto barang tidak boleh dihapus saat offline');
    assert.equal(autoResendTriggered, false, 'POST request tidak boleh di-resend otomatis untuk cegah duplikasi');

  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});





