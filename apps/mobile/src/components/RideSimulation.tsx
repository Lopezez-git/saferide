import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MapData } from "./mapHtml";

import { createRideId, saveRide, Ride } from '../lib/rideHistory';
import SimulationContext from '../components/SimulationContext';
import routeSamples from '../lib/simulation-routes.json';
import { offers, pointAlong, simulationReducer, SimulationPhase } from '../lib/simulation';



const money = (value: number) => value.toLocaleString('pt-BR', { style:'currency',currency:'BRL' });
const km = (value: number) => (value/1000).toLocaleString('pt-BR',{maximumFractionDigits:1});
function Person({ color = 'white' }: {color?: string}) { return <Svg width={19} height={19} viewBox="0 0 24 24" fill={color}><Circle cx={12} cy={7} r={4}/><Path d="M4 21v-3a8 8 0 0116 0v3z"/></Svg>; }

export default function RideSimulation({ onExit, onMapData, height, autoStart = false }: { onExit: () => void; onMapData: (data: MapData) => void; height: number; autoStart?: boolean }) {
  const inset = useSafeAreaInsets();
  const cardHeight = Math.min(500,height*0.57);
  const [index,setIndex] = useState(0);
  const [{phase,elapsed},dispatch] = useReducer(simulationReducer,{phase:autoStart?'offer':'idle',elapsed:0});
  const [paused,setPaused] = useState(false);
  const [focused,setFocused] = useState(false);
  const [foreground,setForeground] = useState(AppState.currentState === 'active');
  const [sound,setSound] = useState(true);
  const [saving,setSaving] = useState(false);
  const [saveNotice,setSaveNotice] = useState('');
  const rideId = useRef<string|null>(null);
  const acceptedAt = useRef('');
  const checkpoint = useRef('');
  const [audioError,setAudioError] = useState('');
  const player = useAudioPlayer(require('../../assets/ride-chime.wav'));
  const audioStatus = useAudioPlayerStatus(player);
  const announced = useRef(false);
  useEffect(() => {
    if (!autoStart || !audioStatus.isLoaded || announced.current) return;
    announced.current = true;
    try { player.play(); } catch { /* Sound toggle remains available. */ }
  }, [autoStart,audioStatus.isLoaded,player]);
  const offer = offers[index];
  const current = routeSamples.routes[index];
  const active = focused && foreground;
  const moving = phase === 'pickup' || phase === 'trip';
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); }; },[]));
  useEffect(() => { const listener=AppState.addEventListener('change',value=>setForeground(value==='active'));return ()=>listener.remove(); },[]);
  useEffect(() => { if(!active || !sound || phase!=='offer')player.pause(); },[active,sound,phase,player]);
  useEffect(() => {
    if(!active || paused || saving || !(phase==='offer'||moving))return;
    const timer=setInterval(()=>dispatch({type:'tick'}),250);
    return ()=>clearInterval(timer);
  },[active,paused,saving,phase,moving]);
  function snapshot(id:string,status:Ride['status']):Ride {
    const pickupFraction = phase==='pickup'?Math.min(1,elapsed/14):phase==='trip'||phase==='done'?1:0;
    const tripFraction = phase==='trip'?Math.min(1,elapsed/28):phase==='done'?1:0;
    return {id,passenger:offer.passenger,origin:offer.pickup.name,destination:offer.destination.name,
      originLat:offer.pickup.latitude,originLon:offer.pickup.longitude,destinationLat:offer.destination.latitude,destinationLon:offer.destination.longitude,
      fare:offer.fare,plannedDistanceMeters:Math.round(current.pickup.distance+current.trip.distance),
      distanceMeters:Math.round(current.pickup.distance*pickupFraction+current.trip.distance*tripFraction),
      simulatedSeconds:Math.round(current.pickup.duration*pickupFraction+current.trip.duration*tripFraction),
      activeSeconds:Math.floor(14*pickupFraction+28*tripFraction),status,createdAt:acceptedAt.current,
      finishedAt:status==='IN_PROGRESS'?null:new Date().toISOString()};
  }
  const latestSnapshot=useRef(snapshot);
  useEffect(()=>{latestSnapshot.current=snapshot;});
  useEffect(()=>{
    if(!rideId.current||!(phase==='pickup'||phase==='trip'||phase==='done'))return;
    const key=phase+':'+Math.floor(elapsed/4);
    if(checkpoint.current===key)return;
    checkpoint.current=key;
    void saveRide(latestSnapshot.current(rideId.current,phase==='done'?'COMPLETED':'IN_PROGRESS'))
      .then(saved=>setSaveNotice(saved?'Corrida salva no histórico':'Salva neste dispositivo · envio pendente'))
      .catch(()=>setSaveNotice('Falha ao salvar. Mantenha a simulação aberta e tente novamente.'));
  },[phase,elapsed]);
  async function accept() {
    if(saving)return;
    setSaving(true);setSaveNotice('Salvando corrida…');
    try {
      const id=await createRideId();acceptedAt.current=new Date().toISOString();
      const saved=await saveRide(snapshot(id,'IN_PROGRESS'));rideId.current=id;checkpoint.current='';
      setSaveNotice(saved?'Corrida salva no histórico':'Salva neste dispositivo · envio pendente');
      dispatch({type:'phase',phase:'pickup'});setPaused(false);
    } catch {setSaveNotice('Não foi possível iniciar o registro. Verifique a conexão e tente aceitar novamente.');}
    finally{setSaving(false);}
  }
  function changePhase(next:SimulationPhase) {
    if(saving)return;
    if(next==='declined'&&rideId.current&&moving){void saveRide(snapshot(rideId.current,'CANCELLED')).then(saved=>setSaveNotice(saved?'Cancelamento salvo no histórico':'Cancelamento salvo localmente · envio pendente'));rideId.current=null;}
    dispatch({type:'phase',phase:next});setPaused(false);
  }
  function exitSimulation(){if(saving)return;if(moving&&rideId.current){void saveRide(snapshot(rideId.current,'CANCELLED'));rideId.current=null;}onExit();}

  function ring() {
    setAudioError('');
    if(!sound)return;
    try { player.seekTo(0).catch(()=>{});player.play(); } catch { setAudioError('Som indisponível neste dispositivo.'); }
  }
  function start() { ring();changePhase('offer'); }
  function next() { rideId.current=null;checkpoint.current='';setSaveNotice('');setIndex(value=>(value+1)%offers.length);changePhase('idle'); }
  const route = useMemo(()=>current ? [...current.pickup.geometry.coordinates,...current.trip.geometry.coordinates] : null,[current]);
  const driver = useMemo(() => current && moving ? pointAlong(phase==='pickup'?current.pickup.geometry.coordinates:current.trip.geometry.coordinates,elapsed/(phase==='pickup'?14:28)) : phase==='done'?offer.destination:offer.driver,[current,moving,phase,elapsed,offer]);
  const minutes = current ? Math.ceil((current.pickup.duration+current.trip.duration)/60) : null;
  const distance = current ? current.pickup.distance+current.trip.distance : null;
  const cardVisible = phase!=='idle';
  const top = Math.max(inset.top,10);
  const mapData = useMemo(()=>({ simulation:true,reports:[],origin:offer.pickup,destination:offer.destination,selected:null,route,approachRoute:current.pickup.geometry.coordinates,driver,bottomInset:cardVisible?cardHeight+26:210,topInset:top+170 }),[offer,current,route,driver,cardVisible,cardHeight,top]);
  useEffect(() => { onMapData(mapData); }, [mapData,onMapData]);
  const small = height<950;
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill,{alignItems:'center'}]}><View pointerEvents="box-none" style={{flex:1,width:'100%',maxWidth:520}}>
    <View style={[s.toolbar,{top}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Encerrar simulação" disabled={saving} onPress={exitSimulation} style={s.demo}><Text style={s.demoText}>× ENCERRAR SIMULAÇÃO</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={sound?'Silenciar ofertas':'Ativar som das ofertas'} onPress={()=>setSound(value=>!value)} style={s.sound}><Text style={s.soundText}>{sound?'♪ Som ligado':'♪ Sem som'}</Text></Pressable>
    </View>
    <SimulationContext offer={offer} top={top+44} active={active}/>
    {phase==='idle' ? <View style={s.welcome}>
      <Text style={s.welcomeTitle}>Uma oferta. Mais contexto.</Text>
      <Text style={s.description}>Receba uma corrida de demonstração e veja o SafeRide avaliar o destino.</Text>
      <Pressable accessibilityRole="button" disabled={!current} onPress={start} style={[s.accept,!current&&s.disabled]}><Text style={s.acceptText}>{current?'Receber corrida':'Carregando percurso…'}</Text></Pressable>
      <Text style={s.footnote}>Oferta fictícia · consultas reais · São Paulo</Text>
    </View> : <View style={[s.offer,{height:cardHeight}]}>
      <ScrollView style={{flexShrink:1}} contentContainerStyle={{padding:small?13:16}} showsVerticalScrollIndicator={false}>
        <View style={s.row}><View style={s.badge}><Person color="#111"/><Text style={s.badgeText}>{offer.category}</Text></View><View style={s.exclusive}><Text style={s.exclusiveText}>Exclusivo</Text></View><View style={{flex:1}}/>
          <Pressable accessibilityRole="button" accessibilityLabel={phase==='offer'?'Recusar corrida':'Encerrar corrida simulada'} onPress={()=>changePhase('declined')} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
        </View>
        <Text style={[s.fare,{fontSize:small?40:48}]}>{money(offer.fare)}</Text>
        <Text style={s.summary}>{minutes ?? '—'} min · {distance?km(distance):'—'} km · Est. de {distance?money(offer.fare/(distance/1000)):'—'}/km</Text>
        <View style={s.divider}/>
        <View style={s.stop}><View style={s.timeline}><View style={s.pickup}><Person/></View><View style={s.line}/></View><View style={s.stopText}>
          <Text style={{color:"#79bcff",fontSize:10,marginBottom:3}}>ATÉ O CLIENTE · {offer.passenger}</Text><Text style={[s.duration,{fontSize:small?19:22}]}>{current?Math.ceil(current.pickup.duration/60):'—'} min · {current?km(current.pickup.distance):'—'} km</Text>
          <Text style={s.address} numberOfLines={2}>{offer.pickup.name}</Text><View style={s.rating}><Text style={s.ratingText}>★ {offer.rating} ({offer.reviews})</Text></View>
        </View></View>
        <View style={s.stop}><View style={s.destination}><Text style={{fontSize:21,color:'#181818'}}>▪</Text></View><View style={s.stopText}><Text style={{color:"#cbd1d8",fontSize:10,marginBottom:3}}>VIAGEM DO CLIENTE</Text><Text style={[s.duration,{fontSize:small?19:22}]}>{current?Math.ceil(current.trip.duration/60):'—'} minutos · {current?km(current.trip.distance):'—'} km</Text><Text style={s.address} numberOfLines={2}>{offer.destination.name}</Text></View></View>
        {audioError?<Text style={s.error}>{audioError}</Text>:null}
      </ScrollView>
      <View style={s.actions}>
        {saveNotice?<Text style={{color:"#c2e5d9",fontSize:11,textAlign:"center"}}>{saveNotice}</Text>:null}
        {phase==='offer' ? <>
          <View style={s.progress}><View style={[s.progressFill,{width:`${Math.max(0,100-elapsed/45*100)}%`}]}/></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Aceitar corrida simulada" disabled={saving} onPress={accept} style={s.accept}><Text style={s.acceptText}>{saving?'Salvando…':'Aceitar'} <Text style={{fontSize:14}}>· {Math.max(0,45-Math.floor(elapsed))} s</Text></Text></Pressable>
        </> : moving ? <>
          <Text style={s.stage}>{phase==='pickup'?'A caminho do embarque':'Em viagem ao destino'} · acelerado</Text>
          <View style={s.progress}><View style={[s.progressFill,{width:`${Math.min(100,elapsed/(phase==='pickup'?14:28)*100)}%`}]}/></View>
          <View style={s.row}><Pressable accessibilityRole="button" onPress={()=>setPaused(value=>!value)} style={[s.accept,{flex:1}]}><Text style={s.acceptText}>{paused?'Continuar':'Pausar'}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>changePhase('declined')} style={s.cancel}><Text style={{color:'#eee',fontWeight:'600'}}>Cancelar</Text></Pressable></View>
        </> : <><Text style={s.stage}>{phase==='done'?'✓ Viagem simulada concluída':phase==='expired'?'Oferta expirada':'Corrida encerrada'}</Text><Pressable accessibilityRole="button" onPress={next} style={s.accept}><Text style={s.acceptText}>Próxima corrida</Text></Pressable></>}
        <Text style={s.footnote}>Oferta fictícia · rota OSRM pré-carregada, sem trânsito</Text>
      </View>
    </View>}
  </View></View>;
}
const s=StyleSheet.create({
  background:{flex:1,backgroundColor:'#101419',alignItems:'center'},phone:{flex:1,width:'100%',maxWidth:520,overflow:'hidden'},toolbar:{position:'absolute',left:14,right:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},demo:{backgroundColor:'#222831ed',borderRadius:20,paddingHorizontal:12,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:6},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#8be6cb'},demoText:{color:'#dbe6e9',fontSize:10,fontWeight:'700',letterSpacing:1},sound:{backgroundColor:'#222831ed',borderRadius:20,padding:9},soundText:{color:'#fff',fontSize:11},
  welcome:{position:'absolute',bottom:16,left:14,right:14,backgroundColor:'#1e1f21',padding:20,borderRadius:20,borderWidth:1,borderColor:'#4e5660'},welcomeTitle:{color:'white',fontSize:23,fontWeight:'700'},description:{color:'#bdc4cc',lineHeight:20,fontSize:14,marginTop:8,marginBottom:18},
  offer:{position:'absolute',bottom:12,left:14,right:14,backgroundColor:'#1e1e1e',borderRadius:20,borderWidth:2,borderColor:'#147dcc',overflow:'hidden',boxShadow:'0 10px 40px #0007'},row:{flexDirection:'row',alignItems:'center',gap:8},badge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#e8e8e6',borderRadius:7,paddingHorizontal:10,paddingVertical:7},badgeText:{fontSize:17,fontWeight:'600',color:'#151515'},exclusive:{backgroundColor:'#102a50',paddingHorizontal:10,paddingVertical:8,borderRadius:7},exclusiveText:{color:'#4c9df3',fontSize:16,fontWeight:'600'},close:{width:43,height:43,borderRadius:10,backgroundColor:'#282828',justifyContent:'center',alignItems:'center'},closeText:{color:'#eee',fontSize:34,lineHeight:36},fare:{color:'#f7f7f7',fontWeight:'800',letterSpacing:-1,marginTop:6,marginBottom:4},summary:{color:'#d3d3d3',fontSize:15},divider:{height:1,backgroundColor:'#383838',marginVertical:13},stop:{flexDirection:'row',gap:11},timeline:{width:30,alignItems:'center'},pickup:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#0877cd'},destination:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#e7e7e5'},line:{width:4,flex:1,backgroundColor:'#a3a3a3',marginVertical:4},stopText:{flex:1,paddingBottom:10},duration:{color:'#eee',fontWeight:'700'},address:{color:'#d2d2d2',fontSize:15,lineHeight:20,marginTop:4},rating:{alignSelf:'flex-start',backgroundColor:'#343434',paddingHorizontal:9,paddingVertical:4,borderRadius:8,marginVertical:6},ratingText:{color:'#ddd',fontSize:15},actions:{padding:13,borderTopWidth:1,borderTopColor:'#393939',gap:8},accept:{backgroundColor:'#0866bb',borderRadius:10,minHeight:49,alignItems:'center',justifyContent:'center',padding:10},acceptText:{color:'white',fontSize:22,fontWeight:'600'},disabled:{opacity:0.5},footnote:{color:'#a2a7af',fontSize:9,textAlign:'center',marginTop:5},progress:{height:3,backgroundColor:'#363b42',borderRadius:3,overflow:'hidden'},progressFill:{height:3,backgroundColor:'#68b7ff'},stage:{fontSize:14,fontWeight:'600',color:'#d5ebff',textAlign:'center'},cancel:{padding:15},error:{color:'#ffbd98',fontSize:12,marginVertical:8},
});
