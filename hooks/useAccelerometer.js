/** Week 7 Task 01: pembacaan accelerometer melalui Expo Sensor API. */
import {useCallback,useEffect,useState} from 'react';
import {Accelerometer} from 'expo-sensors';

// Expo mengembalikan percepatan dalam satuan g (1 g ~= 9,80665 m/s²).
export const GRAVITY_MS2 = 9.80665;
export const SENSOR_INTERVAL_MS = 150;

export default function useAccelerometer(){
 const [active,setActive] = useState(false);
 const [permission,setPermission] = useState('belum diminta');
 const [error,setError] = useState('');
 const [sample,setSample] = useState(null);

 // Dipanggil dari tombol agar permintaan izin bisa dilakukan atas tindakan pengguna.
 const start=useCallback(async()=>{
  setError('');
  try {
   const response = await Accelerometer.requestPermissionsAsync();
   if (!response.granted) {
    setPermission('ditolak');
    setActive(false);
    setError('Izin sensor belum diberikan. Periksa izin gerakan di pengaturan perangkat, lalu coba lagi.');
    return;
   }
   setPermission('diizinkan');
   const available = await Accelerometer.isAvailableAsync();
   if (!available) {
    setActive(false);
    setError('Accelerometer tidak tersedia pada perangkat atau browser ini. Gunakan ponsel dengan sensor gerak.');
    return;
   }
   setSample(null);
   setActive(true);
  } catch (e) {
   setActive(false);
   setError(`Tidak bisa mengakses accelerometer: ${e?.message || 'kesalahan perangkat'}`);
  }
 },[]);

 const stop=useCallback(()=>{
  setActive(false);
  setSample(null);
 },[]);

 useEffect(()=>{
  if (!active) return undefined;
  let subscription;
  try {
   Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
   subscription=Accelerometer.addListener(({x,y,z})=>{
    if (![x,y,z].every(Number.isFinite)) return;
    const reading={x,y,z,timestamp:Date.now()};
    setSample(reading);
    // Task 01: data X/Y/Z harus juga muncul pada console saat aplikasi dijalankan.
    console.log(`[Week 7 / Accelerometer] X=${(x*GRAVITY_MS2).toFixed(2)} Y=${(y*GRAVITY_MS2).toFixed(2)} Z=${(z*GRAVITY_MS2).toFixed(2)} m/s²`);
   });
  } catch (e) {
   setActive(false);
   setError(`Listener sensor gagal dijalankan: ${e?.message || 'kesalahan perangkat'}`);
  }
  return ()=>subscription?.remove();
 },[active]);

 return {active,permission,error,sample,start,stop};
}
