import {mapBarang} from '../models/Barang';
import {getToken, getRefreshToken, saveTokens, clearSession} from '../storage/session';

// Configure EXPO_PUBLIC_API_BASE_URL in .env (e.g., http://192.168.1.5:4000)
// The API is real and local for classroom use; no fabricated tokens or dummy API successes.
export const API_BASE_URL=(process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/,'');
const timeout=15000;
// Week 6 Task 01 — Handle API Error: Struktur ApiError terpadu untuk HTTP 2xx/4xx/5xx dan Network Error
export class ApiError extends Error {
  constructor(message, status = 0, { type, details, isNetworkError, isTimeout } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = Number(status) || 0;

    // Klasifikasi Status & Tipe Error
    this.isNetworkError = Boolean(isNetworkError || status === 0);
    this.isTimeout = Boolean(isTimeout);
    this.isClientError = this.status >= 400 && this.status < 500;
    this.isServerError = this.status >= 500 && this.status < 600;
    this.isUnauthorized = this.status === 401;
    this.isForbidden = this.status === 403;
    this.isNotFound = this.status === 404;
    this.isBadRequest = this.status === 400;

    // Persiapan Task 02 (Retry) & Task 03 (Offline): penanda retryable
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

// Pemetaan pesan error user-friendly tanpa mengekspos detail teknis sensitif server
export function getErrorMessageForStatus(status, serverMessage) {
  if (serverMessage && typeof serverMessage === 'string' && serverMessage.trim().length > 0) {
    // Saring pesan stack trace atau teknis database agar tidak bocor ke UI
    const isTechnical = /at\s+[\w\.]+\s+\(|error:\s+syntax|database|sql|column|table|relation|undefined is not/i.test(serverMessage);
    if (!isTechnical) return serverMessage.trim();
  }

  switch (status) {
    case 400:
      return 'Permintaan tidak valid. Periksa kembali kelengkapan formulir Anda.';
    case 401:
      return 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.';
    case 403:
      return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.';
    case 404:
      return 'Data atau layanan yang diminta tidak ditemukan.';
    case 409:
      return 'Terjadi konflik data. Data sudah terdaftar dalam sistem.';
    case 413:
      return 'Ukuran file atau data terlalu besar.';
    case 422:
      return 'Format data tidak dapat diproses. Periksa kembali isian Anda.';
    case 429:
      return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.';
    case 500:
      return 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.';
    case 502:
      return 'Server gateway bermasalah. Silakan coba sesaat lagi.';
    case 503:
      return 'Layanan server sedang sibuk atau dalam pemeliharaan. Coba lagi nanti.';
    case 504:
      return 'Batas waktu server habis (Gateway Timeout). Coba lagi nanti.';
    default:
      if (status >= 500) {
        return `Terjadi gangguan server (HTTP ${status}). Silakan coba beberapa saat lagi.`;
      }
      return `Permintaan gagal (HTTP ${status}). Silakan coba kembali.`;
  }
}

let refreshPromise = null;

// Week 5 Task 03 & Week 6 Task 01: refreshAccessToken() mengambil refresh token dari SecureStore,
// memanggil POST /auth/refresh, dan menangani error tanpa menghapus sesi saat terjadi gangguan jaringan.
export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw new ApiError('Sesi berakhir. Refresh token tidak ditemukan.', 401);
      }

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (fetchErr) {
        // Gangguan jaringan: JANGAN hapus sesi di SecureStore!
        throw new ApiError('Tidak dapat memperbarui sesi karena gangguan jaringan. Periksa koneksi Anda.', 0, {
          type: 'NETWORK_ERROR',
          isNetworkError: true,
          isRetryable: true,
          details: fetchErr.message || null,
        });
      }

      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }

      if (!response.ok) {
        // Hanya hapus sesi jika server benar-benar menolak token (HTTP 401)
        if (response.status === 401) {
          await clearSession().catch(() => {});
        }
        const userMsg = getErrorMessageForStatus(response.status, payload?.message || 'Sesi telah berakhir. Silakan masuk kembali.');
        throw new ApiError(userMsg, response.status);
      }

