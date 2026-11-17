/** Week 7 Alarm Deteksi Gerakan
 * Diterapkan untuk Ide A: Alarm Anti-Maling & Deteksi Sentuhan Meja.
 */
import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import useShakeDetection from '../../hooks/useShakeDetection';
import { theme } from '../../theme';

export default function SensorInteraction({sample,active,onReportLost}){
 const {shaking,count,threshold,lastAlertTime,incidents}=useShakeDetection(sample,active);

 return <View style={styles.panel}>
  <View style={styles.headerRow}>
   <Text style={styles.title}>Alarm Deteksi Gerakan</Text>
   <View style={[styles.badge,shaking&&styles.badgeAlert]}>
    <Text style={[styles.badgeText,shaking&&styles.badgeAlertText]}>
     {shaking?'🚨 ALARM':'Siaga Gerakan'}
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

  {/* Aksi Integrasi TemuBarang: Lapor Kehilangan Kilat jika barang digeser/hilang */}
  {onReportLost && (count > 0 || shaking) && (
   <View style={styles.emergencyCard}>
    <Text style={styles.emergencyTitle}>Barang Anda benar-benar hilang atau diambil?</Text>
    <Text style={styles.emergencyDesc}>Segera umumkan di TemuBarang agar mahasiswa lain dapat mengidentifikasi atau mengamankannya.</Text>
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
 panel:{backgroundColor:'#FFFFFF',borderColor:theme.colors.border,borderWidth:1,borderRadius:18,padding:16,gap:10,...theme.shadow.card},
 headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 title:{fontSize:14,fontWeight:'900',color:theme.colors.text,flex:1},
 badge:{backgroundColor:theme.colors.warningSoft,paddingHorizontal:9,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:'#F1E2C4'},
 badgeText:{fontSize:9,fontWeight:'900',color:theme.colors.warning},
 badgeAlert:{backgroundColor:'#C83E52',borderColor:'#B9384B'},
 badgeAlertText:{color:'#FFFFFF'},
 description:{fontSize:11,lineHeight:18,color:'#718096'},
 status:{padding:13,borderRadius:14,flexDirection:'row',alignItems:'center',gap:10},
 inactive:{backgroundColor:'#F5F7FA',borderWidth:1,borderColor:'#E6EBF1'},
 ready:{backgroundColor:theme.colors.successSoft,borderWidth:1,borderColor:'#D0EBDD'},
 alert:{backgroundColor:theme.colors.dangerSoft,borderWidth:1,borderColor:'#F2D2D9'},
 statusIcon:{fontSize:23},
 statusBody:{flex:1},
 statusText:{fontSize:13,fontWeight:'900'},
 inactiveText:{color:'#68778C'},
 readyText:{color:'#176B50'},
 alertText:{color:'#B9384B'},
 caption:{fontSize:10,lineHeight:16,color:'#738196',marginTop:3},
 statsRow:{flexDirection:'row',backgroundColor:'#F7F9FC',borderRadius:12,padding:12,gap:10,borderWidth:1,borderColor:'#E9EEF4'},
 statItem:{flex:1},
 statLabel:{fontSize:9,color:'#8290A3',fontWeight:'700'},
 statValue:{fontSize:13,fontWeight:'900',color:theme.colors.text,marginTop:4},
 incidentBox:{backgroundColor:theme.colors.warningSoft,borderColor:'#F0E0BE',borderWidth:1,borderRadius:11,padding:10},
 incidentTitle:{fontSize:10,fontWeight:'800',color:'#8B5B18',marginBottom:4},
 incidentList:{fontSize:10,color:'#9B6B2D',lineHeight:16},
 thresholdNote:{fontSize:10,lineHeight:16,color:'#8491A3'},
 emergencyCard:{backgroundColor:theme.colors.primarySoft,borderWidth:1,borderColor:'#D6E4F7',borderRadius:13,padding:12,gap:6,marginTop:3},
 emergencyTitle:{fontSize:12,fontWeight:'900',color:theme.colors.primaryDark},
 emergencyDesc:{fontSize:10,lineHeight:16,color:'#56749A'},
 emergencyBtn:{minHeight:46,backgroundColor:theme.colors.primary,borderRadius:12,paddingVertical:10,paddingHorizontal:12,alignItems:'center',justifyContent:'center',marginTop:4},
 emergencyBtnText:{color:'#FFFFFF',fontSize:11,fontWeight:'900'}
});
