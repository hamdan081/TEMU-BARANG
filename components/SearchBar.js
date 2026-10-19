import React from 'react';
import {View,Text,TextInput,StyleSheet} from 'react-native';
export default function SearchBar({value,onChangeText}){
 return <View style={styles.root}><Text importantForAccessibility="no" style={styles.icon}>⌕</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder="Cari barang hilang atau ditemukan..." placeholderTextColor="#64748B" accessibilityLabel="Cari barang berdasarkan nama, kategori, atau lokasi" autoCorrect={false} returnKeyType="search" /></View>;
}
const styles=StyleSheet.create({root:{borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#fff',borderRadius:12,paddingHorizontal:14,marginVertical:18,flexDirection:'row',alignItems:'center',minHeight:50},icon:{fontSize:25,color:'#64748B',paddingRight:8},input:{flex:1,color:'#152238',fontSize:15,minHeight:48}});
