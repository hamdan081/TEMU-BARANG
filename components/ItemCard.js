import React, {useState} from 'react';
import {View,Text,Image,Pressable,StyleSheet} from 'react-native';
import {resolveImageUrl} from '../services/api';

const statusPalette={
 'Belum Ditemukan':{bg:'#FEF3C7',fg:'#92400E'},
 'Menunggu Pemilik':{bg:'#DBEAFE',fg:'#1D4ED8'},
 'Menunggu Pengambilan':{bg:'#EDE9FE',fg:'#6D28D9'},
 'Selesai Dikembalikan':{bg:'#DCFCE7',fg:'#166534'},
};
const typePalette={Hilang:{bg:'#FEE2E2',fg:'#9F1239'},Ditemukan:{bg:'#DCFCE7',fg:'#166534'}};

export default function ItemCard({item,onPress,compact=false}){
 const colors=statusPalette[item.status]||statusPalette['Belum Ditemukan'];
 const typeColors=typePalette[item.jenisLaporan]||typePalette.Hilang;
 const [imgError,setImgError]=useState(false);
 const resolvedUri=resolveImageUrl(item.image);
 const showImage=Boolean(resolvedUri&&!imgError&&(resolvedUri.startsWith('http://')||resolvedUri.startsWith('https://')||resolvedUri.startsWith('file://')));
 return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.nama}, jenis laporan ${item.jenisLaporan}, status penanganan ${item.status}, lokasi ${item.lokasi}`} accessibilityHint="Lihat informasi detail dan perkembangan penanganan barang" style={styles.card}>
  {showImage?<Image source={{uri:resolvedUri}} style={styles.image} accessibilityLabel={`Foto ${item.nama}`} onError={()=>setImgError(true)}/>:
  <View style={styles.imagePlaceholder}><Text style={styles.imageEmoji} importantForAccessibility="no">📦</Text></View>}
  <View style={styles.content}>
   <Text style={styles.name} numberOfLines={compact?1:2}>{item.nama}</Text>
   <Text style={styles.desc} numberOfLines={1}>📍 {item.lokasi}</Text>
   {!compact&&<Text style={styles.desc}>{item.kategori} • {item.tanggal}</Text>}
   <View style={styles.badgeRow}>
    <View style={[styles.badge,{backgroundColor:typeColors.bg}]}><Text style={{color:typeColors.fg,fontWeight:'700',fontSize:11}}>Barang {item.jenisLaporan}</Text></View>
    <View style={[styles.badge,{backgroundColor:colors.bg}]}><Text style={{color:colors.fg,fontWeight:'700',fontSize:11}}>{item.status}</Text></View>
   </View>
  </View><Text style={styles.arrow} importantForAccessibility="no">›</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 card:{backgroundColor:'#fff',borderRadius:14,borderColor:'#DFE6EF',borderWidth:1,padding:12,marginBottom:10,flexDirection:'row',alignItems:'center',minHeight:100},
 image:{width:72,height:72,borderRadius:10,marginRight:13},imagePlaceholder:{width:72,height:72,borderRadius:10,backgroundColor:'#EAF3FF',alignItems:'center',justifyContent:'center',marginRight:13},imageEmoji:{fontSize:30},
 content:{flex:1,minWidth:0},name:{fontSize:16,color:'#14213A',fontWeight:'700',marginBottom:4},desc:{fontSize:12,color:'#54657C',marginBottom:4},badgeRow:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:2},badge:{alignSelf:'flex-start',paddingVertical:4,paddingHorizontal:8,borderRadius:30},arrow:{fontSize:25,color:'#687991',marginLeft:5}
});
