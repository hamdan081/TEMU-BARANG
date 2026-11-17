/**
 * TemuKampus — project terpadu Mobile Programming Week 1–9.
 * Week 1–3: perancangan aplikasi, React Native UI, autentikasi dan keamanan sesi.
 * Week 4–5: Barang DTO, REST API, JWT, protected endpoint, refresh token dan logout.
 * Week 6: error state, loading, retry dan penanganan koneksi offline.
 * Week 7: sensor gerak untuk fitur keamanan meja.
 * Week 8: GET, POST, PATCH, loading, error handling dan refresh pada laporan barang.
 * Week 9 (anggota-1-get): GET barang hilang & temuan terpisah, useEffect, async/await,
 *   ActivityIndicator, pull-to-refresh, try/catch/finally, Alert error, empty state.
 */
import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
  ActivityIndicator,Alert,FlatList,Image,KeyboardAvoidingView,Modal,Platform,
  Pressable,SafeAreaView,ScrollView,StatusBar,StyleSheet,
  Text,TextInput,useWindowDimensions,View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ActionMenu from './components/ActionMenu';
import CategoryList from './components/CategoryList';
import LatestItems from './components/LatestItems';
import BottomNav from './components/BottomNav';
import ItemCard from './components/ItemCard';
import SensorScreen from './components/sensors/SensorScreen';
import {categories,handlingStatuses,reportTypes} from './models/Barang';
import {API_BASE_URL,ApiError,registerUser,loginWithAPI,getProfile,logoutAPI,fetchBarang,fetchBarangHilang,fetchBarangTemuan,createBarang,createBarangHilang,createBarangTemuan,verifyBarang,markReturned,patchBarangStatus,patchBarang,markUnresolved,uploadPhoto,resolveImageUrl,refreshAccessToken,setApiBaseUrl,getApiBaseUrl,getAutoDetectedHost} from './services/api';
import {clearSession,getToken,saveSession,savePreference,getPreference,saveApiUrl,getSavedApiUrl} from './storage/session';

const primary='#1565C0';
const blankForm={nama:'',kategori:'Elektronik',lokasi:'',deskripsi:'',jenisLaporan:'Hilang',image:'',verificationSecret:''};

function UIButton({title,onPress,secondary=false,disabled=false,danger=false,loading=false,style,accessibilityLabel,accessibilityHint}){
 return <Pressable onPress={onPress} disabled={disabled||loading} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}
  accessibilityHint={accessibilityHint}
  accessibilityState={{disabled: disabled||loading}} style={[styles.button,secondary&&styles.outline,danger&&styles.danger,(disabled||loading)&&styles.disabled,style]}>
  {loading ? (
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>
    <ActivityIndicator size="small" color={secondary?primary:'#fff'}/>
    <Text style={[styles.buttonText,secondary&&styles.outlineText]}>{title}</Text>
   </View>
  ) : (
   <Text style={[styles.buttonText,secondary&&styles.outlineText]}>{title}</Text>
  )}
 </Pressable>;
}
function Field({label,value,onChangeText,placeholder,secret=false,multiline=false,autoCapitalize='sentences',keyboardType='default'}){
 const [visible,setVisible]=useState(false);
 return <View style={styles.field}>
  <Text style={styles.label}>{label}</Text>
  <View style={styles.inputRow}>
   <TextInput accessibilityLabel={label} placeholder={placeholder||label} placeholderTextColor="#7C8798" style={[styles.input,multiline&&styles.multiline]}
    value={value} onChangeText={onChangeText} secureTextEntry={secret&&!visible} multiline={multiline}
    autoCapitalize={autoCapitalize} keyboardType={keyboardType} autoCorrect={!secret} />
   {secret&&<Pressable onPress={()=>setVisible(!visible)} accessibilityRole="button" accessibilityLabel={visible?`Sembunyikan ${label}`:`Tampilkan ${label}`} style={styles.eye}><Text style={styles.eyeText}>{visible?'Sembunyikan':'Lihat'}</Text></Pressable>}
  </View>
 </View>;
}
function StatusMessage({message,error=false}){
 if(!message)return null;
 return <Text accessibilityLiveRegion="polite" style={[styles.message,error?styles.error:styles.success]}>{message}</Text>;
}
function Choice({label,selected,onPress}){
 return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} style={[styles.choice,selected&&styles.choiceOn]}><Text style={[styles.choiceText,selected&&styles.choiceTextOn]}>{label}</Text></Pressable>;
}

function getFollowUpInfo(item,currentUserId){
 const isOwner=Number(item.ownerId)===Number(currentUserId);
 if(isOwner&&item.status==='Menunggu Pengambilan')return {title:'Konfirmasi barang telah diterima',description:'Ciri barang sudah diverifikasi. Setelah barang benar-benar diterima, konfirmasikan pengembaliannya.',button:'Konfirmasi Pengembalian',kind:'confirm'};
 if(isOwner&&(item.status==='Belum Ditemukan'||item.status==='Menunggu Verifikasi'))return {title:'Pantau laporan kehilangan',description:'Laporan masih aktif. Periksa informasi terbaru dan pantau jika ada laporan temuan yang cocok.',button:'Lihat Laporan',kind:'detail'};
 if(isOwner&&item.status==='Menunggu Pemilik')return {title:'Menunggu pemilik barang',description:'Barang sudah dilaporkan ditemukan. Tunggu pemilik melakukan verifikasi ciri khusus.',button:'Lihat Laporan',kind:'detail'};
 if(!isOwner&&item.status==='Menunggu Pemilik')return {title:'Periksa kecocokan barang temuan',description:'Jika barang ini milikmu, buka detail dan masukkan ciri khusus untuk memulai verifikasi.',button:'Periksa & Verifikasi',kind:'verify'};
 if(!isOwner&&(item.status==='Belum Ditemukan'||item.status==='Menunggu Verifikasi'))return {title:'Cocokkan laporan kehilangan',description:'Periksa nama, foto, ciri-ciri, dan lokasi. Jika barang cocok, lanjutkan proses verifikasi.',button:'Periksa Laporan',kind:'verify'};
 if(item.status==='Belum Terselesaikan')return {title:'Laporan belum terselesaikan',description:'Laporan ini ditandai belum terselesaikan atau pencarian dihentikan.',button:'Lihat Laporan',kind:'detail'};
 return {title:'Pengambilan sedang diproses',description:'Verifikasi sudah berhasil. Tunggu pelapor mengonfirmasi bahwa barang telah diterima.',button:'Lihat Laporan',kind:'detail'};
}

function getHandlingDescription(item){
 switch(item.status){
  case 'Belum Ditemukan':
  case 'Menunggu Verifikasi': return 'Laporan kehilangan sudah tercatat dan masih menunggu informasi barang ditemukan.';
  case 'Menunggu Pemilik': return 'Barang sudah dilaporkan ditemukan dan sedang menunggu pemilik mengenali ciri khususnya.';
  case 'Menunggu Pengambilan': return 'Ciri barang sudah cocok. Pengambilan menunggu konfirmasi dari pelapor.';
  case 'Selesai Dikembalikan': return 'Barang telah dikonfirmasi kembali kepada pemilik. Laporan selesai.';
  case 'Belum Terselesaikan': return 'Laporan ditandai belum terselesaikan atau proses penyelesaian dihentikan.';
  default: return 'Perkembangan laporan akan diperbarui setelah ada tindakan berikutnya.';
 }
}

// Week 6 Task 02: Loading State dengan ActivityIndicator & teks "Memuat data barang..."
function LoadingStateView({message='Memuat data barang...'}){
 return <View style={styles.stateContainer} accessibilityRole="progressbar" accessibilityLabel={message}>
  <ActivityIndicator size="large" color={primary}/>
  <Text style={styles.stateText}>{message}</Text>
 </View>;
}

// Week 6 Task 02 & Task 03: Error State & Offline State terpadu dengan Tombol Coba Lagi
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

// Week 6 Task 02: Empty State ("Belum ada laporan barang.") yang dibedakan dari Error State
function EmptyStateView({title='Belum Ada Barang',message='Belum ada laporan barang.'}){
 return <View style={styles.stateContainer}>
  <Text style={styles.stateIcon}>📦</Text>
  <Text style={styles.stateTitle} accessibilityRole="header">{title}</Text>
  <Text style={styles.stateMessage}>{message}</Text>
 </View>;
}

