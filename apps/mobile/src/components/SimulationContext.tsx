import { offerContext, offerNotification, offerPavement, levelStyle, trafficLevel } from "../lib/localCardLevel";
import { inPilot, trafficByHour, trafficHoursDetail } from "../lib/trafficHours";
import { useCurrentMinute } from "../lib/useCurrentMinute";
import { memo, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSimulationTheme } from '../lib/simulationTheme';
import SimulationMotion from './SimulationMotion';
import { api, type Report } from '../lib/client';
import { overlay } from '../lib/overlay';
import { feedbackOptions, loadSimulatedCommunityFeedback, SimulatedCommunityFeedback } from '../lib/rideHistory';
import { Offer, type PlannedOffer, routeBody } from '../lib/simulation';
import { newsOnRoute, type NewsFeed, type RoadNews } from '../lib/routeNews';
import { newsLink } from '../lib/newsLink';

import { type Police, type Pavement, type Traffic, trafficSummary, grossRatesLabel } from '../lib/simulationContext';

const date = (value?: string) => value ? value.split('-').reverse().join('/') : '—';
type OfferData = { police?: Police | null; pavement?: Pavement | null; traffic?: Traffic | null; roadReports?: Report[] | null; news?: RoadNews[] };
function SimulationContext({ offer, route, meters, seconds, pickupSeconds, top, active, remainingMinutes, visible = true, reducedMotion = false, onLayout }: Readonly<{ offer: Offer; route: PlannedOffer['route']; meters: number; seconds: number; pickupSeconds: number; top?: number; remainingMinutes?: number; active: boolean; visible?: boolean; reducedMotion?: boolean | null; onLayout?: (event: LayoutChangeEvent) => void }>) {
  const { palette: c, theme } = useSimulationTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [detail, setDetail] = useState(false);
  const [data, setData] = useState<({ key: Offer } & OfferData) | null>(null);
  const [community,setCommunity]=useState<{key:Offer;items:SimulatedCommunityFeedback[]|null}|null>(null);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const query = `?latitude=${offer.destination.latitude}&longitude=${offer.destination.longitude}`;
    const store = <K extends keyof OfferData>(field: K, value: OfferData[K]) => {
      if (!controller.signal.aborted) setData(old => ({ ...(old?.key === offer ? old : { key: offer }), [field]: value }));
    };
    api<Police>('/safety/police' + query, { signal: controller.signal }).then(value => store('police', value)).catch(() => store('police', null));
    api<NewsFeed>('/news', { signal: controller.signal }).then(feed => store('news', feed.items)).catch(() => store('news', []));
    api<Pavement>('/pavement/requests' + query, { signal: controller.signal }).then(value => store('pavement', value)).catch(() => store('pavement', null));
    api<Report[]>('/reports', { signal: controller.signal }).then(value => store('roadReports', Array.isArray(value) ? value : null)).catch(() => store('roadReports', null));
    api<Traffic>('/traffic/route', { method: 'POST', body: routeBody(offer.pickup, offer.destination), signal: controller.signal }).then(value => store('traffic', value)).catch(() => store('traffic', null));
    const routeQuery=`?originLat=${offer.pickup.latitude}&originLon=${offer.pickup.longitude}&destinationLat=${offer.destination.latitude}&destinationLon=${offer.destination.longitude}`;
    loadSimulatedCommunityFeedback(routeQuery).then(items=>{if(!controller.signal.aborted)setCommunity({key:offer,items});}).catch(()=>{if(!controller.signal.aborted)setCommunity({key:offer,items:null});});
    return () => controller.abort();
  }, [offer, active]);
  const rateLabel = grossRatesLabel(offer.fare, meters, seconds);
  const pickupMinutes = Math.ceil(pickupSeconds / 60);
  const tripMinutes = Math.ceil((seconds - pickupSeconds) / 60);
  const current = data?.key === offer ? data : null;
  const police = current?.police, pavement = current?.pavement, traffic = current?.traffic;
  const reports=community?.key===offer?community.items:undefined;
  const checkedAt = useCurrentMinute();
  const typical = traffic?.status !== "AVAILABLE" && inPilot(offer.pickup) && inPilot(offer.destination) ? trafficByHour(checkedAt) : null;
  const trafficValue = typical?.label ?? trafficSummary(traffic);
  const trafficTone = typical?.level ?? trafficLevel(traffic?.status === "AVAILABLE" ? traffic.condition : undefined);
  const trafficCaption = typical ? "Estimativa" : trafficTone !== "unknown" ? "Ao vivo" : undefined;
  const trafficText = trafficCaption ? `${trafficValue} · ${trafficCaption.toLowerCase()}` : trafficValue;
  const roadSignal = offerPavement(pavement, current?.roadReports, route.trip.geometry.coordinates, checkedAt);
  const routeNews = newsOnRoute(current?.news ?? [], [route.pickup, route.trip], checkedAt + (remainingMinutes ?? 0) * 60000);
  const summary = offerNotification(police, pavement, trafficText, trafficTone, roadSignal);
  const notification = routeNews.length ? summary + '\nNotícia: ' + routeNews[0].title : summary;
  useEffect(()=>{
    if(!active)return;
    if(!visible){overlay.update('Aguardando oferta simulada no SafeRide.');return;}
    overlay.update(notification);
  },[active,visible,notification,offer]);
  const context = offerContext(police, pavement);
  const roadTone = levelStyle(roadSignal.level, theme === "dark");
  const cards = [
    { label: 'Segurança', color: levelStyle(context.safety,theme==="dark").ink, path: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z', value:context.history, caption:context.hourLabel },
    { label: 'Pavimento', color: roadTone.ink, badge: roadTone.background, path: 'M7 3L3 21M17 3l4 18M12 3v4m0 4v3m0 4v3', value: roadSignal.label, caption: roadSignal.reason },
    { label: 'Trânsito', color: levelStyle(trafficTone,theme==="dark").ink, path: 'M4 7h13l-3-3m3 3l-3 3M20 17H7l3-3m-3 3l3 3', value: trafficValue, caption: trafficCaption },
  ];
  return <SimulationMotion visible={visible} reducedMotion={reducedMotion} fromY={-36} duration={520} delay={0} testID="simulation-notification" onLayout={onLayout} style={[styles.floating, {top}, { backgroundColor:c.surface,borderColor:c.border }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ver fontes do SafeRide" onPress={() => setDetail(true)} style={{ flex: 1, flexDirection:'row',alignItems:'center',gap:8,minHeight:40 }}>
        <View style={{width:27,height:27,borderRadius:9,backgroundColor:c.accentSurface,alignItems:'center',justifyContent:'center'}}><Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2}><Path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6"/></Svg></View>
        <Text style={[styles.brand,{color:c.text}]}>SafeRide</Text><Text style={[styles.subtitle,{color:c.muted}]}>{remainingMinutes ? 'PRÓXIMA OFERTA' : 'OFERTA'} · {offer.platform} · SIMULAÇÃO</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Expandir SafeRide' : 'Recolher SafeRide'} accessibilityState={{expanded:!collapsed}} onPress={() => setCollapsed(!collapsed)} style={styles.toggle}><Text style={{ color:c.muted, fontSize:20 }}>{collapsed ? '+' : '−'}</Text></Pressable>
    </View>
    {!collapsed ? <Pressable accessibilityRole="button" accessibilityLabel="Ver detalhes de segurança, pavimento e trânsito" onPress={() => setDetail(true)}>

      <View style={{paddingHorizontal:14,paddingBottom:8}}>
        <Text style={[styles.value,{color:c.text}]}>{offer.fare.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · {(meters/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} km</Text>
        <Text style={[styles.label,{color:c.muted}]}>{remainingMinutes ? `Desembarque em ${remainingMinutes} min · ` : ""}{pickupMinutes} min até o embarque · {tripMinutes} min de corrida</Text>
        <Text style={[styles.value,{color:c.text}]}>{rateLabel}</Text>
      </View>
      <View style={styles.grid}>{cards.map(card => <View key={card.label} style={styles.cell}>
        <View style={{ flexDirection:'row',alignItems:'center',gap:4 }}><Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth={1.8}><Path d={card.path}/></Svg><Text style={[styles.label,{color:c.muted}]}>{card.label}</Text></View>
        <Text style={[styles.value,{color:card.color},card.badge ? [styles.badge,{backgroundColor:card.badge}] : null]}>{card.value}</Text>
        {card.caption ? <Text style={[styles.caption,{color:c.muted}]}>{card.caption}</Text> : null}
      </View>)}</View><Text style={[styles.location,{color:c.muted}]}>{reports===undefined?'Consultando relatos do trajeto…':reports===null?'Relatos do trajeto indisponíveis':reports.length?`${reports.length} relato(s) em trajeto semelhante · simulação`:'Sem relatos para este trajeto · simulação'} · toque para detalhes</Text>

      {routeNews[0] ? <Text numberOfLines={2} style={[styles.location,{color:c.text,fontWeight:'700'}]}>No trajeto · {routeNews[0].title}</Text> : null}
    </Pressable> : null}
    <Modal visible={detail} transparent animationType="fade" onRequestClose={() => setDetail(false)}><View style={styles.scrim}><View style={[styles.detail,{backgroundColor:c.surface}]}>
      <View style={styles.header}><Text style={[styles.brand,{flex:1,color:c.text}]}>Fontes do SafeRide</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar fontes" onPress={() => setDetail(false)} style={styles.toggle}><Text style={{color:c.text,fontSize:25}}>×</Text></Pressable></View>
      <ScrollView><Text style={[styles.body,{color:c.text}]}>Receita bruta da oferta dividida pela distância e pelo tempo estimados, incluindo a ida ao embarque. Despesas do veículo ficam fora do cálculo.</Text><Text style={[styles.body,{color:c.muted}]}>{offer.destination.name}</Text><Text style={[styles.body,{color:c.muted}]}>Histórico SSP-SP e pedidos SP156: raio de 1 km do destino. Trânsito e relatos de via: percurso do embarque ao destino.</Text>
        <Text style={[styles.section,{color:c.text}]}>Segurança · SSP-SP</Text><Text style={[styles.body,{color:c.muted}]}>Roubo e furto de veículos de {police?.periodStart ?? '—'} a {police?.periodEnd ?? '—'}, filtrados pela hora atual de São Paulo. Histórico, não ocorrências ao vivo. Zero BOs não garante segurança.</Text>
        {police?.sourceUrl ? <Pressable onPress={() => Linking.openURL(police.sourceUrl!).catch(() => {})}><Text style={[styles.link,{color:c.accent}]}>Abrir publicação SSP ↗</Text></Pressable> : null}
        {routeNews.map(item => <View key={item.id}><Text style={[styles.section,{color:c.text}]}>{item.title}</Text><Pressable accessibilityRole="link" onPress={() => Linking.openURL(newsLink(item).url).catch(() => {})}><Text style={[styles.link,{color:c.accent}]}>{item.source} ↗</Text></Pressable></View>)}
        <Text style={[styles.section,{color:c.text}]}>Pavimento</Text>
        <Text style={[styles.body,{color:roadTone.ink}]}>{roadSignal.label}{roadSignal.reason ? ` · ${roadSignal.reason}` : ''}</Text>
        <Text style={[styles.body,{color:c.muted}]}>Vermelho indica relato revisado de alagamento ou via sem asfalto até 300 m do percurso. Amarelo indica relato de pavimento ou pedidos de reparo. Verde indica ausência de alertas nas fontes consultadas. Cinza indica dados insuficientes.</Text>
        <Text style={[styles.body,{color:c.muted}]}>Tapa-buraco · SP156: {context.surface}. Os pedidos refletem o status na publicação de {date(pavement?.sourceUpdatedAt)}. Relatos e pedidos podem se referir a vias próximas.</Text>
        {pavement?.sourceUrl ? <Pressable onPress={() => Linking.openURL(pavement.sourceUrl!).catch(() => {})}><Text style={[styles.link,{color:c.accent}]}>Abrir publicação SP156 ↗</Text></Pressable> : null}
        <Text style={[styles.section,{color:c.text}]}>Trânsito da corrida</Text><Text style={[styles.body,{color:c.muted}]}>{traffic?.status === 'AVAILABLE' ? `TomTom · estimativa consultada em ${new Date(traffic.checkedAt!).toLocaleTimeString('pt-BR')}. Atraso estimado de ${Math.ceil((traffic.delaySeconds ?? 0)/60)} min. A rota do provedor pode diferir da linha do mapa.` : typical ? trafficHoursDetail : 'Sem dados de trânsito para esta rota.'}</Text>
        <Text style={[styles.section,{color:c.text}]}>Relatos da comunidade · simulação</Text><Text style={[styles.body,{color:c.muted}]}>Comparamos embarque e destino em até 1 km. Isso não identifica o ponto exato do problema nem comprova que ele continua no local.</Text>{reports?.map((report,index)=><Text key={`${report.createdAt}-${index}`} style={[styles.body,{color:c.muted}]}>{feedbackOptions.find(option=>option.value===report.category)?.label} · {new Date(report.createdAt).toLocaleString('pt-BR')}</Text>)}
        <Text style={[styles.body,{color:c.muted}]}>Oferta, valor, avaliação e movimento do motorista são simulados. Os dados de contexto vêm do backend real do SafeRide.</Text>
      </ScrollView>
    </View></View></Modal>
  </SimulationMotion>;
}
export default memo(SimulationContext);
const styles = StyleSheet.create({
  floating: { position:'absolute', left:14, right:14, backgroundColor:'#172b32f5', borderColor:'#57858b', borderWidth:1, borderRadius:18, boxShadow:'0 5px 20px #0005', overflow:'hidden' },
  header:{ flexDirection:'row', alignItems:'center', paddingHorizontal:12 }, brand:{ color:'#d6fff3',fontWeight:'800',fontSize:15 }, subtitle:{ fontSize:10,color:'#abc6c8',fontWeight:'500' }, toggle:{ width:40,height:40,alignItems:'center',justifyContent:'center' },
  location:{fontSize:10,paddingHorizontal:14,marginBottom:7},footer:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingVertical:5,borderTopWidth:1},grid:{ flexDirection:'row',paddingBottom:12,paddingHorizontal:8 },cell:{flex:1,paddingHorizontal:6,borderRightWidth:0},label:{fontSize:10,fontWeight:'600'},value:{color:'#fff',fontWeight:'700',fontSize:13,marginTop:5},caption:{fontSize:11,color:'#bccbd0',marginTop:3},
  badge:{alignSelf:'flex-start',paddingHorizontal:6,paddingVertical:2,borderRadius:5},
  scrim:{flex:1,backgroundColor:'#000a',justifyContent:'center',alignItems:'center',padding:20},detail:{backgroundColor:'#20252c',padding:12,borderRadius:20,maxWidth:460,width:'100%',maxHeight:'85%'},body:{color:'#c9d0d7',fontSize:14,lineHeight:21,marginVertical:8},section:{color:'white',fontWeight:'700',fontSize:16,marginTop:14},link:{color:'#8be6cb',paddingVertical:8},
});
