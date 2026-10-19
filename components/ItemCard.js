import React, {useState} from 'react';
import {View,Text,Image,Pressable,StyleSheet} from 'react-native';
import {resolveImageUrl} from '../services/api';
const palette={Hilang:{bg:'#FEE2E2',fg:'#9F1239'},Ditemukan:{bg:'#DCFCE7',fg:'#166534'},Dikembalikan:{bg:'#E0E7FF',fg:'#3730A3'}};
export default function ItemCard({item,onPress,compact=false}){
 const colors=palette[item.status]||palette.Ditemukan;
 const [imgError,setImgError]=useState(false);
 const resolvedUri=resolveImageUrl(item.image);
 const showImage=Boolean(resolvedUri&&!imgError&&(resolvedUri.startsWith('http://')||resolvedUri.startsWith('https://')||resolvedUri.startsWith('file://')));
 return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.nama}, status ${item.status}, lokasi ${item.lokasi}`} accessibilityHint="Lihat informasi detail dan status barang" style={styles.card}>
  {showImage?<Image source={{uri:resolvedUri}} style={styles.image} accessibilityLabel={`Foto ${item.nama}`} onError={()=>setImgError(true)}/>:
  <View style={styles.imagePlaceholder}><Text style={styles.imageEmoji} importantForAccessibility="no">📦</Text></View>}
  <View style={styles.content}>
   <Text style={styles.name} numberOfLines={compact?1:2}>{item.nama}</Text>
   <Text style={styles.desc} numberOfLines={1}>📍 {item.lokasi}</Text>
   {!compact&&<Text style={styles.desc}>{item.kategori} • {item.tanggal}</Text>}
   <View style={[styles.badge,{backgroundColor:colors.bg}]}><Text style={{color:colors.fg,fontWeight:'700',fontSize:12}}>{item.status}</Text></View>
  </View><Text style={styles.arrow} importantForAccessibility="no">›</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 card:{backgroundColor:'#fff',borderRadius:14,borderColor:'#DFE6EF',borderWidth:1,padding:12,marginBottom:10,flexDirection:'row',alignItems:'center',minHeight:100},
 image:{width:72,height:72,borderRadius:10,marginRight:13},imagePlaceholder:{width:72,height:72,borderRadius:10,backgroundColor:'#EAF3FF',alignItems:'center',justifyContent:'center',marginRight:13},imageEmoji:{fontSize:30},
 content:{flex:1,minWidth:0},name:{fontSize:16,color:'#14213A',fontWeight:'700',marginBottom:4},desc:{fontSize:12,color:'#54657C',marginBottom:4},badge:{alignSelf:'flex-start',paddingVertical:4,paddingHorizontal:10,borderRadius:30},arrow:{fontSize:25,color:'#687991',marginLeft:5}
});
