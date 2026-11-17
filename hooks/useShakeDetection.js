/** Week 7 Task 03: deteksi gerak dengan cooldown supaya getaran tidak berulang.
 * Diperkaya untuk Ide A: Mode Pengaman Meja Belajar (Anti-Theft Table Guard).
 */
import {useEffect,useRef,useState} from 'react';
import {Platform,Vibration} from 'react-native';
import {isShake} from '../utils/shakeMotion.mjs';

export const SHAKE_THRESHOLD_G = 0.85;
export const SHAKE_COOLDOWN_MS = 2000;

export default function useShakeDetection(sample,enabled){
 const [shaking,setShaking]=useState(false);
 const [count,setCount]=useState(0);
 const [lastAlertTime,setLastAlertTime]=useState(null);
 const [incidents,setIncidents]=useState([]);
 const previous=useRef(null);
 const lastTriggered=useRef(0);
 const timeout=useRef(null);

 useEffect(()=>{
  if (!enabled){
   previous.current=null;
   lastTriggered.current=0;
   setShaking(false);
   setCount(0);
   setLastAlertTime(null);
   setIncidents([]);
   if(timeout.current) clearTimeout(timeout.current);
  }
 },[enabled]);

 useEffect(()=>{
  if (!enabled || !sample) return;
  const now=sample.timestamp;
  if (isShake(previous.current,sample,SHAKE_THRESHOLD_G) && now-lastTriggered.current>=SHAKE_COOLDOWN_MS){
   lastTriggered.current=now;
   const timeString=new Date(now).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
   setLastAlertTime(timeString);
   setIncidents(prev=>[timeString,...prev.slice(0,4)]);
   setShaking(true);
   setCount(current=>current+1);
   // Feedback getaran haptik sebagai alarm fisik saat gerakan mencurigakan terdeteksi
   if (Platform.OS!=='web') Vibration.vibrate(300);
   if (timeout.current) clearTimeout(timeout.current);
   timeout.current=setTimeout(()=>setShaking(false),1600);
  }
  previous.current=sample;
 },[sample,enabled]);

 useEffect(()=>()=>{if(timeout.current) clearTimeout(timeout.current);},[]);
 return {shaking,count,threshold:SHAKE_THRESHOLD_G,lastAlertTime,incidents};
}
