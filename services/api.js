import {mapBarang} from '../models/Barang';
import {getToken} from '../storage/session';

// Configure EXPO_PUBLIC_API_BASE_URL in .env (e.g., http://192.168.1.5:4000)
// The API is real and local for classroom use; no fabricated tokens or dummy API successes.
export const API_BASE_URL=(process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/,'');
const timeout=15000;
export class ApiError extends Error {
  constructor(message,status=0){super(message);this.name='ApiError';this.status=status;}
}
export async function request(path,{method='GET',body,authenticated=false}={}){
  if(!API_BASE_URL)throw new ApiError('Alamat API belum diatur. Isi EXPO_PUBLIC_API_BASE_URL pada file .env.');
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
    const payload=await response.json().catch(()=>null);
    if(!response.ok){
      const fallback=response.status===401?'Sesi tidak valid atau sudah berakhir.':response.status===403?'Akses ditolak.':`API gagal (HTTP ${response.status}).`;
      throw new ApiError(payload?.message||fallback,response.status);
    }
    return payload;
  }catch(e){
    if(e instanceof ApiError)throw e;
    if(e.name==='AbortError')throw new ApiError('Koneksi API terlalu lama. Periksa jaringan.');
    throw new ApiError('Tidak dapat terhubung ke API. Periksa alamat IP server dan Wi-Fi.');
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
export const logoutAPI = () => authenticatedFetch('/auth/logout', { method: 'POST' });

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
        throw new ApiError(payload?.message || `Gagal mengunggah foto (HTTP ${response.status}).`, response.status);
      }
      return payload?.url || '';
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e.name === 'AbortError') throw new ApiError('Unggah foto terlalu lama. Periksa jaringan Wi-Fi.');
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
      throw new ApiError(payload?.message || `Gagal mengunggah foto (HTTP ${response.status}).`, response.status);
    }
    return payload?.url || '';
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') throw new ApiError('Unggah foto terlalu lama. Periksa jaringan Wi-Fi.');
    throw new ApiError('Tidak dapat mengunggah foto ke server. ' + (e.message || 'Periksa jaringan Wi-Fi.'));
  } finally {
    clearTimeout(timer);
  }
}