      if (!payload?.access_token) {
        await clearSession().catch(() => {});
        throw new ApiError('Gagal mendapatkan access token baru dari server.', 401);
      }

      // Simpan access token baru & refresh token baru (rotasi) ke SecureStore
      await saveTokens(payload.access_token, payload.refresh_token);
      return payload.access_token;
    } catch (err) {
      if (err.status === 401) {
        await clearSession().catch(() => {});
      }
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function request(path,{method='GET',body,authenticated=false,_retry=false}={}){
  if(!API_BASE_URL)throw new ApiError('Alamat API belum diatur. Isi EXPO_PUBLIC_API_BASE_URL pada file .env.', 0, {
    type: 'CLIENT_ERROR',
    isNetworkError: false,
  });
  const headers={'Accept':'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(authenticated){
    const token=await getToken();
    if(!token)throw new ApiError('Sesi tidak tersedia. Silakan masuk kembali.',401);
    headers.Authorization=`Bearer ${token}`;
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(`${API_BASE_URL}${path}`,{method,headers,body:body!==undefined?JSON.stringify(body):undefined,signal:controller.signal});
    
    // Parse response secara aman (mendukung JSON, teks/HTML error, atau body kosong)
    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if(contentType.includes('application/json')){
      payload = await response.json().catch(()=>null);
    } else {
      const text = await response.text().catch(()=>'');
      if(text){
        try{ payload = JSON.parse(text); } catch { payload = null; }
      }
    }

    // Week 5 Task 03 & Week 6 Task 01: Auto-refresh jika HTTP 401 pada request terautentikasi
    if(response.status===401 && authenticated && !_retry && path!=='/auth/login' && path!=='/auth/refresh' && path!=='/auth/logout'){
      // Auto-retry HANYA pada operasi idempotent (GET)
      if(method==='GET'){
        clearTimeout(timer);
        try{
          const newToken = await refreshAccessToken();
          if(newToken){
            return request(path,{method,body,authenticated:true,_retry:true});
          }
        }catch(refreshErr){
          if(refreshErr instanceof ApiError) throw refreshErr;
          throw new ApiError('Sesi kedaluwarsa. Silakan login kembali.',401);
        }
      }
    }

    // HTTP 4xx & 5xx: Tangani error respons server tanpa crash
    if(!response.ok){
      const userMessage = getErrorMessageForStatus(response.status, payload?.message);
      throw new ApiError(userMessage, response.status, {
        details: payload?.message || null,
      });
    }

    // HTTP 2xx: Success
    return payload;
  }catch(e){
    if(e instanceof ApiError)throw e;
    if(e.name==='AbortError'){
      throw new ApiError('Koneksi waktu habis (timeout). Server membutuhkan waktu terlalu lama untuk merespons.', 0, {
        type: 'TIMEOUT_ERROR',
        isNetworkError: true,
        isTimeout: true,
        isRetryable: true,
      });
    }
    // Network Error (koneksi terputus, DNS gagal, host tidak dapat dijangkau)
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet atau Wi-Fi Anda.', 0, {
      type: 'NETWORK_ERROR',
      isNetworkError: true,
      isRetryable: true,
      details: e.message || 'Network request failed',
    });
  }finally{clearTimeout(timer);}
}
export const registerUser=(name,email,password)=>request('/auth/register',{method:'POST',body:{name,email,password}});
// Week 5 Task 01: POST /auth/login - kirim email & password via JSON, terima access_token JWT asli dari backend.
export const loginWithAPI=(email,password)=>request('/auth/login',{method:'POST',body:{email,password}});
// Week 5 Task 02: Helper authenticatedFetch() untuk request ke protected REST API endpoint.
// Mengambil token dari SecureStore via getToken() dan menyematkannya ke header Authorization: Bearer <token>.
export async function authenticatedFetch(path, options = {}) {
  return request(path, { ...options, authenticated: true });
}

export const getProfile = () => authenticatedFetch('/me');
export const logoutAPI = async () => {
  const token = await getToken().catch(() => null);
  const refreshToken = await getRefreshToken().catch(() => null);
  return request('/auth/logout', {
    method: 'POST',
    authenticated: Boolean(token),
    body: refreshToken ? { refresh_token: refreshToken } : undefined,
  });
};

