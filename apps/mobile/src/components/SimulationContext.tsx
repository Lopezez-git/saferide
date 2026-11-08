import { memo, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSimulationTheme } from '../lib/simulationTheme';
import SimulationMotion from './SimulationMotion';
import { api } from '../lib/client';
import { Offer, routeBody } from '../lib/simulation';

import { type Police, type Pavement, type Traffic, policeSummary, pavementSummary, trafficSummary } from '../lib/simulationContext';

const date = (value?: string) => value ? value.split('-').reverse().join('/') : '—';
function SimulationContext({ offer, top, active, visible = true, reducedMotion = false }: Readonly<{ offer: Offer; top: number; active: boolean; visible?: boolean; reducedMotion?: boolean | null }>) {
  const { palette: c } = useSimulationTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [detail, setDetail] = useState(false);
  const [data, setData] = useState<{ key: Offer; police?: Police | null; pavement?: Pavement | null; traffic?: Traffic | null } | null>(null);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const query = `?latitude=${offer.destination.latitude}&longitude=${offer.destination.longitude}`;
    const store = (field: 'police' | 'pavement' | 'traffic', value: Police | Pavement | Traffic | null) => {
      if (!controller.signal.aborted) setData(old => ({ ...(old?.key === offer ? old : { key: offer }), [field]: value }));
    };
    api<Police>('/safety/police' + query, { signal: controller.signal }).then(value => store('police', value)).catch(() => store('police', null));
    api<Pavement>('/pavement/requests' + query, { signal: controller.signal }).then(value => store('pavement', value)).catch(() => store('pavement', null));
    api<Traffic>('/traffic/route', { method: 'POST', body: routeBody(offer.pickup, offer.destination), signal: controller.signal }).then(value => store('traffic', value)).catch(() => store('traffic', null));
    return () => controller.abort();
  }, [offer, active]);
  const current = data?.key === offer ? data : null;
  const police = current?.police, pavement = current?.pavement, traffic = current?.traffic;
  const cards = [
    { label: 'Segurança', color: c.blue, path: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z', ...policeSummary(police) },
    { label: 'Pavimento', color: c.orange, path: 'M7 3L3 21M17 3l4 18M12 3v4m0 4v3m0 4v3', value: pavementSummary(pavement), caption: 'Abertos na publicação' },
    { label: 'Trânsito', color: traffic?.condition === 'LEVE' ? c.accent : c.violet, path: 'M4 7h13l-3-3m3 3l-3 3M20 17H7l3-3m-3 3l3 3', value: trafficSummary(traffic), caption: traffic?.status === 'AVAILABLE' ? 'Ao vivo · TomTom' : 'Sem avaliação ao vivo' },
  ];
  return <SimulationMotion visible={visible} reducedMotion={reducedMotion} fromY={-36} duration={520} delay={300} testID="simulation-notification" style={[styles.floating, { top, backgroundColor:c.surface,borderColor:c.border }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ver fontes do SafeRide" onPress={() => setDetail(true)} style={{ flex: 1, flexDirection:'row',alignItems:'center',gap:8,minHeight:40 }}>
        <View style={{width:27,height:27,borderRadius:9,backgroundColor:c.accentSurface,alignItems:'center',justifyContent:'center'}}><Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2}><Path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6"/></Svg></View>
        <Text style={[styles.brand,{color:c.text}]}>SafeRide</Text><Text style={[styles.subtitle,{color:c.muted}]}>NO DESTINO</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Expandir SafeRide' : 'Recolher SafeRide'} accessibilityState={{expanded:!collapsed}} onPress={() => setCollapsed(!collapsed)} style={styles.toggle}><Text style={{ color:c.muted, fontSize:20 }}>{collapsed ? '+' : '−'}</Text></Pressable>
    </View>
    {!collapsed ? <Pressable accessibilityRole="button" accessibilityLabel="Ver detalhes de segurança, pavimento e trânsito" onPress={() => setDetail(true)}>

      <View style={styles.grid}>{cards.map(card => <View key={card.label} style={styles.cell}>
        <View style={{ flexDirection:'row',alignItems:'center',gap:4 }}><Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth={1.8}><Path d={card.path}/></Svg><Text style={[styles.label,{color:c.muted}]}>{card.label}</Text></View>
        <Text style={[styles.value,{color:card.color}]} numberOfLines={1} adjustsFontSizeToFit>{card.value}</Text>
      </View>)}</View><Text style={[styles.location,{color:c.muted}]}>SSP e SP156: histórico · toque para ver fontes</Text>

    </Pressable> : null}
    <Modal visible={detail} transparent animationType="fade" onRequestClose={() => setDetail(false)}><View style={styles.scrim}><View style={[styles.detail,{backgroundColor:c.surface}]}>
      <View style={styles.header}><Text style={[styles.brand,{flex:1,color:c.text}]}>Fontes do SafeRide</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar fontes" onPress={() => setDetail(false)} style={styles.toggle}><Text style={{color:c.text,fontSize:25}}>×</Text></Pressable></View>
      <ScrollView><Text style={[styles.body,{color:c.muted}]}>{offer.destination.name}</Text><Text style={[styles.body,{color:c.muted}]}>Segurança e pavimento: raio de 1 km do destino. Trânsito: percurso do embarque ao destino.</Text>
        <Text style={[styles.section,{color:c.text}]}>Segurança · SSP-SP</Text><Text style={[styles.body,{color:c.muted}]}>Roubo e furto de veículos de {police?.periodStart ?? '—'} a {police?.periodEnd ?? '—'}, filtrados pela hora atual de São Paulo. Histórico, não ocorrências ao vivo. Zero BOs não garante segurança.</Text>
        {police?.sourceUrl ? <Pressable onPress={() => Linking.openURL(police.sourceUrl!).catch(() => {})}><Text style={[styles.link,{color:c.accent}]}>Abrir publicação SSP ↗</Text></Pressable> : null}
        <Text style={[styles.section,{color:c.text}]}>Pavimento · SP156</Text><Text style={[styles.body,{color:c.muted}]}>Solicitações abertas ou em andamento na publicação de {date(pavement?.sourceUpdatedAt)}. Pedidos de tapa-buraco não são contagem de buracos atuais nem confirmação de pavimento ruim.</Text>
        {pavement?.sourceUrl ? <Pressable onPress={() => Linking.openURL(pavement.sourceUrl!).catch(() => {})}><Text style={[styles.link,{color:c.accent}]}>Abrir publicação SP156 ↗</Text></Pressable> : null}
        <Text style={[styles.section,{color:c.text}]}>Trânsito · TomTom</Text><Text style={[styles.body,{color:c.muted}]}>{traffic?.status === 'AVAILABLE' ? `Estimativa consultada em ${new Date(traffic.checkedAt!).toLocaleTimeString('pt-BR')}. Atraso estimado de ${Math.ceil((traffic.delaySeconds ?? 0)/60)} min. A rota do provedor pode diferir da linha do mapa.` : 'Sem dados ao vivo nesta consulta. O tempo da oferta é uma estimativa de rota sem trânsito; não é usado para inventar uma classificação.'}</Text>
        <Text style={[styles.body,{color:c.muted}]}>Oferta, valor, avaliação e movimento do motorista são simulados. Os dados de contexto vêm do backend real do SafeRide.</Text>
      </ScrollView>
    </View></View></Modal>
  </SimulationMotion>;
}
export default memo(SimulationContext);
const styles = StyleSheet.create({
  floating: { position:'absolute', left:14, right:14, backgroundColor:'#172b32f5', borderColor:'#57858b', borderWidth:1, borderRadius:18, boxShadow:'0 5px 20px #0005', overflow:'hidden' },
  header:{ flexDirection:'row', alignItems:'center', paddingHorizontal:12 }, brand:{ color:'#d6fff3',fontWeight:'800',fontSize:15 }, subtitle:{ fontSize:10,color:'#abc6c8',fontWeight:'500' }, toggle:{ width:40,height:40,alignItems:'center',justifyContent:'center' },
  location:{fontSize:10,paddingHorizontal:14,marginBottom:7},footer:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingVertical:5,borderTopWidth:1},grid:{ flexDirection:'row',paddingBottom:12,paddingHorizontal:8 },cell:{flex:1,paddingHorizontal:6,borderRightWidth:0},label:{fontSize:10,fontWeight:'600'},value:{color:'#fff',fontWeight:'700',fontSize:13,marginTop:5},caption:{fontSize:8,color:'#bccbd0',marginTop:3},
  scrim:{flex:1,backgroundColor:'#000a',justifyContent:'center',alignItems:'center',padding:20},detail:{backgroundColor:'#20252c',padding:12,borderRadius:20,maxWidth:460,width:'100%',maxHeight:'85%'},body:{color:'#c9d0d7',fontSize:14,lineHeight:21,marginVertical:8},section:{color:'white',fontWeight:'700',fontSize:16,marginTop:14},link:{color:'#8be6cb',paddingVertical:8},
});
