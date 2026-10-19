import React from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import ItemCard from './ItemCard';
export default function LatestItems({items,onOpen,onViewAll}){
 return <View style={styles.section}><View style={styles.heading}><Text style={styles.title} accessibilityRole="header">Barang Terbaru</Text><Pressable onPress={onViewAll} accessibilityRole="button" accessibilityLabel="Lihat semua barang" style={styles.action}><Text style={styles.actionText}>Lihat semua ›</Text></Pressable></View>
 {items.length?items.slice(0,3).map(item=><ItemCard key={item.id} item={item} onPress={()=>onOpen(item)} compact/>):<Text style={styles.empty}>Belum ada laporan barang.</Text>}
 </View>;
}
const styles=StyleSheet.create({section:{paddingBottom:20},heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},title:{fontSize:18,fontWeight:'800',color:'#152238'},action:{minHeight:44,justifyContent:'center'},actionText:{color:'#1565C0',fontWeight:'700',fontSize:13},empty:{color:'#64748B',paddingVertical:14}});
