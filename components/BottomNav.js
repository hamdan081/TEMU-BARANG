import React from 'react';
import {View,Pressable,Text,StyleSheet} from 'react-native';
const tabs=[['home','⌂','Beranda'],['list','☷','Daftar'],['report','+','Lapor'],['profile','♙','Profil']];
export default function BottomNav({active,onSelect}){
 return <View style={styles.base}><View style={styles.row}>{tabs.map(([key,icon,label])=>
 <Pressable key={key} onPress={()=>onSelect(key)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:active===key}} style={styles.tab}>
 <Text importantForAccessibility="no" style={[styles.icon,active===key&&styles.selected]}>{icon}</Text>
 <Text importantForAccessibility="no" style={[styles.label,active===key&&styles.selected]}>{label}</Text>
 </Pressable>)}</View></View>;
}
const styles=StyleSheet.create({base:{backgroundColor:'#fff',borderTopColor:'#E2E8F0',borderTopWidth:1},row:{maxWidth:860,width:'100%',alignSelf:'center',flexDirection:'row',justifyContent:'space-around'},tab:{flex:1,minHeight:60,alignItems:'center',justifyContent:'center',padding:5},icon:{fontSize:23,color:'#64748B'},label:{fontSize:12,color:'#64748B'},selected:{color:'#1565C0',fontWeight:'800'}});
