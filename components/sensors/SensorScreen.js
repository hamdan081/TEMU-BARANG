/** Week 7 Task 02: Status & Kontrol Pengaman Meja dengan Visualisasi Real-Time
 * Menghubungkan hook accelerometer ke SensorDashboard untuk memantau stabilitas meja.
 */
import React from 'react';
import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import useAccelerometer from '../../hooks/useAccelerometer';
import SensorDashboard from './SensorDashboard';

export default function SensorScreen({onReportLost}){
 const {active,permission,error,sample,start,stop}=useAccelerometer();

 return <View style={styles.container}>
  <View style={styles.bannerHeader}>
   <Text style={styles.badge}>🛡️ Mode Keamanan Kampus</Text>
   <Text style={styles.title} accessibilityRole="header">Pengaman Meja & Sensor Gerak</Text>
   <Text style={styles.description}>
    Cegah kehilangan barang saat ditinggal sebentar di meja perpustakaan atau kantin. Letakkan ponsel di atas laptop/tas Anda. Accelerometer memantau stabilitas meja secara real-time dan memicu alarm getar jika barang digeser atau diangkat orang lain.
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

  {/* Dashboard visualisasi real-time stabilitas meja (Task 02) */}
  <SensorDashboard sample={sample} active={active}/>
 </View>;
}

const styles=StyleSheet.create({
 container:{paddingBottom:24,gap:14},
 bannerHeader:{backgroundColor:'#F0FDF4',borderColor:'#BBF7D0',borderWidth:1,borderRadius:16,padding:16,gap:6},
 badge:{alignSelf:'flex-start',backgroundColor:'#DCFCE7',color:'#15803D',fontWeight:'800',fontSize:12,paddingHorizontal:9,paddingVertical:3,borderRadius:12},
 title:{fontSize:22,fontWeight:'900',color:'#14532D'},
 description:{color:'#334155',fontSize:13,lineHeight:20},
 panel:{backgroundColor:'#FFF',borderColor:'#DCE6F2',borderWidth:1,borderRadius:16,padding:17,gap:10},
 panelHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 subtitle:{fontSize:16,fontWeight:'800',color:'#15335A'},
 taskBadge:{fontSize:11,fontWeight:'700',color:'#2563EB',backgroundColor:'#EFF6FF',paddingHorizontal:8,paddingVertical:2,borderRadius:6},
 stateRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6},
 state:{fontSize:14,fontWeight:'800'},
 stateActive:{color:'#166534'},
 stateInactive:{color:'#64748B'},
 note:{fontSize:12,lineHeight:19,color:'#64748B'},
 action:{backgroundColor:'#1565C0',minHeight:48,padding:12,borderRadius:12,alignItems:'center',justifyContent:'center'},
 actionStop:{backgroundColor:'#B91C1C'},
 actionText:{color:'white',fontWeight:'800',fontSize:15},
 error:{color:'#9F1239',backgroundColor:'#FFF1F2',padding:11,borderRadius:10,lineHeight:20},
 tipBox:{backgroundColor:'#F8FAFC',borderRadius:10,padding:10,borderWidth:1,borderColor:'#E2E8F0'},
 tipTitle:{fontSize:12,fontWeight:'800',color:'#1E293B',marginBottom:3},
 tipText:{fontSize:11,lineHeight:18,color:'#475569'}
});
