/** Week 7 Task 01: Status & Kontrol Pengaman Meja
 * Membaca nilai accelerometer X, Y, Z secara real-time dan terhubung ke Expo Sensors.
 */
import React from 'react';
import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import useAccelerometer, {GRAVITY_MS2} from '../../hooks/useAccelerometer';
import SensorDashboard from './SensorDashboard';
import SensorInteraction from './SensorInteraction';
import { theme } from '../../theme';

const toMS2=val=>val!==undefined&&val!==null?(val*GRAVITY_MS2).toFixed(2):'—';

export default function SensorScreen({onReportLost}){
 const {active,permission,error,sample,start,stop}=useAccelerometer();

 return <View style={styles.container}>
  <View style={styles.bannerHeader}>
   <Text style={styles.badge}>🛡️ Mode Keamanan Kampus</Text>
   <Text style={styles.title} accessibilityRole="header">Pengaman Meja & Sensor Gerak</Text>
   <Text style={styles.description}>
    Bantu memantau perubahan gerakan saat barang diletakkan di meja perpustakaan atau kantin. Accelerometer membaca gerakan perangkat dan memberi peringatan getar ketika perubahan percepatan melewati ambang. Sensor tidak dapat memastikan siapa yang menggerakkan barang.
   </Text>
  </View>

  <View style={styles.panel}>
   <View style={styles.panelHeader}>
    <Text style={styles.subtitle}>Status & Kontrol Pengaman</Text>
    <Text style={styles.taskBadge}>Sensor Siaga</Text>
   </View>
   
   <View style={styles.stateRow}>
    <Text style={[styles.state,active?styles.stateActive:styles.stateInactive]}>
     {active?'● Pengaman Meja Aktif (Mengawasi)':'○ Pengaman Meja Nonaktif'}
    </Text>
    <Text style={styles.note}>Izin: {permission}</Text>
   </View>

   <Pressable
    accessibilityRole="button"
    accessibilityLabel={active?'Hentikan pengaman meja':'Aktifkan pengaman meja'}
    style={[styles.action,active&&styles.actionStop]}
    onPress={active?stop:start}>
    <Text style={styles.actionText}>
     {active?'⏹️ Matikan Pengaman Meja':'🛡️ Aktifkan Pengaman Meja'}
    </Text>
   </Pressable>

   {!!error&&<Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}

   {/* Pembacaan accelerometer Task 01 */}
   <View style={styles.readingsRow}>
    <View style={styles.readingCard}>
     <Text style={styles.readingLabel}>X</Text>
     <Text style={styles.readingVal}>{sample?toMS2(sample.x):'—'}</Text>
     <Text style={styles.readingUnit}>m/s²</Text>
    </View>
    <View style={styles.readingCard}>
     <Text style={styles.readingLabel}>Y</Text>
     <Text style={styles.readingVal}>{sample?toMS2(sample.y):'—'}</Text>
     <Text style={styles.readingUnit}>m/s²</Text>
    </View>
    <View style={styles.readingCard}>
     <Text style={styles.readingLabel}>Z</Text>
     <Text style={styles.readingVal}>{sample?toMS2(sample.z):'—'}</Text>
     <Text style={styles.readingUnit}>m/s²</Text>
    </View>
   </View>
   
   <View style={styles.tipBox}>
    <Text style={styles.tipTitle}>💡 Tips Penggunaan di Kampus:</Text>
    <Text style={styles.tipText}>
     1. Taruh ponsel di atas laptop/tas di meja.{'\n'}
     2. Tekan tombol aktifkan di atas.{'\n'}
     3. Tinggalkan meja dengan tenang; sensor akan membaca percepatan secara real-time.
    </Text>
   </View>

   {Platform.OS==='web'&&<Text style={styles.note}>Browser dapat membatasi sensor atau membutuhkan HTTPS dan izin gerakan.</Text>}
  </View>

  <SensorDashboard sample={sample} active={active}/>
  <SensorInteraction sample={sample} active={active} onReportLost={onReportLost}/>
 </View>;
}

const styles=StyleSheet.create({
 container:{paddingBottom:26,gap:12},
 bannerHeader:{backgroundColor:'#EAF4FF',borderColor:'#D7E7F9',borderWidth:1,borderRadius:19,padding:17,gap:7},
 badge:{alignSelf:'flex-start',backgroundColor:'#FFFFFF',color:theme.colors.primary,fontWeight:'900',fontSize:10,paddingHorizontal:10,paddingVertical:6,borderRadius:9},
 title:{fontSize:21,fontWeight:'900',color:'#1B4779',letterSpacing:-0.45},
 description:{color:'#536B86',fontSize:11,lineHeight:18},
 panel:{backgroundColor:'#FFFFFF',borderColor:theme.colors.border,borderWidth:1,borderRadius:18,padding:16,gap:10,...theme.shadow.card},
 panelHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 subtitle:{fontSize:14,fontWeight:'900',color:theme.colors.text},
 taskBadge:{fontSize:10,fontWeight:'800',color:theme.colors.primary,backgroundColor:theme.colors.primarySoft,paddingHorizontal:9,paddingVertical:6,borderRadius:8},
 stateRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6},
 state:{fontSize:11,fontWeight:'900'},
 stateActive:{color:theme.colors.success},
 stateInactive:{color:'#8794A6'},
 note:{fontSize:10,lineHeight:17,color:'#7A889B'},
 action:{backgroundColor:theme.colors.primary,minHeight:49,padding:12,borderRadius:13,alignItems:'center',justifyContent:'center'},
 actionStop:{backgroundColor:theme.colors.danger},
 actionText:{color:'white',fontWeight:'900',fontSize:13},
 error:{color:theme.colors.danger,backgroundColor:theme.colors.dangerSoft,padding:11,borderRadius:11,lineHeight:18,fontSize:11},
 readingsRow:{flexDirection:'row',gap:8,marginTop:3},
 readingCard:{flex:1,backgroundColor:'#F7F9FC',borderRadius:13,borderWidth:1,borderColor:'#E8EDF4',alignItems:'center',paddingVertical:11,paddingHorizontal:4},
 readingLabel:{fontSize:11,fontWeight:'900',color:'#8290A3'},
 readingVal:{fontSize:17,fontWeight:'900',color:theme.colors.text,marginVertical:3},
 readingUnit:{fontSize:9,color:'#9AA6B5'},
 tipBox:{backgroundColor:'#F7F9FC',borderRadius:13,padding:12,borderWidth:1,borderColor:'#E8EDF4'},
 tipTitle:{fontSize:11,fontWeight:'900',color:'#34445A',marginBottom:4},
 tipText:{fontSize:10,lineHeight:17,color:'#64748B'}
});
