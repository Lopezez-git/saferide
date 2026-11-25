import { useFocusEffect, useRouter } from "expo-router";
import { Button } from "../../components/ui";
import { AppState, Platform, Switch, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palettes, useSimulationTheme } from '../../lib/simulationTheme';
import { useCallback, useState } from 'react';
import { overlay } from '../../lib/overlay';

export default function Settings() {
  const router = useRouter();
  const {theme,setTheme,palette:p,error}=useSimulationTheme();
  const s = sheets[theme];
  const hasNotifications = overlay.available();
  const [notificationsOn, setNotificationsOn] = useState(() => overlay.running());
  const [updating, setUpdating] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('');
  useFocusEffect(useCallback(() => {
    if (!hasNotifications) return;
    const refresh = () => setNotificationsOn(overlay.running() && overlay.permission());
    refresh();
    const actions = overlay.listen(action => {
      if (action === 'stopped') refresh();
    });
    const foreground = AppState.addEventListener('change', status => {
      if (status === 'active') refresh();
    });
    return () => { actions?.remove(); foreground.remove(); };
  }, [hasNotifications]));

  async function changeNotifications(enabled: boolean) {
    if (updating) return;
    setUpdating(true);
    setOverlayMessage('');
    try {
      if (enabled) {
        if (!await overlay.request() || !overlay.permission()) {
          setOverlayMessage('Permita as notificações do SafeRide nos ajustes do Android.');
          return;
        }
        overlay.start();
      } else {
        overlay.stop();
      }
      // Android starts and stops the foreground service asynchronously.
      for (let attempt = 0; attempt < 20 && overlay.running() !== enabled; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (overlay.running() !== enabled) setOverlayMessage('A alteração ainda não foi confirmada pelo Android.');
    } catch {
      setOverlayMessage('Não foi possível alterar as notificações. Tente novamente.');
    } finally {
      setNotificationsOn(overlay.running() && overlay.permission());
      setUpdating(false);
    }
  }
  return <ScrollView style={{flex:1,backgroundColor:p.background}} contentContainerStyle={s.page}>
    <Button secondary title="Comunidade" onPress={() => router.push("/community")} />
    <Button secondary title="Meu perfil e reputação" onPress={() => router.push("/profile")} />
    <Text style={s.label}>AVISOS DA SIMULAÇÃO</Text>
    {hasNotifications ? <>
      <Text style={s.description}>Receba o resumo da oferta e o lembrete de avaliar o trajeto nas notificações do Android.</Text>
      <View style={s.notificationRow}>
        <Text accessibilityLiveRegion="polite" style={s.optionLabel}>
          {updating ? 'Atualizando…' : notificationsOn ? 'Notificações ativadas' : 'Notificações desativadas'}
        </Text>
        <Switch accessibilityLabel="Notificações da simulação" disabled={updating}
          value={notificationsOn} onValueChange={changeNotifications} />
      </View>
      {overlayMessage ? <Text accessibilityRole="alert" style={s.description}>{overlayMessage}</Text> : null}
    </> : <Text style={s.description}>{Platform.OS === 'web'
      ? 'No navegador, o resumo da oferta aparece no mapa e o pedido de feedback aparece após a corrida.'
      : 'Nesta versão, os avisos aparecem dentro do aplicativo. As notificações do celular estão disponíveis na versão Android de desenvolvimento.'}</Text>}
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
const createStyles = (p: typeof palettes.dark) => StyleSheet.create({page:{padding:22,gap:18,maxWidth:560,width:'100%',alignSelf:'center'},description:{fontSize:14,lineHeight:22,color:p.muted},label:{fontSize:11,fontWeight:'800',letterSpacing:1.4,color:p.muted,marginTop:8},notificationRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},options:{flexDirection:'row',gap:14},option:{flex:1,padding:10,borderWidth:2,borderColor:p.border,borderRadius:18},selected:{borderColor:p.accent,backgroundColor:p.accentSurface},swatch:{height:110,borderRadius:10,padding:14,gap:10},optionLabel:{paddingTop:10,fontSize:15,fontWeight:'700',color:p.text},preview:{padding:20,borderRadius:22,borderWidth:1}});

const sheets = {light:createStyles(palettes.light), dark:createStyles(palettes.dark)};
