import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
export default function Header({userName}){
 return <View style={styles.root}><View style={styles.inner} accessibilityRole="header">
 <View style={styles.greeting}><Text style={styles.hello}>Halo,</Text><Text style={styles.name} numberOfLines={2}>{userName||'Mahasiswa'} 👋</Text></View>
 <View style={styles.pill}><Text style={styles.pillText}>TemuKampus</Text></View>
 </View></View>;
}
const styles=StyleSheet.create({root:{backgroundColor:'#fff',borderBottomWidth:1,borderColor:'#E2E8F0',paddingHorizontal:18,paddingVertical:15},inner:{maxWidth:860,width:'100%',alignSelf:'center',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},greeting:{flex:1,minWidth:0},hello:{fontSize:14,color:'#526580'},name:{fontWeight:'800',color:'#1458B0',fontSize:20},pill:{backgroundColor:'#E8F1FD',borderRadius:14,paddingHorizontal:11,paddingVertical:8,flexShrink:0},pillText:{fontWeight:'700',color:'#185CB6',fontSize:12}});