export default function App(){
 const {width}=useWindowDimensions();
 const wide=width>=760;
 const [screen,setScreen]=useState('login');
 const [authUser,setAuthUser]=useState(null);
 const [booting,setBooting]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [items,setItems]=useState([]);
 const [loadingItems,setLoadingItems]=useState(false);
 const [itemsError,setItemsError]=useState('');
 const [itemsErrorObj,setItemsErrorObj]=useState(null);
 // Week 9 Task 01 (anggota-1-get): State terpisah untuk barang hilang dan barang temuan
 const [barangHilang,setBarangHilang]=useState([]);
 const [loadingHilang,setLoadingHilang]=useState(false);
 const [hilangError,setHilangError]=useState(null);
 const [barangTemuan,setBarangTemuan]=useState([]);
 const [loadingTemuan,setLoadingTemuan]=useState(false);
 const [temuanError,setTemuanError]=useState(null);
 // Week 9 Task 03 (anggota-3-patch): State pembaruan data & status PATCH
 const [patchLoading,setPatchLoading]=useState(false);
 const [editModalVisible,setEditModalVisible]=useState(false);
 const [editForm,setEditForm]=useState({nama:'',kategori:'Elektronik',lokasi:'',deskripsi:''});
 const [isOnline,setIsOnline]=useState(true);
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('Semua');
 const [statusFilter,setStatusFilter]=useState('Semua');
 const [typeFilter,setTypeFilter]=useState('Semua');
 const [selected,setSelected]=useState(null);
 const [form,setForm]=useState(blankForm);
 const [selectedImage,setSelectedImage]=useState(null);
 const [selectedImageBase64,setSelectedImageBase64]=useState(null);
 const [claimAnswer,setClaimAnswer]=useState('');
 const [authForm,setAuthForm]=useState({name:'',email:'',password:'',confirm:''});
 const [compactMode,setCompactMode]=useState(false);
 const [showSettings,setShowSettings]=useState(false);
 const [customApiUrl,setCustomApiUrl]=useState(getApiBaseUrl()||'');
 const [testingConnection,setTestingConnection]=useState(false);
 const [testStatus,setTestStatus]=useState('');

 useEffect(() => {
  // Week 6 Task 03: Listener status koneksi jaringan via NetInfo
  const unsubscribe = NetInfo.addEventListener(state => {
   const online = Boolean(state.isConnected && state.isInternetReachable !== false);
   setIsOnline(online);
  });
  NetInfo.fetch().then(state => {
   const online = Boolean(state.isConnected && state.isInternetReachable !== false);
   setIsOnline(online);
  }).catch(() => {});
  return () => unsubscribe();
 }, []);

 const pickFromGallery=async()=>{
  try{
   const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
   if(!perm.granted){
    Alert.alert('Izin Galeri Ditolak','Aplikasi memerlukan izin galeri untuk memilih foto barang.');
    return;
   }
   const result=await ImagePicker.launchImageLibraryAsync({
    mediaTypes:['images'],
    allowsEditing:true,
    aspect:[4,3],
    quality:0.6,
    base64:true,
   });
   if(!result.canceled&&result.assets&&result.assets.length>0){
    setSelectedImage(result.assets[0].uri);
    setSelectedImageBase64(result.assets[0].base64||null);
    setError('');
   }
  }catch(e){
   setError('Gagal membuka galeri: '+(e.message||'Kesalahan sistem'));
  }
 };

 const takePhoto=async()=>{
  try{
   const perm=await ImagePicker.requestCameraPermissionsAsync();
   if(!perm.granted){
    Alert.alert('Izin Kamera Ditolak','Aplikasi memerlukan izin kamera untuk mengambil foto barang.');
    return;
   }
   const result=await ImagePicker.launchCameraAsync({
    mediaTypes:['images'],
    allowsEditing:true,
    aspect:[4,3],
    quality:0.6,
    base64:true,
   });
   if(!result.canceled&&result.assets&&result.assets.length>0){
    setSelectedImage(result.assets[0].uri);
    setSelectedImageBase64(result.assets[0].base64||null);
    setError('');
   }
  }catch(e){
   setError('Gagal membuka kamera: '+(e.message||'Kesalahan sistem'));
  }
 };

 const changePhotoChoice=()=>{
  Alert.alert(
   'Ganti Foto Barang',
   'Pilih sumber foto baru:',
   [
    {text:'Pilih dari Galeri',onPress:pickFromGallery},
    {text:'Ambil Foto (Kamera)',onPress:takePhoto},
    {text:'Batal',style:'cancel'}
   ]
  );
 };

 const authenticated=Boolean(authUser);
 const handleUnauthorized=useCallback(async()=>{
  await clearSession().catch(()=>{});
  setAuthUser(null);setItems([]);setSelected(null);setScreen('login');
  setError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.');
 },[]);
 const guarded=useCallback(async(promise)=>{
  try{return await promise();}
  catch(e){if(e.status===401)await handleUnauthorized();throw e;}
 },[handleUnauthorized]);

 // Week 8: GET /barang menggunakan async/await; state loading dan error mengendalikan respons API.
 const refreshItems=useCallback(async()=>{
  setLoadingItems(true);setItemsError('');setItemsErrorObj(null);
  try {const list=await guarded(fetchBarang);setItems(list);return list;}
  catch(e){
   if(e.status!==401){
    setItemsError(e.message||'Gagal mengambil data barang. Silakan coba lagi.');
    setItemsErrorObj(e);
   }
   return [];
  }finally{setLoadingItems(false);}
 },[guarded]);

 // Week 9 Task 01 (anggota-1-get): GET barang hilang — useEffect, async/await, try/catch/finally, Alert error, empty state.
 const loadBarangHilang=useCallback(async()=>{
  setLoadingHilang(true);setHilangError(null);
  try{
   const list=await guarded(fetchBarangHilang);
   setBarangHilang(list);
  }catch(e){
   if(e.status!==401){
    setHilangError(e);
    Alert.alert(
     'Gagal Memuat Barang Hilang',
     e.message||'Tidak dapat mengambil daftar barang hilang. Periksa koneksi dan coba lagi.',
     [{text:'OK'}]
    );
   }
  }finally{setLoadingHilang(false);}
 },[guarded]);

 // Week 9 Task 01 (anggota-1-get): GET barang temuan — useEffect, async/await, try/catch/finally, Alert error, empty state.
 const loadBarangTemuan=useCallback(async()=>{
  setLoadingTemuan(true);setTemuanError(null);
  try{
   const list=await guarded(fetchBarangTemuan);
   setBarangTemuan(list);
  }catch(e){
   if(e.status!==401){
    setTemuanError(e);
    Alert.alert(
     'Gagal Memuat Barang Temuan',
     e.message||'Tidak dapat mengambil daftar barang temuan. Periksa koneksi dan coba lagi.',
     [{text:'OK'}]
    );
   }
  }finally{setLoadingTemuan(false);}
 },[guarded]);

 // Week 9 Task 01 (anggota-1-get): Refresh kedua jenis barang sekaligus (barang hilang + temuan)
 const refreshAllBarang=useCallback(async()=>{
  await Promise.all([loadBarangHilang(),loadBarangTemuan()]);
 },[loadBarangHilang,loadBarangTemuan]);

 // Week 6 Task 02 & Task 03: Retry mechanism dengan pencegahan request ganda dan pengecekan koneksi
 const handleRetry=useCallback(async()=>{
  if(loadingItems)return; // Cegah request ganda (TEST 08)
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
  // Week 9 Task 01 (anggota-1-get): Refresh barang hilang & temuan saat user menekan Refresh
  await refreshAllBarang();
 },[loadingItems,refreshItems,refreshAllBarang]);

 // Week 5 Task 03: Session Management (checkSession & restoreSession)
 const checkSession = useCallback(async () => {
  try {
   const token = await getToken();
   if (!token) return null;
   // Jangan menganggap token pasti valid hanya karena tersimpan di SecureStore.
   // Validasi token langsung ke endpoint backend GET /me.
   const profile = await getProfile();
   return profile?.user || null;
  } catch (e) {
   if (e.status === 401) {
    await clearSession().catch(() => {});
   }
   return null;
  }
 }, []);

 const restoreSession = useCallback(async () => {
  try {
   const autoHost = getAutoDetectedHost();
   const autoUrl = autoHost ? `http://${autoHost}:4000` : null;
   const savedUrl = await getSavedApiUrl();
   const targetUrl = autoUrl || savedUrl || getApiBaseUrl();
   if (targetUrl) {
    setApiBaseUrl(targetUrl);
    setCustomApiUrl(targetUrl);
   }
   const preferences = await getPreference();
   setCompactMode(Boolean(preferences.compactMode));
   const validUser = await checkSession();
   if (validUser) {
    setAuthUser(validUser);
    setScreen('home');
   } else {
    setAuthUser(null);
    setScreen('login');
   }
  } catch (e) {
   await clearSession().catch(() => {});
   setAuthUser(null);
   setScreen('login');
   setError('Tidak dapat memeriksa sesi. Hubungkan kembali ke API dan login.');
  } finally {
   setBooting(false);
  }
 }, [checkSession]);

 useEffect(() => {
  restoreSession();
 }, [restoreSession]);
 // Week 8: useEffect menjalankan GET daftar barang setelah sesi pengguna berhasil dipulihkan.
 useEffect(()=>{if(authenticated)refreshItems();},[authenticated,refreshItems]);
 // Week 9 Task 01 (anggota-1-get): useEffect terpisah — GET barang hilang & temuan saat halaman pertama dibuka.
 useEffect(()=>{if(authenticated){loadBarangHilang();loadBarangTemuan();}},[authenticated,loadBarangHilang,loadBarangTemuan]);

 const changeAuth=(key,value)=>{setAuthForm(current=>({...current,[key]:value}));setError('');};
 const handleSaveApiUrl=async()=>{
  const trimmed=customApiUrl.trim().replace(/\/$/,'');
  if(!trimmed){
   Alert.alert('URL Kosong','Masukkan URL server API (contoh: http://192.168.31.52:4000)');
   return;
  }
  setApiBaseUrl(trimmed);
  await saveApiUrl(trimmed);
  setShowSettings(false);
  setError('');
  setMessage('Alamat server API berhasil diperbarui.');
 };
 const handleTestConnection=async()=>{
  const target=(customApiUrl||'').trim().replace(/\/$/,'');
  if(!target){setTestStatus('❌ Masukkan URL server terlebih dahulu.');return;}
  setTestingConnection(true);
  setTestStatus('⏳ Menguji koneksi...');
  try{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),4000);
   const res=await fetch(`${target}/barang`,{signal:controller.signal});
   clearTimeout(timer);
   if(res.status===401||res.status===200||res.ok){
    setTestStatus('✅ Berhasil terhubung ke server TemuKampus!');
   }else{
    setTestStatus(`⚠️ Server merespons (HTTP ${res.status})`);
   }
  }catch(err){
   setTestStatus('❌ Gagal terhubung. Pastikan laptop & HP di Wi-Fi yang sama dan server aktif.');
  }finally{
   setTestingConnection(false);
  }
 };
 const doRegister=async()=>{
  const {name,email,password,confirm}=authForm;
  if(!name.trim()||!email.trim()||!password){setError('Nama, email, dan password wajib diisi.');return;}
  if(!/^\S+@\S+\.\S+$/.test(email.trim())){setError('Format email tidak valid.');return;}
  if(password.length<8){setError('Password minimal 8 karakter.');return;}
  if(password!==confirm){setError('Konfirmasi password tidak cocok.');return;}
  setBusy(true);setError('');
  try{
   await registerUser(name.trim(),email.trim().toLowerCase(),password);
   setAuthForm({name:'',email:email.trim().toLowerCase(),password:'',confirm:''});
   setScreen('login');setMessage('Akun berhasil dibuat. Silakan masuk.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 // Week 5 Task 01 & 03: Token Authentication & Refresh Token (simpan access_token & refresh_token di SecureStore)
 const doLogin=async()=>{
  if(!authForm.email.trim()||!authForm.password){setError('Email dan password wajib diisi.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   const result=await loginWithAPI(authForm.email.trim().toLowerCase(),authForm.password);
   if(!result.access_token||!result.user)throw new Error('Server tidak memberikan token dan profil yang valid.');
   await saveSession(result.access_token,result.user,result.refresh_token);
   setAuthForm({name:'',email:'',password:'',confirm:''});
   setAuthUser(result.user);setScreen('home');
  }catch(e){setError(e.message||'Login gagal.');}finally{setBusy(false);}
 };
 // Week 5 Task 03: Demonstrasi pembaruan access token secara manual di profil
 const handleDemoRefresh=async()=>{
  setBusy(true);setError('');setMessage('');
  try{
   await refreshAccessToken();
   setMessage('Demonstrasi: Access token berhasil di-refresh & dirotasi!');
   Alert.alert('Sukses Refresh Token','Access token baru berhasil diterbitkan server dan disimpan di Expo SecureStore.');
  }catch(e){setError(e.message||'Gagal memperbarui token.');}finally{setBusy(false);}
 };
 // Week 5 Task 03: Session Management (logout)
 const logout = async () => {
  setBusy(true);
  setError('');
  let remoteFailed = false;
  try {
   // 1. Cabut token pada server (revokasi jti token)
   await logoutAPI();
  } catch (e) {
   remoteFailed = true;
  }
  try {
   // 2. Hapus access token dari SecureStore dan profil dari AsyncStorage
   await clearSession();
  } catch (e) {
   setError('Gagal menghapus sesi lokal. Coba kembali.');
   setBusy(false);
   return;
  }
  // 3. Bersihkan protected data dan cache dari memory
  setAuthUser(null);
  setItems([]);
  setSelected(null);
  // Week 9 Task 01 (anggota-1-get): Bersihkan cache barang hilang & temuan saat logout
  setBarangHilang([]);setBarangTemuan([]);setHilangError(null);setTemuanError(null);
  // 4. Ubah status dan arahkan ke login (isAuthenticated false, tidak bisa back ke Home)
  setScreen('login');
  setAuthForm({ name: '', email: '', password: '', confirm: '' });
  setMessage(
   remoteFailed
    ? 'Keluar dari perangkat ini; server tidak terjangkau, token lama akan kedaluwarsa.'
    : 'Kamu berhasil keluar dari akun.'
  );
  setBusy(false);
 };
 const doLogout = logout;
 const navigate=target=>{setScreen(target);setError('');setMessage('');};
 const selectItem=item=>{setSelected(item);navigate('detail');};
 const startReport=jenisLaporan=>{setForm({...blankForm,jenisLaporan});setSelectedImage(null);setSelectedImageBase64(null);navigate('report');};
 const changeReport=(key,value)=>setForm(previous=>({...previous,[key]:value}));
 // Week 9 Task 02 (anggota-2-post): POST /barang untuk laporan barang hilang dan temuan
 // - Validasi input sebelum kirim
 // - async/await & try/catch/finally
 // - ActivityIndicator selama proses pengiriman (busy)
 // - Alert untuk notifikasi berhasil & gagal
 // - Perbarui daftar barang setelah laporan berhasil disimpan
 const submitReport = async () => {
  // 1. Validasi input sebelum data dikirim
  if (!form.nama || !form.nama.trim()) {
   const msg = 'Nama barang wajib diisi.';
   setError(msg);
   Alert.alert('Validasi Gagal', msg);
   return;
  }
  if (!form.kategori || !categories.includes(form.kategori)) {
   const msg = 'Pilih kategori barang yang valid.';
   setError(msg);
   Alert.alert('Validasi Gagal', msg);
   return;
  }
  if (!form.lokasi || !form.lokasi.trim()) {
   const msg = 'Lokasi barang wajib diisi.';
   setError(msg);
   Alert.alert('Validasi Gagal', msg);
   return;
  }
  if (!form.deskripsi || !form.deskripsi.trim()) {
   const msg = 'Ciri-ciri / deskripsi barang wajib diisi.';
   setError(msg);
   Alert.alert('Validasi Gagal', msg);
   return;
  }
  if (!['Hilang', 'Ditemukan'].includes(form.jenisLaporan)) {
   const msg = 'Pilih jenis laporan yang valid (Hilang atau Ditemukan).';
   setError(msg);
   Alert.alert('Validasi Gagal', msg);
   return;
  }
  if (!form.verificationSecret || form.verificationSecret.trim().length < 4) {
   const msg = 'Ciri rahasia untuk verifikasi minimal 4 karakter.';
   setError(msg);
   Alert.alert('Validasi Gagal', msg);
   return;
  }

  // 2. Periksa koneksi internet sebelum mengirim laporan baru (cegah duplikasi dan kegagalan upload)
  try {
   const netState = await NetInfo.fetch();
   const online = Boolean(netState.isConnected && netState.isInternetReachable !== false);
   setIsOnline(online);
   if (!online) {
    const offlineMsg = 'Tidak ada koneksi internet. Formulir dan foto Anda tetap tersimpan. Silakan periksa koneksi Anda dan coba kirim kembali.';
    setError(offlineMsg);
    Alert.alert('Koneksi Terputus', offlineMsg);
    return; // Formulir dan foto tetap tersimpan, tidak di-reset, dan tidak melakukan auto-resend
   }
  } catch {}

  // 3. Tampilkan Loading (ActivityIndicator)
  setBusy(true);
  setError('');
  setMessage(selectedImage || selectedImageBase64 ? 'Mengunggah foto barang...' : 'Menyimpan laporan...');

  // 4. Proses pengiriman dengan try/catch/finally dan async/await
  try {
   let uploadedUrl = '';
   if (selectedImage || selectedImageBase64) {
    uploadedUrl = await guarded(() => uploadPhoto(selectedImage, selectedImageBase64));
   }
   setMessage('Menyimpan laporan ke server...');

   // Sanitasi payload: hanya field yang dikenali backend
   const payload = {
    nama: form.nama.trim(),
    kategori: form.kategori,
    lokasi: form.lokasi.trim(),
    deskripsi: form.deskripsi.trim(),
    jenisLaporan: form.jenisLaporan,
    verificationSecret: form.verificationSecret.trim(),
    ...(uploadedUrl ? { image: uploadedUrl } : {})
   };

   // POST laporan barang hilang atau temuan via API
   const created = await guarded(() =>
    payload.jenisLaporan === 'Hilang' ? createBarangHilang(payload) : createBarangTemuan(payload)
   );

   // 5. Perbarui daftar barang agar laporan terbaru dapat ditampilkan
   await refreshItems();
   if (typeof refreshAllBarang === 'function') {
    await refreshAllBarang();
   }

   // 6. Reset form, arahkan ke detail barang yang baru dibuat
   setForm(blankForm);
   setSelectedImage(null);
   setSelectedImageBase64(null);
   setSelected(created);
   setScreen('detail');

   // 7. Tampilkan Alert berhasil
   const successMsg = `Laporan barang ${created.jenisLaporan.toLowerCase()} "${created.nama}" berhasil tersimpan pada server.`;
   setMessage(successMsg);
   Alert.alert(
    'Laporan Berhasil Dikirim',
    `Laporan barang ${created.jenisLaporan.toLowerCase()} "${created.nama}" berhasil dibuat dengan status awal "${created.status}".`,
    [{ text: 'OK' }]
   );
  } catch (e) {
   if (e.status !== 401) {
    const errorMessage = (!isOnline || e.isNetworkError)
     ? 'Gagal mengirim laporan karena gangguan jaringan atau server tidak terjangkau. Formulir dan foto Anda tetap tersimpan.'
     : (e.message || 'Gagal mengirim laporan ke server.');
    setError(errorMessage);
    Alert.alert('Laporan Barang Gagal Dikirim', errorMessage, [{ text: 'OK' }]);
   }
  } finally {
   // 8. Matikan loading indicator pada blok finally
   setBusy(false);
  }
 };
 const submitClaim=async()=>{
  if(!claimAnswer.trim()){setError('Isi ciri khusus barang untuk verifikasi.');return;}
  if(!isOnline){setError('Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   const result=await guarded(()=>verifyBarang(selected.id,claimAnswer));
   setSelected(result.item);setClaimAnswer('');setMessage(result.message);await refreshItems();setScreen('detail');
  }catch(e){
   if(e.status!==401){
    const errorMessage=e.message||'Verifikasi barang belum berhasil. Silakan coba lagi.';
    setError(errorMessage);
    Alert.alert('Verifikasi Barang Gagal',errorMessage);
   }
  }finally{setBusy(false);}
 };
 // Week 8 & Week 9 Task 03 (anggota-3-patch): PATCH API dan Error Handling
 // 1. updateReportStatus: Memperbarui status penanganan laporan barang via PATCH /barang/:id/status
 const updateReportStatus=async(target=selected,newStatus='Selesai Dikembalikan',successMsg=null)=>{
  if(!target?.id)return;
  if(!isOnline){
   const netErr='Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.';
   setError(netErr);
   Alert.alert('Koneksi Terputus',netErr);
   return;
  }
  setPatchLoading(true);setBusy(true);setError('');setMessage('');
  // Simpan state sebelumnya untuk menjaga konsistensi data jika request gagal (rollback snapshot)
  const prevSelected=selected;
  const prevItems=items;
  try{
   const updated=await guarded(()=>patchBarangStatus(target.id,newStatus));
   if(selected?.id===target.id)setSelected(updated);
   setItems(current=>current.map(it=>it.id===target.id?updated:it));

   const finalSuccessMsg=successMsg||`Status laporan berhasil diperbarui menjadi "${updated.status}".`;
   setMessage(finalSuccessMsg);
   Alert.alert('Status Berhasil Diperbarui',finalSuccessMsg,[{text:'OK'}]);

   await refreshItems();
   if(typeof refreshAllBarang==='function')await refreshAllBarang();
  }catch(e){
   // Pastikan data tetap konsisten ketika request gagal
   if(selected?.id===target.id)setSelected(prevSelected);
   setItems(prevItems);

   if(e.status!==401){
    const errorMessage=(!isOnline||e.isNetworkError)
     ?'Gagal memperbarui status karena gangguan jaringan atau server tidak terjangkau. Status laporan tidak berubah.'
     :(e.message||'Status penanganan belum berhasil diperbarui. Silakan coba lagi.');
    setError(errorMessage);
    Alert.alert('Pembaruan Status Gagal',errorMessage,[{text:'OK'}]);
   }
  }finally{
   setPatchLoading(false);
   setBusy(false);
  }
 };

 const completeReturn=async(target=selected)=>{
  return updateReportStatus(target,'Selesai Dikembalikan','Pengembalian barang berhasil dikonfirmasi. Laporan selesai.');
 };

 const markReportUnresolved=async(target=selected)=>{
  return updateReportStatus(target,'Belum Terselesaikan','Laporan barang berhasil ditandai sebagai Belum Terselesaikan.');
 };

 // 2. submitEditBarang: Memperbarui informasi laporan barang via PATCH /barang/:id
 const openEditModal=()=>{
  if(!selected)return;
  setEditForm({
   nama:selected.nama||'',
   kategori:selected.kategori||'Elektronik',
   lokasi:selected.lokasi||'',
   deskripsi:selected.deskripsi||''
  });
  setEditModalVisible(true);
 };

 const submitEditBarang=async()=>{
  if(!selected?.id)return;
  if(!editForm.nama.trim()||!editForm.lokasi.trim()||!editForm.deskripsi.trim()){
   Alert.alert('Validasi Formulir','Nama barang, lokasi, dan deskripsi tidak boleh kosong.');
   return;
  }
  if(!isOnline){
   const netErr='Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.';
   setError(netErr);
   Alert.alert('Koneksi Terputus',netErr);
   return;
  }
  setPatchLoading(true);setBusy(true);setError('');setMessage('');
  const prevSelected=selected;
  const prevItems=items;
  try{
   const updated=await guarded(()=>patchBarang(selected.id,editForm));
   setSelected(updated);
   setItems(current=>current.map(it=>it.id===selected.id?updated:it));
   setEditModalVisible(false);

   const msg='Informasi laporan barang berhasil diperbarui.';
   setMessage(msg);
   Alert.alert('Pembaruan Berhasil',msg,[{text:'OK'}]);

   await refreshItems();
   if(typeof refreshAllBarang==='function')await refreshAllBarang();
  }catch(e){
   setSelected(prevSelected);
   setItems(prevItems);

   if(e.status!==401){
    const errorMessage=(!isOnline||e.isNetworkError)
     ?'Gagal memperbarui informasi karena gangguan jaringan atau server tidak terjangkau. Data laporan tetap dipertahankan.'
     :(e.message||'Gagal memperbarui informasi laporan barang.');
    setError(errorMessage);
    Alert.alert('Pembaruan Gagal',errorMessage,[{text:'OK'}]);
   }
  }finally{
   setPatchLoading(false);
   setBusy(false);
  }
 };

 const filtered=useMemo(()=>items.filter(item=>{
  const text=search.trim().toLocaleLowerCase('id');
  const match=!text||[item.nama,item.kategori,item.lokasi,item.deskripsi,item.jenisLaporan,item.status].some(v=>String(v||'').toLocaleLowerCase('id').includes(text));
  return match&&(category==='Semua'||item.kategori===category)&&(typeFilter==='Semua'||item.jenisLaporan===typeFilter)&&(statusFilter==='Semua'||item.status===statusFilter);
 }),[items,search,category,typeFilter,statusFilter]);
 const followUpItems=useMemo(()=>items.filter(item=>item.status!=='Selesai Dikembalikan'&&item.status!=='Belum Terselesaikan'),[items]);
 const chooseCategory=cat=>{setCategory(cat);setStatusFilter('Semua');navigate('list');};
 const cover=(child)=> <View style={[styles.pageContent,{maxWidth:wide?860:600,paddingHorizontal:wide?30:18}]}>{child}</View>;

 if(booting)return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={primary}/><Text style={styles.muted}>Memeriksa sesi login...</Text></SafeAreaView>;
 if(!authenticated){
  const registering=screen==='register';
  return <SafeAreaView style={styles.page}><StatusBar barStyle="dark-content"/>
   <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
     <View style={[styles.authBox,{maxWidth:wide?520:460}]}>
      <Pressable onPress={()=>{setTestStatus('');setShowSettings(true);}} style={styles.settingsBtn} accessibilityRole="button" accessibilityLabel="Pengaturan Alamat Server API">
       <Text style={styles.settingsBtnIcon}>⚙️</Text>
      </Pressable>
      <View style={styles.logo}><Text style={styles.logoIcon}>⌕</Text></View>
      <Text style={styles.appTitle}>TEMUKAMPUS</Text>
      <Text style={styles.authSubtitle}>{registering?'Buat akun baru':'Masuk untuk mencari dan melaporkan barang di kampus'}</Text>
      {!API_BASE_URL&&<StatusMessage error message="API belum dikonfigurasi. Ikuti README untuk mengisi .env dan menjalankan server."/>}
      <StatusMessage message={error} error/><StatusMessage message={message}/>
      {registering&&<Field label="Nama Lengkap" value={authForm.name} onChangeText={v=>changeAuth('name',v)} placeholder="Nama mahasiswa"/>}
      <Field label="Email" value={authForm.email} onChangeText={v=>changeAuth('email',v)} placeholder="nama@kampus.ac.id" keyboardType="email-address" autoCapitalize="none"/>
      <Field label="Password" value={authForm.password} onChangeText={v=>changeAuth('password',v)} placeholder="Minimal 8 karakter" secret autoCapitalize="none"/>
      {registering&&<Field label="Konfirmasi Password" value={authForm.confirm} onChangeText={v=>changeAuth('confirm',v)} placeholder="Ulangi password" secret autoCapitalize="none"/>}
      <UIButton title={busy?'Tunggu...':registering?'Daftar':'Masuk'} disabled={busy||!API_BASE_URL} onPress={registering?doRegister:doLogin}/>
      <Pressable accessibilityRole="button" onPress={()=>{setError('');setMessage('');setScreen(registering?'login':'register');}} style={styles.switch}>
       <Text style={styles.link}>{registering?'Sudah punya akun? Masuk':'Belum punya akun? Daftar sekarang'}</Text>
      </Pressable>
      <Text style={styles.authNote}>Akun demo praktikum tersedia pada README. Jangan gunakan password akun pribadi untuk pengujian.</Text>
     </View>
    </ScrollView>
   </KeyboardAvoidingView>
   <Modal visible={showSettings} transparent animationType="slide" onRequestClose={()=>setShowSettings(false)}>
    <View style={styles.modalOverlay}>
     <View style={[styles.modalCard,{maxWidth:wide?520:420}]}>
      <View style={styles.modalHeader}>
       <Text style={styles.modalTitle}>⚙️ Pengaturan Server API</Text>
       <Pressable onPress={()=>setShowSettings(false)} style={styles.modalCloseBtn}>
        <Text style={styles.modalCloseText}>✕</Text>
       </Pressable>
      </View>
      <Text style={styles.modalDesc}>
       Ganti alamat IP server backend jika HP dan laptop berpindah Wi-Fi:
      </Text>
      <TextInput
       value={customApiUrl}
       onChangeText={setCustomApiUrl}
       placeholder="http://192.168.31.52:4000"
       autoCapitalize="none"
       autoCorrect={false}
       keyboardType="url"
       style={styles.modalInput}
      />
      <Pressable onPress={()=>setCustomApiUrl('http://192.168.31.52:4000')} style={styles.quickIpBtn}>
       <Text style={styles.quickIpText}>⚡ Gunakan IP Wi-Fi Saat Ini (192.168.31.52)</Text>
      </Pressable>
      {!!testStatus && (
       <Text style={[styles.testStatusText, testStatus.includes('✅')?styles.testSuccess:styles.testFail]}>
        {testStatus}
       </Text>
      )}
      <View style={styles.modalActions}>
       <UIButton title={testingConnection?'Menguji...':'Tes Koneksi'} secondary disabled={testingConnection} onPress={handleTestConnection} style={{flex:1}}/>
       <UIButton title="Simpan" onPress={handleSaveApiUrl} style={{flex:1}}/>
      </View>
     </View>
    </View>
   </Modal>
  </SafeAreaView>;
 }
 const activeTab=['home','list','report','followup','sensor','profile'].includes(screen)?screen:screen==='detail'||screen==='verify'||screen==='status'?'list':'home';
 return <SafeAreaView style={styles.page}><StatusBar barStyle="dark-content"/>
  <Header userName={authUser?.name}/>
  {!isOnline && (
   <View style={styles.offlineBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
    <Text style={styles.offlineBannerText}>📡 Mode Offline — Tidak ada koneksi internet. Periksa koneksi Anda.</Text>
   </View>
  )}
  {screen==='followup' ? <View style={styles.flex}>
   {cover(<>
    <Text style={styles.heading} accessibilityRole="header">Tindak Lanjut Laporan</Text>
    <Text style={styles.muted}>Laporan yang masih perlu diperhatikan, mulai dari pencocokan barang hingga konfirmasi pengembalian.</Text>
    <View style={styles.followUpSummary}>
     <View style={styles.followUpSummaryCell}><Text style={styles.followUpCount}>{followUpItems.length}</Text><Text style={styles.followUpSummaryLabel}>Laporan aktif</Text></View>
     <View style={styles.followUpSummaryCell}><Text style={styles.followUpCount}>{items.filter(item=>item.ownerId===authUser.id&&item.status==='Menunggu Pengambilan').length}</Text><Text style={styles.followUpSummaryLabel}>Perlu konfirmasi</Text></View>
     <View style={styles.followUpSummaryCell}><Text style={styles.followUpCount}>{items.filter(item=>item.jenisLaporan==='Ditemukan'&&item.ownerId!==authUser.id&&item.status==='Menunggu Pemilik').length}</Text><Text style={styles.followUpSummaryLabel}>Barang temuan</Text></View>
    </View>
    <View style={styles.listRefreshRow}>
     <Text style={styles.listRefreshHint}>{loadingItems?'Memperbarui laporan...':`${followUpItems.length} laporan masih memerlukan perhatian`}</Text>
     <Pressable onPress={handleRetry} disabled={loadingItems} accessibilityRole="button" accessibilityLabel="Refresh tindak lanjut" style={[styles.listRefreshButton,loadingItems&&styles.disabled]}>
      {loadingItems?<ActivityIndicator size="small" color={primary}/>:<Text style={styles.listRefreshText}>↻ Refresh</Text>}
     </Pressable>
    </View>
   </>)}
   {loadingItems&&items.length===0?cover(<LoadingStateView message="Memuat tindak lanjut laporan..."/>):itemsError?cover(<ErrorStateView error={itemsErrorObj} isOffline={!isOnline} onRetry={handleRetry} retrying={loadingItems}/>):followUpItems.length===0?cover(<EmptyStateView title="Tidak Ada Tindak Lanjut" message="Semua laporan sudah selesai ditangani. Jika ada barang baru, kamu bisa membuat laporan."/>):(
    <FlatList data={followUpItems} keyExtractor={item=>String(item.id)} contentContainerStyle={[styles.listContent,{maxWidth:wide?860:600,paddingHorizontal:wide?30:18}]} refreshing={loadingItems} onRefresh={handleRetry} renderItem={({item})=>{
     const info=getFollowUpInfo(item,authUser.id);
     return <View style={styles.followUpCard}>
      <View style={styles.followUpCardTop}><Text style={styles.followUpItemName}>{item.nama}</Text><Text style={styles.followUpType}>{item.jenisLaporan==='Hilang'?'Barang Hilang':'Barang Ditemukan'}</Text></View>
      <Text style={styles.followUpStatus}>{item.status}</Text>
      <Text style={styles.followUpActionTitle}>{info.title}</Text>
      <Text style={styles.followUpDescription}>{info.description}</Text>
      <Text style={styles.followUpMeta}>📍 {item.lokasi}  •  Pelapor: {item.pelapor}</Text>
      <UIButton title={busy&&info.kind==='confirm'?'Memproses...':info.button} disabled={busy} secondary={info.kind!=='confirm'} onPress={()=>{
       if(info.kind==='confirm')Alert.alert('Konfirmasi Pengembalian','Pastikan barang benar-benar sudah diterima pemilik sebelum menyelesaikan laporan.',[{text:'Belum',style:'cancel'},{text:'Ya, sudah diterima',onPress:()=>completeReturn(item)}]);
       else {setSelected(item);navigate('detail');}
      }}/>
     </View>;
    }}/>
   )}
  </View> : screen==='list' ? <View style={styles.flex}>
    {cover(<>
     <Text style={styles.heading} accessibilityRole="header">Daftar Barang</Text>
     <SearchBar value={search} onChangeText={setSearch}/>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {['Semua',...reportTypes].map(s=><Choice key={s} label={s==='Semua'?'Semua Jenis':`Barang ${s}`} selected={typeFilter===s} onPress={()=>setTypeFilter(s)}/>)}
     </ScrollView>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {['Semua',...handlingStatuses].map(s=><Choice key={s} label={s==='Semua'?'Semua Status':s} selected={statusFilter===s} onPress={()=>setStatusFilter(s)}/>)}
     </ScrollView>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {['Semua',...categories].map(cat=><Choice key={cat} label={cat} selected={category===cat} onPress={()=>setCategory(cat)}/>)}
     </ScrollView>
     <View style={styles.listRefreshRow}>
      <Text style={styles.listRefreshHint}>{loadingItems?'Memuat data dari server...':`${filtered.length} laporan barang ditampilkan`}</Text>
      <Pressable onPress={handleRetry} disabled={loadingItems} accessibilityRole="button" accessibilityLabel="Muat ulang daftar barang" style={[styles.listRefreshButton,loadingItems&&styles.disabled]}>
       {loadingItems?<ActivityIndicator size="small" color={primary}/>:<Text style={styles.listRefreshText}>↻ Refresh</Text>}
      </Pressable>
     </View>
    </>)}
    {loadingItems && items.length === 0 ? (
     cover(<LoadingStateView message="Memuat data barang..." />)
    ) : itemsError ? (
     cover(<ErrorStateView error={itemsErrorObj} isOffline={!isOnline} onRetry={handleRetry} retrying={loadingItems} />)
    ) : filtered.length === 0 ? (
     cover(
      search.trim() || category !== 'Semua' || typeFilter !== 'Semua' || statusFilter !== 'Semua' ? (
       <Text style={[styles.muted, { textAlign: 'center', marginTop: 24 }]}>Tidak ada barang yang sesuai kriteria pencarian/filter.</Text>
      ) : (
       <EmptyStateView title="Belum Ada Barang" message="Belum ada laporan barang." />
      )
     )
    ) : (
     <FlatList data={filtered} keyExtractor={item=>String(item.id)} renderItem={({item})=><ItemCard item={item} compact={compactMode} onPress={()=>selectItem(item)}/>}
      contentContainerStyle={[styles.listContent,{maxWidth:wide?860:600,paddingHorizontal:wide?30:18}]}
      refreshing={loadingItems} onRefresh={handleRetry} />
    )}
   </View> :
   <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:30}}>
    {cover(<>
     {screen==='home'&&<>
      <SearchBar value={search} onChangeText={setSearch}/>
      <ActionMenu onLost={()=>startReport('Hilang')} onFound={()=>startReport('Ditemukan')}/>
      <Pressable onPress={()=>navigate('sensor')} accessibilityRole="button" accessibilityLabel="Fitur Keamanan Pengaman Meja" style={styles.guardBanner}>
       <Text style={{fontSize:24,marginRight:12}}>🛡️</Text>
       <View style={{flex:1}}>
        <Text style={styles.guardBannerTitle}>Fitur Keamanan: Pengaman Meja</Text>
        <Text style={styles.guardBannerDesc}>Tinggalkan laptop di perpus/kantin dengan tenang lewat alarm sensor gerak</Text>
       </View>
       <Text style={styles.guardBannerArrow}>›</Text>
      </Pressable>
      <CategoryList onSelect={chooseCategory}/>
      {loadingItems && items.length === 0 ? (
       <LoadingStateView message="Memuat data barang..." />
      ) : itemsError ? (
       <ErrorStateView error={itemsErrorObj} isOffline={!isOnline} onRetry={handleRetry} retrying={loadingItems} />
      ) : items.length === 0 ? (
       <EmptyStateView title="Belum Ada Barang" message="Belum ada laporan barang." />
      ) : (
       <>
        {loadingItems && <ActivityIndicator color={primary} style={{ marginVertical: 8 }} />}
        <LatestItems items={filtered} onOpen={selectItem} onViewAll={()=>navigate('list')}/>
       </>
      )}
      <UIButton title={loadingItems ? "Memuat..." : "Muat ulang data barang"} onPress={handleRetry} secondary disabled={loadingItems} accessibilityLabel="Muat ulang data barang"/>
      {/* Week 9 Task 01 (anggota-1-get): Seksi GET Barang Hilang — useEffect, ActivityIndicator, pull-to-refresh, try/catch/finally, Alert, empty state */}
      <View style={styles.w9Section}>
       <View style={styles.w9SectionHeader}>
        <Text style={styles.w9SectionTitle}>🔍 Barang Hilang</Text>
        <Pressable onPress={loadBarangHilang} disabled={loadingHilang} accessibilityRole="button" accessibilityLabel="Refresh barang hilang" style={[styles.listRefreshButton,loadingHilang&&styles.disabled]}>
         {loadingHilang?<ActivityIndicator size="small" color={primary}/>:<Text style={styles.listRefreshText}>↻ Refresh</Text>}
        </Pressable>
       </View>
       {loadingHilang&&barangHilang.length===0?(
        <LoadingStateView message="Memuat daftar barang hilang..."/>
       ):hilangError?(
        <ErrorStateView error={hilangError} isOffline={!isOnline} onRetry={loadBarangHilang} retrying={loadingHilang}/>
       ):barangHilang.length===0?(
        <EmptyStateView title="Belum Ada Barang Hilang" message="Belum ada laporan barang hilang. Jika barang Anda hilang, buat laporan baru."/>
       ):(
        <>
         {loadingHilang&&<ActivityIndicator color={primary} style={{marginVertical:6}}/>}
         {barangHilang.slice(0,3).map(item=><ItemCard key={item.id} item={item} compact onPress={()=>selectItem(item)}/>)}
         {barangHilang.length>3&&<Pressable onPress={()=>{setTypeFilter('Hilang');navigate('list');}} accessibilityRole="button" style={styles.w9ViewAll}><Text style={styles.w9ViewAllText}>Lihat semua {barangHilang.length} barang hilang ›</Text></Pressable>}
        </>
       )}
      </View>
      {/* Week 9 Task 01 (anggota-1-get): Seksi GET Barang Temuan — useEffect, ActivityIndicator, pull-to-refresh, try/catch/finally, Alert, empty state */}
      <View style={styles.w9Section}>
       <View style={styles.w9SectionHeader}>
        <Text style={styles.w9SectionTitle}>📦 Barang Temuan</Text>
        <Pressable onPress={loadBarangTemuan} disabled={loadingTemuan} accessibilityRole="button" accessibilityLabel="Refresh barang temuan" style={[styles.listRefreshButton,loadingTemuan&&styles.disabled]}>
         {loadingTemuan?<ActivityIndicator size="small" color={primary}/>:<Text style={styles.listRefreshText}>↻ Refresh</Text>}
        </Pressable>
       </View>
       {loadingTemuan&&barangTemuan.length===0?(
        <LoadingStateView message="Memuat daftar barang temuan..."/>
       ):temuanError?(
        <ErrorStateView error={temuanError} isOffline={!isOnline} onRetry={loadBarangTemuan} retrying={loadingTemuan}/>
       ):barangTemuan.length===0?(
        <EmptyStateView title="Belum Ada Barang Temuan" message="Belum ada laporan barang temuan. Jika Anda menemukan barang, buat laporan baru."/>
       ):(
        <>
         {loadingTemuan&&<ActivityIndicator color={primary} style={{marginVertical:6}}/>}
         {barangTemuan.slice(0,3).map(item=><ItemCard key={item.id} item={item} compact onPress={()=>selectItem(item)}/>)}
         {barangTemuan.length>3&&<Pressable onPress={()=>{setTypeFilter('Ditemukan');navigate('list');}} accessibilityRole="button" style={styles.w9ViewAll}><Text style={styles.w9ViewAllText}>Lihat semua {barangTemuan.length} barang temuan ›</Text></Pressable>}
        </>
       )}
      </View>
     </>}
     {screen==='report'&&<>
      <Text style={styles.heading} accessibilityRole="header">Lapor Barang</Text><Text style={styles.muted}>Isi informasi dengan jelas untuk membantu proses pencarian.</Text>
      <Text style={styles.label}>Jenis Laporan</Text><View style={styles.choiceRow}>{reportTypes.map(s=><Choice key={s} label={`Barang ${s}`} selected={form.jenisLaporan===s} onPress={()=>changeReport('jenisLaporan',s)}/>)}</View>
      <StatusMessage message={error} error/>
      <Field label="Nama Barang" value={form.nama} onChangeText={v=>changeReport('nama',v)}/>
      <Text style={styles.label}>Kategori</Text><View style={styles.wrap}>{categories.map(cat=><Choice key={cat} label={cat} selected={form.kategori===cat} onPress={()=>changeReport('kategori',cat)}/>)}</View>
      <Field label="Lokasi terakhir / ditemukan" value={form.lokasi} onChangeText={v=>changeReport('lokasi',v)}/>
      <Field label="Ciri-ciri Barang" value={form.deskripsi} onChangeText={v=>changeReport('deskripsi',v)} multiline placeholder="Warna, ukuran, ciri khusus..."/>
      <View style={styles.field}>
       <Text style={styles.label}>Foto Barang (opsional)</Text>
       {!selectedImage ? (
        <View style={styles.photoPickerRow}>
         <Pressable onPress={pickFromGallery} accessibilityRole="button" accessibilityLabel="Pilih foto barang dari galeri" style={styles.pickerBtn}>
          <Text style={styles.pickerBtnIcon}>🖼️</Text>
          <Text style={styles.pickerBtnText}>Pilih dari Galeri</Text>
         </Pressable>
         <Pressable onPress={takePhoto} accessibilityRole="button" accessibilityLabel="Ambil foto barang dengan kamera" style={styles.pickerBtn}>
          <Text style={styles.pickerBtnIcon}>📸</Text>
          <Text style={styles.pickerBtnText}>Ambil Foto</Text>
         </Pressable>
        </View>
       ) : (
        <View style={styles.previewContainer}>
         <Image source={{uri:selectedImage}} style={styles.previewImage} accessibilityLabel="Preview foto barang yang dipilih" resizeMode="cover"/>
         <View style={styles.previewActions}>
          <Pressable onPress={changePhotoChoice} accessibilityRole="button" accessibilityLabel="Ganti foto barang" style={[styles.previewBtn,styles.previewBtnChange]}>
           <Text style={styles.previewBtnChangeText}>🔄 Ganti Foto</Text>
          </Pressable>
          <Pressable onPress={()=>{setSelectedImage(null);setSelectedImageBase64(null);}} accessibilityRole="button" accessibilityLabel="Hapus foto barang" style={[styles.previewBtn,styles.previewBtnDelete]}>
           <Text style={styles.previewBtnDeleteText}>🗑️ Hapus Foto</Text>
          </Pressable>
         </View>
        </View>
       )}
      </View>
      <Field label="Ciri rahasia untuk verifikasi" value={form.verificationSecret} onChangeText={v=>changeReport('verificationSecret',v)} placeholder="Jawaban yang diketahui pemilik barang"/>
      <Text style={styles.hint}>Ciri rahasia tidak akan ditampilkan pada daftar barang. Ini adalah simulasi verifikasi untuk praktikum, bukan pemeriksaan identitas resmi.</Text>
      {/* Week 9 Task 02 (anggota-2-post): Loading state & ActivityIndicator selama proses pengiriman */}
      {busy && (
       <View style={styles.submittingBox} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={primary}/>
        <Text style={styles.submittingText}>{message || 'Mengirim laporan ke server...'}</Text>
       </View>
      )}
      <UIButton title={busy ? 'Mengirim Laporan...' : 'Kirim Laporan'} loading={busy} onPress={submitReport} disabled={busy} accessibilityLabel="Kirim Laporan Barang"/>
     </>}
     {screen==='detail'&&selected&&<>
      <UIButton title="‹ Kembali ke Daftar" secondary onPress={()=>navigate('list')}/>
      <Text style={styles.heading} accessibilityRole="header">Detail Barang</Text>
      {Boolean(selected.image) && (
       <View style={styles.detailImageContainer}>
        <Image source={{uri:resolveImageUrl(selected.image)}} style={styles.detailImage} accessibilityLabel={`Foto ${selected.nama}`} resizeMode="cover"/>
       </View>
      )}
      <Text style={styles.detailName}>{selected.nama}</Text>
      {[['Jenis Laporan',`Barang ${selected.jenisLaporan}`],['Status Penanganan',selected.status],['Kategori',selected.kategori],['Lokasi',selected.lokasi],['Tanggal',selected.tanggal],['Pelapor',selected.pelapor],['Ciri-ciri',selected.deskripsi],['Verifikasi',selected.verificationStatus]].map(([key,value])=><View key={key} style={styles.detailRow}><Text style={styles.detailLabel}>{key}</Text><Text style={styles.detailValue}>{value}</Text></View>)}
      {/* Week 9 Task 03: Loading indicator saat proses PATCH berlangsung */}
      {patchLoading && (
       <View style={styles.submittingBox} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={primary}/>
        <Text style={styles.submittingText}>Memperbarui laporan pada server...</Text>
       </View>
      )}
      <StatusMessage message={error} error/><StatusMessage message={message}/>
      <UIButton title="Lihat Perkembangan Laporan" secondary onPress={()=>navigate('status')}/>
      {selected.ownerId!==authUser.id&&selected.status!=='Selesai Dikembalikan'&&selected.status!=='Belum Terselesaikan'&&selected.verificationStatus!=='Terverifikasi'&&<UIButton title="Verifikasi Kepemilikan Barang" onPress={()=>{setClaimAnswer('');navigate('verify');}}/>}
      {/* Week 9 Task 03 (anggota-3-patch): Aksi Pemilik Laporan via PATCH API */}
      {selected.ownerId===authUser.id&&selected.verificationStatus==='Terverifikasi'&&selected.status==='Menunggu Pengambilan'&&(
       <UIButton
        title={patchLoading ? "Memproses..." : "Konfirmasi Barang Sudah Diterima"}
        loading={patchLoading}
        disabled={busy||patchLoading}
        onPress={()=>Alert.alert('Konfirmasi Pengembalian','Pastikan barang benar-benar sudah diterima pemilik sebelum menyelesaikan laporan.',[{text:'Belum',style:'cancel'},{text:'Ya, sudah diterima',onPress:()=>completeReturn(selected)}])}
       />
      )}
      {selected.ownerId===authUser.id&&selected.status!=='Selesai Dikembalikan'&&selected.status!=='Belum Terselesaikan'&&(
       <View style={{gap:8,marginTop:6}}>
        <UIButton
         title="✏️ Edit Informasi Laporan (PATCH)"
         secondary
         disabled={busy||patchLoading}
         onPress={openEditModal}
        />
        <UIButton
         title="Tandai Belum Terselesaikan"
         danger
         secondary
         disabled={busy||patchLoading}
         onPress={()=>Alert.alert('Tandai Belum Terselesaikan','Apakah Anda yakin ingin menandai laporan ini sebagai Belum Terselesaikan?',[{text:'Batal',style:'cancel'},{text:'Ya, Tandai',onPress:()=>markReportUnresolved(selected)}])}
        />
       </View>
      )}
     </>}
     {screen==='status'&&selected&&<>
      <UIButton title="‹ Kembali ke Detail" secondary onPress={()=>navigate('detail')}/>
      <Text style={styles.heading} accessibilityRole="header">Perkembangan Laporan</Text><Text style={styles.detailName}>{selected.nama}</Text>
      <View style={styles.statusBox}>
       <Text style={styles.statusBoxTitle}>Barang {selected.jenisLaporan}</Text>
       <Text style={styles.statusCurrent}>{selected.status}</Text>
       <Text style={styles.muted}>{getHandlingDescription(selected)}</Text>
       <View style={styles.timelineRow}><Text style={styles.timelineDone}>✓</Text><View style={styles.timelineText}><Text style={styles.timelineTitle}>Laporan diterima</Text><Text style={styles.mutedSmall}>Informasi barang tersimpan di TemuKampus.</Text></View></View>
       <View style={styles.timelineRow}><Text style={selected.status==='Belum Ditemukan'||selected.status==='Menunggu Pemilik'||selected.status==='Menunggu Verifikasi'?styles.timelineActive:styles.timelineDone}>{selected.status==='Belum Ditemukan'||selected.status==='Menunggu Pemilik'||selected.status==='Menunggu Verifikasi'?'◉':'✓'}</Text><View style={styles.timelineText}><Text style={styles.timelineTitle}>{selected.jenisLaporan==='Hilang'?'Pencarian barang':'Menunggu pemilik'}</Text><Text style={styles.mutedSmall}>{selected.jenisLaporan==='Hilang'?'Laporan menunggu kecocokan dengan barang temuan.':'Pemilik memeriksa ciri khusus barang.'}</Text></View></View>
       <View style={styles.timelineRow}><Text style={selected.status==='Menunggu Pengambilan'?'◉':selected.status==='Selesai Dikembalikan'?'✓':'○'} style={selected.status==='Menunggu Pengambilan'?styles.timelineActive:selected.status==='Selesai Dikembalikan'?styles.timelineDone:styles.timelinePending}>{selected.status==='Menunggu Pengambilan'?'◉':selected.status==='Selesai Dikembalikan'?'✓':'○'}</Text><View style={styles.timelineText}><Text style={styles.timelineTitle}>Menunggu pengambilan</Text><Text style={styles.mutedSmall}>Ciri barang telah diverifikasi dan menunggu konfirmasi pelapor.</Text></View></View>
       <View style={styles.timelineRow}><Text style={selected.status==='Selesai Dikembalikan'?styles.timelineDone:selected.status==='Belum Terselesaikan'?styles.timelinePending:styles.timelinePending}>{selected.status==='Selesai Dikembalikan'?'✓':selected.status==='Belum Terselesaikan'?'✕':'○'}</Text><View style={styles.timelineText}><Text style={styles.timelineTitle}>{selected.status==='Belum Terselesaikan'?'Belum terselesaikan':'Selesai dikembalikan'}</Text><Text style={styles.mutedSmall}>{selected.status==='Belum Terselesaikan'?'Laporan ditutup dengan status belum terselesaikan.':'Pelapor mengonfirmasi barang sudah diterima.'}</Text></View></View>
      </View>
     </>}
     {screen==='verify'&&selected&&<>
      <UIButton title="‹ Kembali ke Detail" secondary onPress={()=>navigate('detail')}/>
      <Text style={styles.heading} accessibilityRole="header">Verifikasi Pengambilan</Text>
      <Text style={styles.muted}>Masukkan ciri khusus yang diketahui pemilik. Server yang memeriksa jawabannya.</Text>
      <StatusMessage message={error} error/>
      <Field label="Ciri khusus barang" value={claimAnswer} onChangeText={setClaimAnswer} multiline placeholder="Contoh: logo kecil di pojok"/>
      <UIButton title={busy?'Memverifikasi...':'Kirim Verifikasi'} disabled={busy} onPress={submitClaim}/>
      <Text style={styles.hint}>Untuk penggunaan nyata diperlukan pemeriksaan oleh petugas kampus sebelum penyerahan barang.</Text>
     </>}
     {screen==='sensor'&&<SensorScreen onReportLost={()=>startReport('Hilang')}/>}
     {screen==='profile'&&<>
      <Text style={styles.heading} accessibilityRole="header">Profil</Text>
      <View style={styles.profile}><Text style={styles.detailName}>{authUser.name}</Text><Text style={styles.muted}>{authUser.email}</Text></View>
      <Text style={styles.label}>Preferensi tersimpan (AsyncStorage)</Text>
      <Choice label={compactMode?'Mode ringkas: aktif':'Mode ringkas: nonaktif'} selected={compactMode} onPress={async()=>{
       const next=!compactMode;try{await savePreference({compactMode:next});setCompactMode(next);}catch{setError('Gagal menyimpan preferensi.');}
      }}/>
      <Text style={styles.hint}>Mode ringkas menyimpan preferensi tampilan. Login menggunakan token server yang disimpan di SecureStore.</Text>
      <StatusMessage message={error} error/>
      <UIButton title={busy?'Memproses...':'Simulasi Refresh Token'} outline disabled={busy} onPress={handleDemoRefresh}/>
      <UIButton title={busy?'Memproses...':'Keluar (Logout)'} danger disabled={busy} onPress={()=>Alert.alert('Konfirmasi Logout','Keluar dari akun TemuKampus?', [{text:'Batal',style:'cancel'},{text:'Keluar',style:'destructive',onPress:logout}])}/>
     </>}
    </>)}
   </ScrollView>}
  <BottomNav active={activeTab} onSelect={target=>{if(target==='report')startReport('Hilang');else navigate(target);}}/>
  {/* Week 9 Task 03 (anggota-3-patch): Modal Edit Informasi Laporan via PATCH API */}
  <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={()=>setEditModalVisible(false)}>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}>
    <View style={[styles.modalCard,{maxWidth:wide?520:420}]}>
     <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>✏️ Edit Informasi Laporan</Text>
      <Pressable onPress={()=>setEditModalVisible(false)} style={styles.modalCloseBtn} accessibilityRole="button" accessibilityLabel="Tutup modal edit">
       <Text style={styles.modalCloseText}>✕</Text>
      </Pressable>
     </View>
     <Text style={styles.modalDesc}>Perbarui data laporan barang yang Anda buat (dikirim via PATCH API):</Text>
     <Field label="Nama Barang" value={editForm.nama} onChangeText={v=>setEditForm(f=>({...f,nama:v}))}/>
     <Text style={styles.label}>Kategori</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {categories.map(cat=><Choice key={cat} label={cat} selected={editForm.kategori===cat} onPress={()=>setEditForm(f=>({...f,kategori:cat}))}/>)}
     </ScrollView>
     <Field label="Lokasi" value={editForm.lokasi} onChangeText={v=>setEditForm(f=>({...f,lokasi:v}))}/>
     <Field label="Ciri-ciri / Deskripsi" value={editForm.deskripsi} onChangeText={v=>setEditForm(f=>({...f,deskripsi:v}))} multiline/>
     <View style={styles.modalActions}>
      <UIButton title="Batal" secondary disabled={patchLoading} onPress={()=>setEditModalVisible(false)} style={{flex:1}}/>
      <UIButton title={patchLoading ? 'Menyimpan...' : 'Simpan (PATCH)'} loading={patchLoading} disabled={patchLoading} onPress={submitEditBarang} style={{flex:1}}/>
     </View>
    </View>
   </KeyboardAvoidingView>
  </Modal>
 </SafeAreaView>;
}

const styles=StyleSheet.create({
 flex:{flex:1},page:{flex:1,backgroundColor:'#F8FAFC'},pageContent:{alignSelf:'center',width:'100%',paddingTop:18},center:{flex:1,alignItems:'center',justifyContent:'center',gap:16},muted:{fontSize:14,lineHeight:21,color:'#526580',marginVertical:8},hint:{fontSize:12,lineHeight:19,color:'#64748B',marginBottom:16},
 heading:{fontWeight:'800',fontSize:22,color:'#14213A',marginBottom:14},detailName:{fontWeight:'800',fontSize:19,color:'#15335A',marginVertical:10},
 listRefreshRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:4,marginBottom:8},listRefreshHint:{flex:1,color:'#64748B',fontSize:12},listRefreshButton:{minHeight:36,paddingHorizontal:12,borderRadius:9,borderWidth:1,borderColor:'#BFDBFE',backgroundColor:'#EFF6FF',alignItems:'center',justifyContent:'center'},listRefreshText:{color:primary,fontSize:12,fontWeight:'800'},
 button:{backgroundColor:primary,borderRadius:12,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:15,paddingVertical:10,marginVertical:8},buttonText:{color:'#fff',fontSize:15,fontWeight:'800',textAlign:'center'},outline:{backgroundColor:'#fff',borderWidth:1,borderColor:primary},outlineText:{color:primary},danger:{backgroundColor:'#B91C1C'},disabled:{opacity:.55},
 label:{fontSize:14,color:'#213047',fontWeight:'700',marginBottom:7},field:{marginBottom:15},inputRow:{minHeight:52,borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#fff',borderRadius:12,flexDirection:'row',alignItems:'center'},input:{flex:1,color:'#0F172A',fontSize:15,paddingHorizontal:13,paddingVertical:10,minHeight:48},multiline:{minHeight:95,textAlignVertical:'top'},eye:{minWidth:66,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:8},eyeText:{fontWeight:'700',color:primary,fontSize:12},
 authScroll:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:18},authBox:{width:'100%',padding:20,borderRadius:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#E2E8F0'},logo:{backgroundColor:'#DFEAFE',borderRadius:50,width:76,height:76,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:14},logoIcon:{fontSize:43,fontWeight:'bold',color:primary},appTitle:{fontSize:25,fontWeight:'900',color:'#14213A',textAlign:'center'},authSubtitle:{fontSize:14,color:'#64748B',textAlign:'center',marginBottom:22,marginTop:8,lineHeight:20},switch:{padding:13,minHeight:44,alignItems:'center'},link:{color:primary,fontWeight:'700'},authNote:{marginTop:16,fontSize:11,textAlign:'center',color:'#64748B',lineHeight:17},
 message:{padding:12,borderRadius:10,marginVertical:9,fontSize:13,lineHeight:20},error:{color:'#9F1239',backgroundColor:'#FFF1F2',borderWidth:1,borderColor:'#FECDD3'},success:{color:'#166534',backgroundColor:'#DCFCE7'},
 choiceRow:{flexDirection:'row',gap:8,marginBottom:10,alignItems:'center'},choice:{paddingHorizontal:14,paddingVertical:10,minHeight:44,minWidth:55,alignItems:'center',justifyContent:'center',borderRadius:25,borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#fff',marginRight:5,marginBottom:5},choiceOn:{backgroundColor:primary,borderColor:primary},choiceText:{color:'#334155',fontSize:13,fontWeight:'600'},choiceTextOn:{color:'#fff'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:3,marginBottom:15},
 listContent:{width:'100%',alignSelf:'center',paddingBottom:20,flexGrow:1},followUpSummary:{flexDirection:'row',backgroundColor:'#EFF6FF',borderColor:'#BFDBFE',borderWidth:1,borderRadius:14,paddingVertical:14,marginBottom:14},followUpSummaryCell:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:4},followUpCount:{fontSize:22,fontWeight:'900',color:primary},followUpSummaryLabel:{fontSize:10,color:'#475569',fontWeight:'700',textAlign:'center',marginTop:3},followUpCard:{backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#DCE5F0',padding:15,marginBottom:11},followUpCardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},followUpItemName:{flex:1,fontSize:16,fontWeight:'800',color:'#14213A'},followUpType:{fontSize:10,fontWeight:'800',color:primary,backgroundColor:'#EFF6FF',paddingHorizontal:8,paddingVertical:5,borderRadius:20},followUpStatus:{alignSelf:'flex-start',fontSize:11,fontWeight:'800',color:'#6D28D9',backgroundColor:'#F3E8FF',paddingHorizontal:9,paddingVertical:5,borderRadius:20,marginTop:8},followUpActionTitle:{fontSize:14,fontWeight:'800',color:'#1E293B',marginTop:10},followUpDescription:{fontSize:12,color:'#526580',lineHeight:18,marginTop:4},followUpMeta:{fontSize:11,color:'#64748B',marginTop:9},detailRow:{borderBottomWidth:1,borderColor:'#E2E8F0',paddingVertical:13,flexDirection:'row'},detailLabel:{width:'33%',fontSize:13,color:'#64748B',fontWeight:'700'},detailValue:{flex:1,fontSize:14,color:'#17283C',lineHeight:21},statusBox:{backgroundColor:'#fff',padding:20,borderRadius:14,borderWidth:1,borderColor:'#CBD5E1',marginBottom:20},statusBoxTitle:{fontSize:16,fontWeight:'800',color:primary},statusCurrent:{fontSize:18,fontWeight:'900',color:'#0F172A',marginTop:7},timelineRow:{flexDirection:'row',alignItems:'flex-start',gap:10,marginTop:13},timelineText:{flex:1},timelineTitle:{fontSize:13,fontWeight:'800',color:'#1E293B'},mutedSmall:{fontSize:11,color:'#64748B',lineHeight:16,marginTop:2},timelineDone:{fontSize:18,fontWeight:'900',color:'#15803D',width:22},timelineActive:{fontSize:18,fontWeight:'900',color:'#2563EB',width:22},timelinePending:{fontSize:18,fontWeight:'900',color:'#94A3B8',width:22},profile:{backgroundColor:'#fff',padding:20,borderRadius:14,borderWidth:1,borderColor:'#E2E8F0',marginBottom:24},
 photoPickerRow:{flexDirection:'row',gap:10,marginVertical:4},
 pickerBtn:{flex:1,minHeight:48,backgroundColor:'#fff',borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:10,paddingVertical:10,gap:8},
 pickerBtnIcon:{fontSize:18},
 pickerBtnText:{fontSize:13,fontWeight:'700',color:primary},
 previewContainer:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,overflow:'hidden',backgroundColor:'#fff',padding:10,marginVertical:4},
 previewImage:{width:'100%',height:200,borderRadius:10,backgroundColor:'#F1F5F9'},
 previewActions:{flexDirection:'row',gap:10,marginTop:10},
 previewBtn:{flex:1,minHeight:44,borderRadius:10,alignItems:'center',justifyContent:'center',paddingVertical:8,paddingHorizontal:10},
 previewBtnChange:{backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE'},
 previewBtnChangeText:{color:'#1D4ED8',fontWeight:'700',fontSize:13},
 previewBtnDelete:{backgroundColor:'#FEF2F2',borderWidth:1,borderColor:'#FECACA'},
 previewBtnDeleteText:{color:'#DC2626',fontWeight:'700',fontSize:13},
 detailImageContainer:{width:'100%',borderRadius:14,overflow:'hidden',marginBottom:14,borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#F1F5F9'},
 detailImage:{width:'100%',height:220,backgroundColor:'#F1F5F9'},
 offlineBanner:{backgroundColor:'#B91C1C',paddingVertical:9,paddingHorizontal:16,alignItems:'center',justifyContent:'center',width:'100%'},
 offlineBannerText:{color:'#FFFFFF',fontSize:13,fontWeight:'700',textAlign:'center'},
 stateContainer:{alignItems:'center',justifyContent:'center',paddingVertical:32,paddingHorizontal:20,backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:'#E2E8F0',marginVertical:14,alignSelf:'stretch'},
 stateIcon:{fontSize:44,marginBottom:10,textAlign:'center'},
 stateTitle:{fontSize:18,fontWeight:'800',color:'#14213A',marginBottom:6,textAlign:'center'},
 stateMessage:{fontSize:14,color:'#526580',textAlign:'center',lineHeight:21,marginBottom:16,maxWidth:420},
 stateText:{fontSize:14,color:'#526580',fontWeight:'600',marginTop:10,textAlign:'center'},
 retryBtn:{minWidth:140,marginTop:4},
 guardBanner:{flexDirection:'row',alignItems:'center',backgroundColor:'#ECFDF5',borderWidth:1,borderColor:'#A7F3D0',borderRadius:14,padding:13,marginVertical:10},
 guardBannerTitle:{fontSize:14,fontWeight:'800',color:'#065F46'},
 guardBannerDesc:{fontSize:11,color:'#047857',lineHeight:16,marginTop:2},
 guardBannerArrow:{fontSize:20,fontWeight:'800',color:'#059669',marginLeft:8},
 settingsBtn:{position:'absolute',top:16,right:16,zIndex:10,width:40,height:40,borderRadius:20,backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE',alignItems:'center',justifyContent:'center'},
 settingsBtnIcon:{fontSize:20},
 modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center',padding:20},
 modalCard:{width:'100%',backgroundColor:'#FFFFFF',borderRadius:18,padding:20,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.25,shadowRadius:4,elevation:5},
 modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
 modalTitle:{fontSize:17,fontWeight:'800',color:'#14213A'},
 modalCloseBtn:{padding:6},
 modalCloseText:{fontSize:18,color:'#64748B',fontWeight:'700'},
 modalDesc:{fontSize:13,color:'#475569',marginBottom:12,lineHeight:19},
 modalInput:{borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#F8FAFC',borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:'#0F172A',marginBottom:8},
 quickIpBtn:{backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:8,paddingVertical:7,paddingHorizontal:10,marginBottom:12,alignItems:'center'},
 quickIpText:{fontSize:12,fontWeight:'700',color:'#1D4ED8'},
 testStatusText:{fontSize:12,fontWeight:'700',padding:8,borderRadius:8,marginBottom:10,textAlign:'center'},
 testSuccess:{backgroundColor:'#DCFCE7',color:'#15803D'},
 testFail:{backgroundColor:'#FEE2E2',color:'#B91C1C'},
 modalActions:{flexDirection:'row',gap:10,marginTop:6},
 w9Section:{backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#E2E8F0',padding:14,marginVertical:10},
 w9SectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
 w9SectionTitle:{fontSize:16,fontWeight:'800',color:'#14213A'},
 w9ViewAll:{marginTop:10,alignItems:'center',paddingVertical:8},
 w9ViewAllText:{color:primary,fontWeight:'700',fontSize:13},
 submittingBox:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:12,padding:12,marginVertical:8},
 submittingText:{color:primary,fontSize:14,fontWeight:'700'},
});
