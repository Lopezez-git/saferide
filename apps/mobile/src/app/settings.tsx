import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSimulationTheme } from '../lib/simulationTheme';

export default function Settings() {
  const {theme,setTheme,palette:p,error}=useSimulationTheme();
  return <ScrollView style={{flex:1,backgroundColor:'#f3f6f5'}} contentContainerStyle={s.page}>
    <Text style={s.title}>Do seu jeito.</Text>
    <Text style={s.description}>Escolha a aparência dos cartões e avisos da simulação. Sua preferência fica salva neste dispositivo.</Text>
    <Text style={s.label}>TEMA DA SIMULAÇÃO</Text>
    <View style={s.options}>{(['light','dark'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:theme===value}} accessibilityLabel={value==='light'?'Tema claro':'Tema escuro'} onPress={()=>setTheme(value)} style={[s.option,theme===value&&s.selected]}>
      <View style={[s.swatch,{backgroundColor:value==='light'?'#fff':'#182128'}]}><View style={{width:26,height:26,borderRadius:8,backgroundColor:'#087f71'}}/><View style={{height:7,width:'75%',borderRadius:4,backgroundColor:value==='light'?'#dce5e9':'#43535f'}}/><View style={{height:7,width:'50%',borderRadius:4,backgroundColor:value==='light'?'#dce5e9':'#43535f'}}/></View>
      <Text style={s.optionLabel}>{value==='light'?'Claro':'Escuro'}{theme===value?'  ✓':''}</Text>
    </Pressable>)}</View>
    <Text style={s.label}>PRÉVIA DA NOTIFICAÇÃO</Text>
    <View style={[s.preview,{backgroundColor:p.surface,borderColor:p.border}]}><Text style={{color:p.accent,fontWeight:'800'}}>SafeRide · prévia</Text><Text style={{color:p.text,fontSize:18,fontWeight:'700',marginTop:12}}>Contexto para sua viagem</Text><Text style={{color:p.muted,lineHeight:21,marginTop:6}}>Segurança, pavimento e trânsito em um aviso sobre o mapa.</Text></View>
    <Text style={s.description}>O mapa mantém seu estilo atual. Essa escolha muda a intro, a oferta e a notificação do SafeRide.</Text>
    {error?<Text accessibilityRole="alert" style={{color:'#a33b22'}}>{error}</Text>:null}
  </ScrollView>;
}
const s=StyleSheet.create({page:{padding:22,gap:18,maxWidth:560,width:'100%',alignSelf:'center'},title:{fontSize:28,fontWeight:'800',color:'#17352e'},description:{fontSize:14,lineHeight:22,color:'#52685f'},label:{fontSize:11,fontWeight:'800',letterSpacing:1.4,color:'#52685f',marginTop:8},options:{flexDirection:'row',gap:14},option:{flex:1,padding:10,borderWidth:2,borderColor:'#d9e1df',borderRadius:18},selected:{borderColor:'#087f71',backgroundColor:'#e8f4ef'},swatch:{height:110,borderRadius:10,padding:14,gap:10},optionLabel:{paddingTop:10,fontSize:15,fontWeight:'700',color:'#17352e'},preview:{padding:20,borderRadius:22,borderWidth:1}});