// Week 4 & Week 5 Task 02: GET protected endpoint /barang dengan Bearer token -> DTO Barang -> UI.
export const fetchBarang = async () => {
  const response = await authenticatedFetch('/barang');
  if (!Array.isArray(response.data)) throw new ApiError('Format data API tidak sesuai.');
  return response.data.map(mapBarang);
};
export const createBarang=async form=>{
 const response=await request('/barang',{method:'POST',authenticated:true,body:form});
 return mapBarang(response.data);
};
export const verifyBarang=async(id,jawaban)=>{
 const response=await request(`/barang/${id}/verify`,{method:'POST',authenticated:true,body:{jawaban}});
 return {item:mapBarang(response.data),message:response.message};
};
export const markReturned=async id=>{
 const response=await request(`/barang/${id}/status`,{method:'PATCH',authenticated:true,body:{status:'Dikembalikan'}});
 return mapBarang(response.data);
};

export function resolveImageUrl(image){
  if(!image||typeof image!=='string')return '';
  if(image.startsWith('/uploads/')) return `${API_BASE_URL}${image}`;
  if(API_BASE_URL && (image.startsWith('http://') || image.startsWith('https://')) && image.includes('/uploads/')){
    const idx = image.indexOf('/uploads/');
    return `${API_BASE_URL}${image.substring(idx)}`;
  }
  return image;
}

export async function uploadPhoto(imageUri, imageBase64){
  if(!imageUri && !imageBase64) return '';
  if(!API_BASE_URL) throw new ApiError('Alamat API belum diatur. Isi EXPO_PUBLIC_API_BASE_URL pada file .env.');
  const token = await getToken();
  if(!token) throw new ApiError('Sesi tidak tersedia. Silakan masuk kembali.', 401);

  // 1. Prioritaskan JSON base64 jika tersedia (100% stabil di iOS & Android)
  if (imageBase64) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoBase64: imageBase64,
          ext: '.jpg'
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const userMsg = getErrorMessageForStatus(response.status, payload?.message || `Gagal mengunggah foto (HTTP ${response.status}).`);
        throw new ApiError(userMsg, response.status);
      }
      return payload?.url || '';
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e.name === 'AbortError') {
        throw new ApiError('Unggah foto terlalu lama. Periksa jaringan Wi-Fi.', 0, {
          type: 'TIMEOUT_ERROR',
          isNetworkError: true,
          isTimeout: true,
          isRetryable: true,
        });
      }
      console.warn('Base64 upload gagal, mencoba multipart:', e.message);
    } finally {
      clearTimeout(timer);
    }
  }

  // 2. Multipart FormData (standar)
  const rawName = (imageUri.split('/').pop() || 'photo.jpg').split('?')[0];
  const match = /\.(\w+)$/.exec(rawName);
  let ext = match ? match[1].toLowerCase() : 'jpg';
  if (ext === 'heic' || ext === 'heif') ext = 'jpg';
  const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = mimeTypes[ext] || 'image/jpeg';
  const filename = rawName.endsWith(`.${ext}`) ? rawName : `photo.${ext}`;

  const formData = new FormData();
  formData.append('photo', {
    uri: imageUri,
    name: filename,
    type: type,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const userMsg = getErrorMessageForStatus(response.status, payload?.message || `Gagal mengunggah foto (HTTP ${response.status}).`);
      throw new ApiError(userMsg, response.status);
    }
    return payload?.url || '';
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') {
      throw new ApiError('Unggah foto terlalu lama. Periksa jaringan Wi-Fi.', 0, {
        type: 'TIMEOUT_ERROR',
        isNetworkError: true,
        isTimeout: true,
        isRetryable: true,
      });
    }
    throw new ApiError('Tidak dapat mengunggah foto ke server. Periksa koneksi internet atau Wi-Fi Anda.', 0, {
      type: 'NETWORK_ERROR',
      isNetworkError: true,
      isRetryable: true,
      details: e.message || 'Network request failed',
    });
  } finally {
    clearTimeout(timer);
  }
}
