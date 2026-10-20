/**
 * TemuKampus — project terpadu Mobile Programming Week 1–5.
 * Week 1: ide, masalah pengguna, Product Canvas dan rencana aplikasi.
 * Week 2: React Native UI, responsive layout dan accessibility.
 * Week 3: register/login, secure storage dan security validation.
 * Week 4: Barang DTO + REST API JSON + dynamic FlatList.
 * Week 5: server-issued JWT + Bearer token + protected endpoint + session/logout.
 */
import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
  ActivityIndicator,Alert,FlatList,Image,KeyboardAvoidingView,Platform,
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
import {categories} from './models/Barang';
import {API_BASE_URL,ApiError,registerUser,loginWithAPI,getProfile,logoutAPI,fetchBarang,createBarang,verifyBarang,markReturned,uploadPhoto,resolveImageUrl,refreshAccessToken} from './services/api';
import {clearSession,getToken,saveSession,savePreference,getPreference} from './storage/session';

const primary='#1565C0';
const blankForm={nama:'',kategori:'Elektronik',lokasi:'',deskripsi:'',status:'Hilang',image:'',verificationSecret:''};

function UIButton({title,onPress,secondary=false,disabled=false,danger=false,style,accessibilityLabel,accessibilityHint}){
 return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}
  accessibilityHint={accessibilityHint}
  accessibilityState={{disabled}} style={[styles.button,secondary&&styles.outline,danger&&styles.danger,disabled&&styles.disabled,style]}>
  <Text style={[styles.buttonText,secondary&&styles.outlineText]}>{title}</Text>
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
 const [isOnline,setIsOnline]=useState(true);
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('Semua');
 const [statusFilter,setStatusFilter]=useState('Semua');
 const [selected,setSelected]=useState(null);
 const [form,setForm]=useState(blankForm);
 const [selectedImage,setSelectedImage]=useState(null);
 const [selectedImageBase64,setSelectedImageBase64]=useState(null);
 const [claimAnswer,setClaimAnswer]=useState('');
 const [authForm,setAuthForm]=useState({name:'',email:'',password:'',confirm:''});
 const [compactMode,setCompactMode]=useState(false);

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
 },[loadingItems,refreshItems]);

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
 useEffect(()=>{if(authenticated)refreshItems();},[authenticated,refreshItems]);

 const changeAuth=(key,value)=>{setAuthForm(current=>({...current,[key]:value}));setError('');};
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
 const startReport=status=>{setForm({...blankForm,status});setSelectedImage(null);setSelectedImageBase64(null);navigate('report');};
 const changeReport=(key,value)=>setForm(previous=>({...previous,[key]:value}));
 const submitReport=async()=>{
  if(!form.nama.trim()||!form.lokasi.trim()||!form.deskripsi.trim()||form.verificationSecret.trim().length<4){
   setError('Isi nama, lokasi, ciri-ciri, dan ciri rahasia minimal 4 karakter.');
   return;
  }
  // Week 6 Task 03: Periksa koneksi internet sebelum mengirim laporan baru (cegah duplikasi dan kegagalan upload)
  try {
   const netState = await NetInfo.fetch();
   const online = Boolean(netState.isConnected && netState.isInternetReachable !== false);
   setIsOnline(online);
   if (!online) {
    setError('Tidak ada koneksi internet. Formulir dan foto Anda tetap tersimpan. Silakan periksa koneksi Anda dan coba kirim kembali.');
    return; // Formulir dan foto tetap tersimpan, tidak di-reset, dan tidak melakukan auto-resend
   }
  } catch {}

  setBusy(true);setError('');setMessage(selectedImage||selectedImageBase64?'Mengunggah foto barang...':'Menyimpan laporan...');
  try{
   let uploadedUrl='';
   if(selectedImage||selectedImageBase64){
    uploadedUrl=await guarded(()=>uploadPhoto(selectedImage,selectedImageBase64));
   }
   setMessage('Menyimpan laporan...');
   const payload={...form,image:uploadedUrl};
   const created=await guarded(()=>createBarang(payload));
   await refreshItems();setForm(blankForm);setSelectedImage(null);setSelectedImageBase64(null);setSelected(created);setScreen('detail');
   setMessage(uploadedUrl?'Laporan dan foto berhasil tersimpan pada server.':'Laporan tersimpan pada server.');
  }catch(e){
   if(e.status!==401){
    if(!isOnline || e.isNetworkError){
     setError('Gagal mengirim laporan karena gangguan jaringan atau server tidak terjangkau. Formulir dan foto Anda tetap tersimpan.');
    } else {
     setError(e.message||'Gagal mengirim laporan.');
    }
   }
  }finally{setBusy(false);}
 };
 const submitClaim=async()=>{
  if(!claimAnswer.trim()){setError('Isi ciri khusus barang untuk verifikasi.');return;}
  if(!isOnline){setError('Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   const result=await guarded(()=>verifyBarang(selected.id,claimAnswer));
   setSelected(result.item);setClaimAnswer('');setMessage(result.message);await refreshItems();setScreen('detail');
  }catch(e){if(e.status!==401)setError(e.message);}finally{setBusy(false);}
 };
 const completeReturn=async()=>{
  if(!isOnline){setError('Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.');return;}
  setBusy(true);setError('');
  try{
   const item=await guarded(()=>markReturned(selected.id));
   setSelected(item);setMessage('Status diubah menjadi Dikembalikan.');await refreshItems();
  }catch(e){if(e.status!==401)setError(e.message);}finally{setBusy(false);}
 };
 const filtered=useMemo(()=>items.filter(item=>{
  const text=search.trim().toLocaleLowerCase('id');
  const match=!text||[item.nama,item.kategori,item.lokasi,item.deskripsi].some(v=>v.toLocaleLowerCase('id').includes(text));
  return match&&(category==='Semua'||item.kategori===category)&&(statusFilter==='Semua'||item.status===statusFilter);
 }),[items,search,category,statusFilter]);
 const chooseCategory=cat=>{setCategory(cat);setStatusFilter('Semua');navigate('list');};
 const cover=(child)=> <View style={[styles.pageContent,{maxWidth:wide?860:600,paddingHorizontal:wide?30:18}]}>{child}</View>;

 if(booting)return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={primary}/><Text style={styles.muted}>Memeriksa sesi login...</Text></SafeAreaView>;
 if(!authenticated){
  const registering=screen==='register';
  return <SafeAreaView style={styles.page}><StatusBar barStyle="dark-content"/>
   <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
     <View style={[styles.authBox,{maxWidth:wide?520:460}]}>
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
  </SafeAreaView>;
 }
 const activeTab=['home','list','report','profile'].includes(screen)?screen:screen==='detail'||screen==='verify'?'list':'home';
 return <SafeAreaView style={styles.page}><StatusBar barStyle="dark-content"/>
  <Header userName={authUser?.name}/>
  {!isOnline && (
   <View style={styles.offlineBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
    <Text style={styles.offlineBannerText}>📡 Mode Offline — Tidak ada koneksi internet. Periksa koneksi Anda.</Text>
   </View>
  )}
  {screen==='list' ? <View style={styles.flex}>
    {cover(<>
     <Text style={styles.heading} accessibilityRole="header">Daftar Barang</Text>
     <SearchBar value={search} onChangeText={setSearch}/>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {['Semua','Hilang','Ditemukan','Dikembalikan'].map(s=><Choice key={s} label={s} selected={statusFilter===s} onPress={()=>setStatusFilter(s)}/>)}
     </ScrollView>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {['Semua',...categories].map(cat=><Choice key={cat} label={cat} selected={category===cat} onPress={()=>setCategory(cat)}/>)}
     </ScrollView>
    </>)}
    {loadingItems && items.length === 0 ? (
     cover(<LoadingStateView message="Memuat data barang..." />)
    ) : itemsError ? (
     cover(<ErrorStateView error={itemsErrorObj} isOffline={!isOnline} onRetry={handleRetry} retrying={loadingItems} />)
    ) : filtered.length === 0 ? (
     cover(
      search.trim() || category !== 'Semua' || statusFilter !== 'Semua' ? (
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
     </>}
     {screen==='report'&&<>
      <Text style={styles.heading} accessibilityRole="header">Lapor Barang</Text><Text style={styles.muted}>Isi informasi dengan jelas untuk membantu proses pencarian.</Text>
      <View style={styles.choiceRow}>{['Hilang','Ditemukan'].map(s=><Choice key={s} label={s} selected={form.status===s} onPress={()=>changeReport('status',s)}/>)}</View>
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
      <UIButton title={busy?'Mengirim...':'Kirim Laporan'} onPress={submitReport} disabled={busy}/>
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
      {[['Status',selected.status],['Kategori',selected.kategori],['Lokasi',selected.lokasi],['Tanggal',selected.tanggal],['Pelapor',selected.pelapor],['Ciri-ciri',selected.deskripsi],['Verifikasi',selected.verificationStatus]].map(([key,value])=><View key={key} style={styles.detailRow}><Text style={styles.detailLabel}>{key}</Text><Text style={styles.detailValue}>{value}</Text></View>)}
      <StatusMessage message={error} error/><StatusMessage message={message}/>
      <UIButton title="Lihat Status Barang" secondary onPress={()=>navigate('status')}/>
      {selected.status!=='Dikembalikan'&&<UIButton title="Verifikasi Pengambilan" onPress={()=>{setClaimAnswer('');navigate('verify');}}/>}
      {selected.ownerId===authUser.id&&selected.verificationStatus==='Terverifikasi'&&selected.status!=='Dikembalikan'&&<UIButton title="Tandai Sudah Dikembalikan" onPress={completeReturn} disabled={busy}/>}
     </>}
     {screen==='status'&&selected&&<>
      <UIButton title="‹ Kembali ke Detail" secondary onPress={()=>navigate('detail')}/>
      <Text style={styles.heading} accessibilityRole="header">Status Barang</Text><Text style={styles.detailName}>{selected.nama}</Text>
      <View style={styles.statusBox}><Text style={styles.statusBoxTitle}>Status laporan: {selected.status}</Text><Text style={styles.muted}>Status verifikasi: {selected.verificationStatus}</Text>
      <Text style={styles.hint}>Alur: Laporan dibuat → Barang dicari/ditemukan → Verifikasi → Dikembalikan.</Text></View>
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
 </SafeAreaView>;
}

const styles=StyleSheet.create({
 flex:{flex:1},page:{flex:1,backgroundColor:'#F8FAFC'},pageContent:{alignSelf:'center',width:'100%',paddingTop:18},center:{flex:1,alignItems:'center',justifyContent:'center',gap:16},muted:{fontSize:14,lineHeight:21,color:'#526580',marginVertical:8},hint:{fontSize:12,lineHeight:19,color:'#64748B',marginBottom:16},
 heading:{fontWeight:'800',fontSize:22,color:'#14213A',marginBottom:14},detailName:{fontWeight:'800',fontSize:19,color:'#15335A',marginVertical:10},
 button:{backgroundColor:primary,borderRadius:12,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:15,paddingVertical:10,marginVertical:8},buttonText:{color:'#fff',fontSize:15,fontWeight:'800',textAlign:'center'},outline:{backgroundColor:'#fff',borderWidth:1,borderColor:primary},outlineText:{color:primary},danger:{backgroundColor:'#B91C1C'},disabled:{opacity:.55},
 label:{fontSize:14,color:'#213047',fontWeight:'700',marginBottom:7},field:{marginBottom:15},inputRow:{minHeight:52,borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#fff',borderRadius:12,flexDirection:'row',alignItems:'center'},input:{flex:1,color:'#0F172A',fontSize:15,paddingHorizontal:13,paddingVertical:10,minHeight:48},multiline:{minHeight:95,textAlignVertical:'top'},eye:{minWidth:66,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:8},eyeText:{fontWeight:'700',color:primary,fontSize:12},
 authScroll:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:18},authBox:{width:'100%',padding:20,borderRadius:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#E2E8F0'},logo:{backgroundColor:'#DFEAFE',borderRadius:50,width:76,height:76,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:14},logoIcon:{fontSize:43,fontWeight:'bold',color:primary},appTitle:{fontSize:25,fontWeight:'900',color:'#14213A',textAlign:'center'},authSubtitle:{fontSize:14,color:'#64748B',textAlign:'center',marginBottom:22,marginTop:8,lineHeight:20},switch:{padding:13,minHeight:44,alignItems:'center'},link:{color:primary,fontWeight:'700'},authNote:{marginTop:16,fontSize:11,textAlign:'center',color:'#64748B',lineHeight:17},
 message:{padding:12,borderRadius:10,marginVertical:9,fontSize:13,lineHeight:20},error:{color:'#9F1239',backgroundColor:'#FFF1F2',borderWidth:1,borderColor:'#FECDD3'},success:{color:'#166534',backgroundColor:'#DCFCE7'},
 choiceRow:{flexDirection:'row',gap:8,marginBottom:10,alignItems:'center'},choice:{paddingHorizontal:14,paddingVertical:10,minHeight:44,minWidth:55,alignItems:'center',justifyContent:'center',borderRadius:25,borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#fff',marginRight:5,marginBottom:5},choiceOn:{backgroundColor:primary,borderColor:primary},choiceText:{color:'#334155',fontSize:13,fontWeight:'600'},choiceTextOn:{color:'#fff'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:3,marginBottom:15},
 listContent:{width:'100%',alignSelf:'center',paddingBottom:20,flexGrow:1},detailRow:{borderBottomWidth:1,borderColor:'#E2E8F0',paddingVertical:13,flexDirection:'row'},detailLabel:{width:'33%',fontSize:13,color:'#64748B',fontWeight:'700'},detailValue:{flex:1,fontSize:14,color:'#17283C',lineHeight:21},statusBox:{backgroundColor:'#fff',padding:20,borderRadius:14,borderWidth:1,borderColor:'#CBD5E1',marginBottom:20},statusBoxTitle:{fontSize:16,fontWeight:'800',color:primary},profile:{backgroundColor:'#fff',padding:20,borderRadius:14,borderWidth:1,borderColor:'#E2E8F0',marginBottom:24},
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
 retryBtn:{minWidth:140,marginTop:4}
});
