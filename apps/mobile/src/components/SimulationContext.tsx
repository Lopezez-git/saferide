import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { api } from '../lib/client';
import { Offer, routeBody } from '../lib/simulation';

type Police = { status: string; currentTimeWindow?: string; windows?: Record<string, Record<string, number>>; periodStart?: string; periodEnd?: string; sourceUrl?: string };
type Pavement = { status: string; statuses?: Record<string, number>; sourceUpdatedAt?: string; sourceUrl?: string };
type Traffic = { status: string; condition?: string; delaySeconds?: number; checkedAt?: string };
const date = (value?: string) => value ? value.split('-').reverse().join('/') : '—';
export default function SimulationContext({ offer, top, active }: { offer: Offer; top: number; active: boolean }) {
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
  const hour = police?.currentTimeWindow;
  const count = hour && police?.windows?.[hour] ? Object.values(police.windows[hour]).reduce((a, b) => a + b, 0) : null;
  const open = (pavement?.statuses?.Aberto ?? 0) + (pavement?.statuses?.['Em andamento'] ?? 0);
  const conditions: Record<string, string> = { LEVE: 'Tranquilo', MODERADO: 'Moderado', CONGESTIONADO: 'Congestionado' };
  const cards = [
    { label: 'Segurança', color: '#83c9e8', path: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z', value: police === undefined ? 'Consultando…' : police?.status === 'AVAILABLE' && count !== null ? `${count} ${count===1?'BO':'BOs'}` : 'Indisponível', caption: count !== null ? `Histórico · ${hour}h–${String((Number(hour)+1)%24).padStart(2,'0')}h` : 'SSP · histórico' },
    { label: 'Pavimento', color: '#ffbe7d', path: 'M7 3L3 21M17 3l4 18M12 3v4m0 4v3m0 4v3', value: pavement === undefined ? 'Consultando…' : pavement?.status === 'AVAILABLE' ? `${open} pedidos` : 'Indisponível', caption: 'Abertos na publicação' },
    { label: 'Trânsito', color: traffic?.condition === 'LEVE' ? '#7de0b4' : '#c1b7ff', path: 'M4 7h13l-3-3m3 3l-3 3M20 17H7l3-3m-3 3l3 3', value: traffic === undefined ? 'Consultando…' : traffic?.status === 'AVAILABLE' ? conditions[traffic.condition ?? ''] ?? 'Indisponível' : 'Indisponível', caption: traffic?.status === 'AVAILABLE' ? 'Ao vivo · TomTom' : 'Sem avaliação ao vivo' },
  ];
  return <View style={[styles.floating, { top }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ver fontes do SafeRide" onPress={() => setDetail(true)} style={{ flex: 1, paddingVertical: 9 }}><Text style={styles.brand}>◈ SafeRide <Text style={styles.subtitle}> · contexto do destino</Text></Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Expandir SafeRide' : 'Recolher SafeRide'} onPress={() => setCollapsed(!collapsed)} style={styles.toggle}><Text style={{ color: 'white', fontSize: 20 }}>{collapsed ? '+' : '−'}</Text></Pressable>
    </View>
    {!collapsed ? <Pressable accessibilityRole="button" accessibilityLabel="Ver detalhes de segurança, pavimento e trânsito" onPress={() => setDetail(true)} style={styles.grid}>{cards.map(card => <View key={card.label} style={styles.cell}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth={1.8}><Path d={card.path} /></Svg><Text style={[styles.label, { color: card.color }]}>{card.label}</Text></View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{card.value}</Text><Text style={styles.caption}>{card.caption}</Text>
    </View>)}</Pressable> : null}
    <Modal visible={detail} transparent animationType="fade" onRequestClose={() => setDetail(false)}><View style={styles.scrim}><View style={styles.detail}>
      <View style={styles.header}><Text style={[styles.brand,{flex:1}]}>Fontes do SafeRide</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar fontes" onPress={() => setDetail(false)} style={styles.toggle}><Text style={{color:'white',fontSize:25}}>×</Text></Pressable></View>
      <ScrollView><Text style={styles.body}>{offer.destination.name}</Text><Text style={styles.body}>Segurança e pavimento: raio de 1 km do destino. Trânsito: percurso do embarque ao destino.</Text>
        <Text style={styles.section}>Segurança · SSP-SP</Text><Text style={styles.body}>Roubo e furto de veículos de {police?.periodStart ?? '—'} a {police?.periodEnd ?? '—'}, filtrados pela hora atual de São Paulo. Histórico, não ocorrências ao vivo. Zero BOs não garante segurança.</Text>
        {police?.sourceUrl ? <Pressable onPress={() => Linking.openURL(police.sourceUrl!).catch(() => {})}><Text style={styles.link}>Abrir publicação SSP ↗</Text></Pressable> : null}
        <Text style={styles.section}>Pavimento · SP156</Text><Text style={styles.body}>Solicitações abertas ou em andamento na publicação de {date(pavement?.sourceUpdatedAt)}. Pedidos de tapa-buraco não são contagem de buracos atuais nem confirmação de pavimento ruim.</Text>
        {pavement?.sourceUrl ? <Pressable onPress={() => Linking.openURL(pavement.sourceUrl!).catch(() => {})}><Text style={styles.link}>Abrir publicação SP156 ↗</Text></Pressable> : null}
        <Text style={styles.section}>Trânsito · TomTom</Text><Text style={styles.body}>{traffic?.status === 'AVAILABLE' ? `Estimativa consultada em ${new Date(traffic.checkedAt!).toLocaleTimeString('pt-BR')}. Atraso estimado de ${Math.ceil((traffic.delaySeconds ?? 0)/60)} min. A rota do provedor pode diferir da linha do mapa.` : 'Sem dados ao vivo nesta consulta. O tempo da oferta é uma estimativa de rota sem trânsito; não é usado para inventar uma classificação.'}</Text>
        <Text style={styles.body}>Oferta, valor, avaliação e movimento do motorista são simulados. Os dados de contexto vêm do backend real do SafeRide.</Text>
      </ScrollView>
    </View></View></Modal>
  </View>;
}
const styles = StyleSheet.create({
  floating: { position:'absolute', left:14, right:14, backgroundColor:'#172b32f5', borderColor:'#57858b', borderWidth:1, borderRadius:16, boxShadow:'0 5px 20px #0005', overflow:'hidden' },
  header:{ flexDirection:'row', alignItems:'center', paddingHorizontal:12 }, brand:{ color:'#d6fff3',fontWeight:'800',fontSize:15 }, subtitle:{ fontSize:10,color:'#abc6c8',fontWeight:'500' }, toggle:{ width:40,height:40,alignItems:'center',justifyContent:'center' },
  grid:{ flexDirection:'row',paddingBottom:12,paddingHorizontal:6 },cell:{flex:1,paddingHorizontal:6,borderRightWidth:0},label:{fontSize:11,fontWeight:'600'},value:{color:'#fff',fontWeight:'700',fontSize:15,marginTop:7},caption:{fontSize:9,color:'#bccbd0',marginTop:3},
  scrim:{flex:1,backgroundColor:'#000a',justifyContent:'center',alignItems:'center',padding:20},detail:{backgroundColor:'#20252c',padding:12,borderRadius:20,maxWidth:460,width:'100%',maxHeight:'85%'},body:{color:'#c9d0d7',fontSize:14,lineHeight:21,marginVertical:8},section:{color:'white',fontWeight:'700',fontSize:16,marginTop:14},link:{color:'#8be6cb',paddingVertical:8},
});
