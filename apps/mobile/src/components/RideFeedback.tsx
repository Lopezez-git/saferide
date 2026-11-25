import { palettes, useSimulationTheme } from "../lib/simulationTheme";
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeedbackCategory, feedbackOptions, submitRideFeedback } from '../lib/rideHistory';

type Props = Readonly<{rideId:string|null; onClose:()=>void; onSaved?:()=>void}>;
export default function RideFeedback({rideId,onClose,onSaved}:Props) {
 const s = sheets[useSimulationTheme().theme];
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState<FeedbackCategory[]>([]);
 function select(category:FeedbackCategory){setSelected(old=>category==='NONE'?(old.includes('NONE')?[]:['NONE']):old.includes(category)?old.filter(value=>value!==category):[...old.filter(value=>value!=='NONE'),category]);}
 async function send() {
  if(!rideId||sending||!selected.length)return;
  setSending(true);setError('');
  try { await submitRideFeedback(rideId,selected); setSelected([]);onSaved?.();onClose(); }
  catch { setError('Não foi possível enviar. Tente novamente ou responda depois no histórico.'); }
  finally { setSending(false); }
 }
 function close(){setError('');setSelected([]);onClose();}
 return <Modal visible={!!rideId} transparent animationType="fade" onRequestClose={close}>
  <View style={s.backdrop}><View style={s.card}>
   <Text style={s.eyebrow}>CORRIDA SIMULADA</Text>
   <Text style={s.title}>Encontrou algum problema no trajeto?</Text>
   <Text style={s.description}>Responda quando estiver parado. O relato será associado ao trajeto, sem indicar um ponto exato.</Text>
   <ScrollView style={s.options}>
    {feedbackOptions.map(option=><Pressable key={option.value} accessibilityRole="checkbox" accessibilityState={{checked:selected.includes(option.value),disabled:sending}} disabled={sending} onPress={()=>select(option.value)} style={[s.option,selected.includes(option.value)&&s.selected]}><Text style={s.optionText}>{selected.includes(option.value)?'✓  ':''}{option.label}</Text></Pressable>)}
   </ScrollView>
   {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
   <Pressable accessibilityRole="button" disabled={sending||!selected.length} onPress={()=>void send()} style={[s.send,(!selected.length||sending)&&{opacity:0.5}]}><Text style={s.sendText}>{sending?'Enviando…':'Enviar feedback'}</Text></Pressable>
   <Pressable accessibilityRole="button" disabled={sending} onPress={close} style={s.later}><Text style={s.laterText}>{sending?'Enviando…':'Responder depois'}</Text></Pressable>
  </View></View>
 </Modal>;
}
const createStyles = (p: typeof palettes.dark) => StyleSheet.create({
 backdrop:{flex:1,backgroundColor:'#0009',justifyContent:'center',padding:22},
 card:{backgroundColor:p.surface,borderRadius:24,padding:22,gap:12,maxWidth:460,width:'100%',alignSelf:'center',maxHeight:'85%'},
 eyebrow:{color:p.accent,fontWeight:'800',fontSize:11,letterSpacing:1},
 title:{color:p.text,fontWeight:'800',fontSize:22},
 description:{color:p.muted,fontSize:14,lineHeight:20},
 options:{flexGrow:0},option:{padding:14,marginBottom:8,borderRadius:14,backgroundColor:p.inset},
 optionText:{color:p.text,fontSize:16,fontWeight:'700'},
 selected:{borderWidth:2,borderColor:p.accent},send:{padding:14,alignItems:'center',borderRadius:14,backgroundColor:'#087f71'},sendText:{color:'#fff',fontWeight:'800'},
 later:{padding:12,alignItems:'center'},laterText:{color:p.muted,fontWeight:'700'},error:{color:p.danger,fontSize:13},
});

const sheets = {light:createStyles(palettes.light), dark:createStyles(palettes.dark)};
