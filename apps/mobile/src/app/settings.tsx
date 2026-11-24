import { useRouter } from "expo-router";
import { Button } from "../components/ui";
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palettes, useSimulationTheme } from '../lib/simulationTheme';
import { useState } from 'react';
import { overlay } from '../lib/overlay';

export default function Settings() {
  const router = useRouter();
  const {theme,setTheme,palette:p,error}=useSimulationTheme();
  const s = sheets[theme];
  const [overlayMessage,setOverlayMessage]=useState('');
  async function activateOverlay() {
    try {
      if(!overlay.available()){setOverlayMessage('Disponível na versão Android de desenvolvimento. A prévia web e o Expo Go não incluem esta função.');return;}
      if(!await overlay.request() || !overlay.permission()){setOverlayMessage('Permita as notificações do SafeRide nas configurações do Android.');return;}
      overlay.start();setOverlayMessage('Notificações ativadas para a simulação.');
    } catch {setOverlayMessage('Não foi possível ativar as notificações. Confira a permissão do Android.');}
  }
  return <ScrollView style={{flex:1,backgroundColor:p.background}} contentContainerStyle={s.page}>
    <Text style={s.title}>Do seu jeito.</Text>
    <Button secondary title="Comunidade" onPress={() => router.push("/community")} />
    <Button secondary title="Meu perfil e reputação" onPress={() => router.push("/profile")} />
    <Text style={s.label}>NOTIFICAÇÕES ANDROID · DEMONSTRAÇÃO</Text>
    <Text style={s.description}>Ative para receber o contexto das ofertas e o pedido de feedback. As corridas e os trajetos são simulados.</Text>
    <View style={s.options}><Pressable accessibilityRole="button" onPress={()=>void activateOverlay()} style={[s.option,s.selected]}><Text style={s.optionLabel}>Ativar notificações</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>{overlay.stop();setOverlayMessage('Notificações encerradas.');}} style={s.option}><Text style={s.optionLabel}>Desativar</Text></Pressable></View>
    {overlayMessage?<Text accessibilityRole="alert" style={s.description}>{overlayMessage}</Text>:null}
    <Text style={s.description}>Escolha como o SafeRide aparece neste dispositivo.</Text>
    <Text style={s.label}>TEMA DO APLICATIVO</Text>
    <View style={s.options}>{(['light','dark'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:theme===value}} accessibilityLabel={value==='light'?'Tema claro':'Tema escuro'} onPress={()=>setTheme(value)} style={[s.option,theme===value&&s.selected]}>
      <View style={[s.swatch,{backgroundColor:value==='light'?'#fff':'#182128'}]}><View style={{width:26,height:26,borderRadius:8,backgroundColor:'#087f71'}}/><View style={{height:7,width:'75%',borderRadius:4,backgroundColor:value==='light'?'#dce5e9':'#43535f'}}/><View style={{height:7,width:'50%',borderRadius:4,backgroundColor:value==='light'?'#dce5e9':'#43535f'}}/></View>
      <Text style={s.optionLabel}>{value==='light'?'Claro':'Escuro'}{theme===value?'  ✓':''}</Text>
    </Pressable>)}</View>
    <Text style={s.label}>PRÉVIA DA NOTIFICAÇÃO</Text>
    <View style={[s.preview,{backgroundColor:p.surface,borderColor:p.border}]}><Text style={{color:p.accent,fontWeight:'800'}}>SafeRide · prévia</Text><Text style={{color:p.text,fontSize:18,fontWeight:'700',marginTop:12}}>Contexto para sua viagem</Text><Text style={{color:p.muted,lineHeight:21,marginTop:6}}>Segurança, pavimento e trânsito em notificações do SafeRide.</Text></View>
    {error?<Text accessibilityRole="alert" style={{color:p.danger}}>{error}</Text>:null}
  </ScrollView>;
}
const createStyles = (p: typeof palettes.dark) => StyleSheet.create({page:{padding:22,gap:18,maxWidth:560,width:'100%',alignSelf:'center'},title:{fontSize:28,fontWeight:'800',color:p.text},description:{fontSize:14,lineHeight:22,color:p.muted},label:{fontSize:11,fontWeight:'800',letterSpacing:1.4,color:p.muted,marginTop:8},options:{flexDirection:'row',gap:14},option:{flex:1,padding:10,borderWidth:2,borderColor:p.border,borderRadius:18},selected:{borderColor:p.accent,backgroundColor:p.accentSurface},swatch:{height:110,borderRadius:10,padding:14,gap:10},optionLabel:{paddingTop:10,fontSize:15,fontWeight:'700',color:p.text},preview:{padding:20,borderRadius:22,borderWidth:1}});

const sheets = {light:createStyles(palettes.light), dark:createStyles(palettes.dark)};
