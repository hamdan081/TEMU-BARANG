import React from 'react';
import {View,Text,Pressable,StyleSheet,useWindowDimensions} from 'react-native';
export default function ActionMenu({onLost,onFound}){
 const {width}=useWindowDimensions();const narrow=width<390;
 return <View style={[styles.row,{flexDirection:narrow?'column':'row'}]}>
 {[['📢','Lapor Kehilangan','Laporkan barang yang hilang','#A61B35','#FFF1F2',onLost],['📦','Lapor Temuan','Laporkan barang ditemukan','#137D5D','#E5FAF2',onFound]].map(([icon,title,desc,fg,bg,onPress])=>
 <Pressable key={title} onPress={onPress} accessibilityRole="button" accessibilityLabel={title} accessibilityHint={desc} style={[styles.card,{backgroundColor:bg,marginBottom:narrow?10:0,marginRight:!narrow&&title==='Lapor Kehilangan'?10:0}]}>
 <Text style={styles.icon}>{icon}</Text><Text style={[styles.title,{color:fg}]}>{title}</Text><Text style={styles.desc}>{desc}</Text>
 </Pressable>)}</View>;
}
const styles=StyleSheet.create({row:{marginBottom:24},card:{flex:1,borderRadius:15,padding:16,minHeight:122,justifyContent:'center'},icon:{fontSize:27,marginBottom:7},title:{fontSize:15,fontWeight:'800'},desc:{fontSize:12,color:'#475569',marginTop:4}});
