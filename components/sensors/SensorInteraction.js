/** Week 7 Alarm Deteksi Gerakan
 * Diterapkan untuk Ide A: Alarm Anti-Maling & Deteksi Sentuhan Meja.
 */
import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import useShakeDetection from '../../hooks/useShakeDetection';

export default function SensorInteraction({sample,active,onReportLost}){
 const {shaking,count,threshold,lastAlertTime,incidents}=useShakeDetection(sample,active);

 return <View style={styles.panel}>
  <View style={styles.headerRow}>
   <Text style={styles.title}>Alarm Deteksi Gerakan</Text>
   <View style={[styles.badge,shaking&&styles.badgeAlert]}>
    <Text style={[styles.badgeText,shaking&&styles.badgeAlertText]}>
     {shaking?'🚨 ALARM':'Anti-Maling'}
    </Text>
   </View>
  </View>
  
  <Text style={styles.description}>
   Goyangkan atau geser ponsel untuk menguji alarm deteksi gerakan. Saat terjadi gerakan mendadak, ponsel bergetar dan status peringatan aktif.
  </Text>

  <View accessibilityLiveRegion="polite" style={[styles.status,!active?styles.inactive:shaking?styles.alert:styles.ready]}>
   <Text style={styles.statusIcon}>{!active?'💤':shaking?'🚨':'🛡️'}</Text>
   <View style={styles.statusBody}>
    <Text style={[styles.statusText,!active?styles.inactiveText:shaking?styles.alertText:styles.readyText]}>
     {!active
      ?'Sensor belum aktif'
      :shaking
      ?'Goyang Terdeteksi! (Peringatan Gerakan)'
      :'Siap mendeteksi gerakan (Meja Aman)'}
    </Text>
    <Text style={styles.caption}>
     {!active
      ?'Tekan tombol Mulai / Aktifkan Pengaman Meja terlebih dahulu'
      :shaking
      ?'Peringatan: ponsel/barang digerakkan! Feedback getaran haptik 300 ms aktif.'
      :'Permukaan stabil. Ponsel memantau jika ada yang mengangkat atau menggeser barang.'}
    </Text>
   </View>
  </View>

  <View style={styles.statsRow}>
   <View style={styles.statItem}>
    <Text style={styles.statLabel}>Jumlah Gerakan Terdeteksi</Text>
    <Text style={styles.statValue}>{count} kali</Text>
   </View>
   <View style={styles.statItem}>
    <Text style={styles.statLabel}>Waktu Gerakan Terakhir</Text>
    <Text style={styles.statValue}>{lastAlertTime || '—'}</Text>
   </View>
  </View>

  {incidents && incidents.length > 0 && (
   <View style={styles.incidentBox}>
    <Text style={styles.incidentTitle}>📋 Catatan Waktu Insiden Gerakan:</Text>
    <Text style={styles.incidentList}>{incidents.map((t,idx)=>`#${count - idx}: ${t}`).join('   •   ')}</Text>
   </View>
  )}

  <Text style={styles.thresholdNote}>
   Ambang deteksi: perubahan percepatan ≥ {threshold.toFixed(2)} g antar-pembacaan, dengan jeda 2 detik untuk mencegah getaran berulang.
  </Text>

  {/* Aksi Integrasi TemuKampus: Lapor Kehilangan Kilat jika barang digeser/hilang */}
  {onReportLost && (count > 0 || shaking) && (
   <View style={styles.emergencyCard}>
    <Text style={styles.emergencyTitle}>Barang Anda benar-benar hilang atau diambil?</Text>
    <Text style={styles.emergencyDesc}>Segera umumkan di TemuKampus agar mahasiswa lain dapat mengidentifikasi atau mengamankannya.</Text>
    <Pressable
     onPress={onReportLost}
     accessibilityRole="button"
     accessibilityLabel="Buat Laporan Kehilangan Sekarang"
     style={styles.emergencyBtn}>
     <Text style={styles.emergencyBtnText}>📢 Buat Laporan Kehilangan Sekarang</Text>
    </Pressable>
   </View>
  )}
 </View>;
}

const styles=StyleSheet.create({
 panel:{backgroundColor:'#fff',borderColor:'#DCE6F2',borderWidth:1,borderRadius:16,padding:17,gap:11},
 headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 title:{fontSize:16,fontWeight:'800',color:'#15335A'},
 badge:{backgroundColor:'#FEF2F2',paddingHorizontal:8,paddingVertical:3,borderRadius:6,borderWidth:1,borderColor:'#FECACA'},
 badgeText:{fontSize:11,fontWeight:'700',color:'#B91C1C'},
 badgeAlert:{backgroundColor:'#DC2626',borderColor:'#991B1B'},
 badgeAlertText:{color:'#FFFFFF'},
 description:{fontSize:12,lineHeight:19,color:'#64748B'},
 status:{padding:14,borderRadius:14,flexDirection:'row',alignItems:'center',gap:11},
 inactive:{backgroundColor:'#F1F5F9',borderWidth:1,borderColor:'#E2E8F0'},
 ready:{backgroundColor:'#ECFDF5',borderWidth:1,borderColor:'#A7F3D0'},
 alert:{backgroundColor:'#FFF1F2',borderWidth:2,borderColor:'#E11D48'},
 statusIcon:{fontSize:26},
 statusBody:{flex:1},
 statusText:{fontSize:15,fontWeight:'800'},
 inactiveText:{color:'#64748B'},
 readyText:{color:'#166534'},
 alertText:{color:'#BE123C'},
 caption:{fontSize:11,lineHeight:17,color:'#64748B',marginTop:3},
 statsRow:{flexDirection:'row',backgroundColor:'#F8FAFC',borderRadius:10,padding:10,gap:10},
 statItem:{flex:1},
 statLabel:{fontSize:11,color:'#64748B',fontWeight:'600'},
 statValue:{fontSize:14,fontWeight:'800',color:'#1E293B',marginTop:2},
 incidentBox:{backgroundColor:'#FFFBEB',borderColor:'#FDE68A',borderWidth:1,borderRadius:8,padding:9},
 incidentTitle:{fontSize:11,fontWeight:'700',color:'#92400E',marginBottom:3},
 incidentList:{fontSize:11,color:'#B45309',lineHeight:16},
 thresholdNote:{fontSize:11,lineHeight:17,color:'#64748B'},
 emergencyCard:{backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:12,padding:12,gap:6,marginTop:4},
 emergencyTitle:{fontSize:13,fontWeight:'800',color:'#1E40AF'},
 emergencyDesc:{fontSize:11,lineHeight:16,color:'#3B82F6'},
 emergencyBtn:{backgroundColor:'#1565C0',borderRadius:8,paddingVertical:9,paddingHorizontal:12,alignItems:'center',marginTop:4},
 emergencyBtnText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'}
});
