import React from 'react';
import {View,Pressable,Text,StyleSheet,useWindowDimensions} from 'react-native';
import {categories} from '../models/Barang';
const emoji={Elektronik:'📱',Dokumen:'📄',Pakaian:'👕',Aksesoris:'🔑',Perlengkapan:'🎒',Lainnya:'📦'};
export default function CategoryList({onSelect}){
 const {width}=useWindowDimensions();const cols=width<350?2:width>=768?6:3;
 return <View style={styles.section}><Text style={styles.title} accessibilityRole="header">Kategori Barang</Text>
 <View style={styles.grid}>{categories.map(cat=><Pressable key={cat} onPress={()=>onSelect(cat)} accessibilityRole="button" accessibilityLabel={`Kategori ${cat}`} style={[styles.category,{width:`${100/cols-2}%`}]}> 
 <Text importantForAccessibility="no" style={styles.emoji}>{emoji[cat]}</Text><Text style={styles.label}>{cat}</Text></Pressable>)}</View></View>;
}
const styles=StyleSheet.create({section:{marginBottom:18},title:{fontSize:18,fontWeight:'800',color:'#152238',marginBottom:12},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},category:{borderWidth:1,borderColor:'#E2E8F0',borderRadius:12,minHeight:75,backgroundColor:'#fff',marginBottom:10,alignItems:'center',justifyContent:'center',paddingHorizontal:3},emoji:{fontSize:24,marginBottom:5},label:{fontSize:11,color:'#334155',textAlign:'center',fontWeight:'600'}});
