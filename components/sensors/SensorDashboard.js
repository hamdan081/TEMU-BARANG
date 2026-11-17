/** Week 7 Data Real-time
 * Dikontekstualisasikan untuk Ide A: Monitor Stabilitas Meja Belajar Kampus.
 */
import React,{useEffect,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GRAVITY_MS2} from '../../hooks/useAccelerometer';
import { theme } from '../../theme';

const AXES=[
 {key:'x',label:'X (Kiri-Kanan)',color:'#DC2626',background:'#FEF2F2'},
 {key:'y',label:'Y (Maju-Mundur)',color:'#15803D',background:'#F0FDF4'},
 {key:'z',label:'Z (Gravitasi Vertikal)',color:'#2563EB',background:'#EFF6FF'}
];
const MAX_POINTS=24;
const toMS2=value=>(value*GRAVITY_MS2).toFixed(2);

export default function SensorDashboard({sample,active}){
 const [history,setHistory]=useState([]);
 useEffect(()=>{
  if (!active) {
   setHistory([]);
   return;
  }
  if (sample) setHistory(previous=>[...previous.slice(-(MAX_POINTS-1)),sample]);
 },[sample,active]);

 return <View style={styles.panel}>
  <View style={styles.headerRow}>
   <Text style={styles.subtitle}>Pemantau Stabilitas Meja (Real-time)</Text>
   <View style={styles.badge}>
    <Text style={styles.badgeText}>Stabilitas Meja</Text>
   </View>
  </View>
  <Text style={styles.hint}>
   Nilai percepatan sumbu X, Y, Z (m/s²). Saat ponsel diletakkan diam di meja, nilai sumbu vertikal stabil di ~9.8 m/s² (gaya gravitasi bumi).
  </Text>
  
  <View style={styles.cards}>
   {AXES.map(axis=><View key={axis.key} style={[styles.card,{backgroundColor:axis.background}]}>
    <Text style={[styles.axis,{color:axis.color}]}>{axis.label.split(' ')[0]}</Text>
    <Text style={[styles.axisDesc,{color:axis.color}]}>{axis.label.split(' ').slice(1).join(' ')}</Text>
    <Text accessibilityLabel={`Sumbu ${axis.label}: ${sample?toMS2(sample[axis.key]):'belum ada data'} meter per detik kuadrat`}
     style={[styles.reading,{color:axis.color}]} adjustsFontSizeToFit numberOfLines={1}>{sample?toMS2(sample[axis.key]):'—'}</Text>
    <Text style={[styles.unit,{color:axis.color}]}>m/s²</Text>
   </View>)}
  </View>

  <Text style={styles.chartTitle}>Riwayat 24 Sampel Terakhir</Text>
  <Text style={styles.hint}>
   Titik memperlihatkan posisi nilai tiap sumbu dalam rentang ±20 m/s². Garis datar = meja tenang; garis melonjak = meja tersenggol/digeser.
  </Text>

  <View style={styles.chart} accessibilityLabel="Grafik titik riwayat accelerometer X merah, Y hijau, Z biru">
   <View style={styles.axisLine}/>
   {history.length===0 ?
    <Text style={styles.placeholder}>Aktifkan Pengaman Meja untuk mulai membaca stabilitas.</Text>
    :history.map((point,i)=><View key={`${point.timestamp}-${i}`} style={styles.chartColumn}>
     {AXES.map(axis=>{
      const ms2=point[axis.key]*GRAVITY_MS2;
      const percent=Math.max(5,Math.min(95,50+(ms2/20)*45));
      return <View key={axis.key} style={[styles.dot,{bottom:`${percent}%`,backgroundColor:axis.color}]}/>;
     })}
    </View>)}
  </View>

  <View style={styles.legend}>{AXES.map(axis=><View key={axis.key} style={styles.legendItem}>
   <View style={[styles.legendDot,{backgroundColor:axis.color}]}/>
   <Text style={styles.legendText}>{axis.label.split(' ')[0]}</Text>
  </View>)}</View>

  <Text style={styles.hint}>Data dibaca langsung dari chip accelerometer perangkat setiap 200 ms (bukan simulasi mock atau REST API).</Text>
 </View>;
}

const styles=StyleSheet.create({
 panel:{backgroundColor:'#FFFFFF',borderColor:theme.colors.border,borderWidth:1,borderRadius:18,padding:16,gap:9,...theme.shadow.card},
 headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 subtitle:{fontSize:14,fontWeight:'900',color:theme.colors.text,flex:1},
 badge:{backgroundColor:theme.colors.primarySoft,paddingHorizontal:9,paddingVertical:6,borderRadius:8},
 badgeText:{fontSize:9,fontWeight:'800',color:theme.colors.primary},
 hint:{fontSize:10,lineHeight:17,color:'#7B899B'},
 cards:{flexDirection:'row',gap:8,marginTop:3},
 card:{flex:1,alignItems:'center',borderRadius:13,paddingVertical:12,paddingHorizontal:4,minWidth:0},
 axis:{fontSize:15,fontWeight:'900'},
 axisDesc:{fontSize:8,fontWeight:'700',opacity:0.85,marginBottom:2},
 reading:{fontSize:20,fontWeight:'900',marginTop:4},
 unit:{fontSize:9,fontWeight:'700',marginTop:2},
 chartTitle:{marginTop:9,fontSize:12,fontWeight:'900',color:theme.colors.text},
 chart:{height:128,backgroundColor:'#F7F9FC',borderRadius:13,borderWidth:1,borderColor:'#E8EDF4',flexDirection:'row',alignItems:'stretch',paddingVertical:10,paddingHorizontal:8,overflow:'hidden'},
 axisLine:{position:'absolute',left:0,right:0,top:'50%',height:1,backgroundColor:'#D8E0EA'},
 chartColumn:{flex:1,position:'relative',height:'100%'},
 dot:{width:5,height:5,borderRadius:3,position:'absolute',alignSelf:'center'},
 placeholder:{color:'#98A4B3',textAlign:'center',alignSelf:'center',fontSize:10,lineHeight:17,flex:1},
 legend:{flexDirection:'row',gap:14,justifyContent:'center'},
 legendItem:{flexDirection:'row',alignItems:'center',gap:5},
 legendDot:{width:8,height:8,borderRadius:5},
 legendText:{color:'#64748B',fontWeight:'800',fontSize:10}
});
