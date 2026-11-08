import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSimulationTheme } from '../lib/simulationTheme';
import SimulationMotion, { useReducedMotion } from './SimulationMotion';
import type { MapData } from "./mapHtml";

import { createRideId, saveRide, Ride } from '../lib/rideHistory';
import SimulationContext from '../components/SimulationContext';
import routeSamples from '../lib/simulation-routes.json';
import { offers, legProgress, simulationDriver, simulationReducer, SimulationPhase, OFFER_SECONDS } from '../lib/simulation';



const money = (value: number) => value.toLocaleString('pt-BR', { style:'currency',currency:'BRL' });
const km = (value: number) => (value/1000).toLocaleString('pt-BR',{maximumFractionDigits:1});
function Person({ color = 'white' }: Readonly<{color?: string}>) { return <Svg width={19} height={19} viewBox="0 0 24 24" fill={color}><Circle cx={12} cy={7} r={4}/><Path d="M4 21v-3a8 8 0 0116 0v3z"/></Svg>; }

type SimulationProps = Readonly<{ onExit: () => void; onMapData: (data: MapData) => void; height: number; autoStart?: boolean }>;
function useSimulationController({ onExit, onMapData, height, autoStart = false }: SimulationProps) {
  const inset = useSafeAreaInsets();
  const { palette: c } = useSimulationTheme();
  const reducedMotion = useReducedMotion();
  const [{phase,elapsed,offerIndex:index=0},dispatch] = useReducer(simulationReducer,{phase:autoStart?'intro':'idle',elapsed:0,offerIndex:0});
  const [paused,setPaused] = useState(false);
  const [focused,setFocused] = useState(false);
  const [foreground,setForeground] = useState(AppState.currentState === 'active');
  const [sound,setSound] = useState(true);
  const [saving,setSaving] = useState(false);
  const [saveNotice,setSaveNotice] = useState('');
  const [completionError,setCompletionError] = useState(false);
  const [completionAttempt,retryCompletion] = useReducer((value:number)=>value+1,0);
  const accepting = useRef(false);
  const rideId = useRef<string|null>(null);
  const acceptedAt = useRef('');
  const checkpoint = useRef('');
  const [audioError,setAudioError] = useState('');
  const player = useAudioPlayer(require('../../assets/ride-chime.wav'));
  const audioStatus = useAudioPlayerStatus(player);
  const announced = useRef(false);
  const offer = offers[index];
  const current = routeSamples.routes[index];
  const active = focused && foreground;
  const moving = phase === 'pickup' || phase === 'trip';
  const introVisible = phase === 'intro' || phase === 'idle';
  const waiting = phase === 'searching' || introVisible;
  const offering = phase === 'offer' || phase === 'accepting';
  const cardHeight = offering ? Math.min(380,height*0.51) : Math.min(250,height*0.38);
  useEffect(() => {
    if (phase !== 'offer') { announced.current = false; return; }
    if (!active || !sound || !audioStatus.isLoaded || announced.current) return;
    announced.current = true;
    void player.seekTo(0).then(() => player.play()).catch(() => setAudioError('Som indisponível neste dispositivo.'));
  }, [phase,active,sound,audioStatus.isLoaded,player]);
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); }; },[]));
  useEffect(() => { const listener=AppState.addEventListener('change',value=>setForeground(value==='active'));return ()=>listener.remove(); },[]);
  useEffect(() => { if(!active || !sound || phase!=='offer')player.pause(); },[active,sound,phase,player]);
  useEffect(() => {
    if(!active || paused || saving || !(phase==='intro'||phase==='searching'||phase==='offer'||moving))return;
    const timer=setInterval(()=>dispatch({type:'tick'}),250);
    return ()=>clearInterval(timer);
  },[active,paused,saving,phase,moving]);
  function snapshot(id:string,status:Ride['status']):Ride {
    const { pickup: pickupFraction, trip: tripFraction } = legProgress(phase, elapsed);
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
    if(!rideId.current||!(phase==='pickup'||phase==='trip'))return;
    const key=phase+':'+Math.floor(elapsed/4);
    if(checkpoint.current===key)return;
    checkpoint.current=key;
    const id=rideId.current;
    void saveRide(latestSnapshot.current(id,'IN_PROGRESS'))
      .then(saved=>{if(rideId.current===id)setSaveNotice(saved?'Corrida salva no histórico':'Salva neste dispositivo · envio pendente');})
      .catch(()=>{if(rideId.current===id)setSaveNotice('Falha ao salvar. Mantenha a simulação aberta e tente novamente.');});
  },[phase,elapsed]);
  useEffect(()=>{
    if(phase!=='done'||!rideId.current)return;
    let current=true;
    const id=rideId.current;
    void saveRide(latestSnapshot.current(id,'COMPLETED')).then(saved=>{
      if(!current||rideId.current!==id)return;
      rideId.current=null;checkpoint.current='';
      setSaveNotice(saved?'Viagem concluída e salva no histórico':'Viagem salva no dispositivo · envio pendente');
      setCompletionError(false);setAudioError('');dispatch({type:'next'});
    }).catch(()=>{if(current){setCompletionError(true);setSaveNotice('Não foi possível salvar a conclusão. Tente novamente para continuar.');}});
    return()=>{current=false;};
  },[phase,completionAttempt]);
  async function accept() {
    if(saving||accepting.current||phase!=='offer')return;
    accepting.current=true;dispatch({type:'phase',phase:'accepting'});
    setSaving(true);setSaveNotice('Salvando corrida…');
    try {
      const id=await createRideId();acceptedAt.current=new Date().toISOString();
      const saved=await saveRide(snapshot(id,'IN_PROGRESS'));rideId.current=id;checkpoint.current='';
      setSaveNotice(saved?'Corrida salva no histórico':'Salva neste dispositivo · envio pendente');
      dispatch({type:'phase',phase:'pickup'});setPaused(false);
    } catch {setSaveNotice('Não foi possível iniciar o registro. Verifique a conexão e tente aceitar novamente.');dispatch({type:'phase',phase:'offer'});}
    finally{accepting.current=false;setSaving(false);}
  }
  async function changePhase(next:SimulationPhase) {
    if(saving)return;
    if(next==='declined'){
      if(rideId.current&&moving){
        setSaving(true);setPaused(true);
        try {
          const saved=await saveRide(snapshot(rideId.current,'CANCELLED'));
          setSaveNotice(saved?'Cancelamento salvo no histórico':'Cancelamento salvo localmente · envio pendente');
        } catch {setSaveNotice('Não foi possível salvar o cancelamento. Tente novamente.');setSaving(false);return;}
        rideId.current=null;checkpoint.current='';setSaving(false);
      } else setSaveNotice('');
      setPaused(false);setAudioError('');dispatch({type:'next'});return;
    }
    dispatch({type:'phase',phase:next});setPaused(false);
  }
  async function exitSimulation() {
    if (saving) return;
    if (moving && rideId.current) {
      setSaving(true);
      setPaused(true);
      try {
        await saveRide(snapshot(rideId.current, 'CANCELLED'));
        rideId.current = null;
      } catch {
        setSaveNotice('Não foi possível salvar o cancelamento. Tente encerrar novamente.');
        return;
      } finally {
        setSaving(false);
      }
    }
    onExit();
  }

  function start() { setAudioError(''); void changePhase('intro'); }
  const route = useMemo(()=>[...current.pickup.geometry.coordinates,...current.trip.geometry.coordinates],[current]);
  const driver = useMemo(() => simulationDriver(phase, elapsed, offer, current), [phase,elapsed,offer,current]);
  const minutes = Math.ceil((current.pickup.duration+current.trip.duration)/60);
  const distance = current.pickup.distance+current.trip.distance;
  const top = Math.max(inset.top,10);
  const prepareCamera = (phase === 'intro' && elapsed >= 3) || phase === 'searching';
  const offerHeight = Math.min(380,height*0.51);
  const mapData = useMemo(()=>({ simulation:true,simulationPreview:prepareCamera?route:null,reduceMotion:reducedMotion!==false,reports:[],origin:waiting?null:offer.pickup,destination:waiting?null:offer.destination,selected:null,route:waiting?null:route,approachRoute:waiting?undefined:current.pickup.geometry.coordinates,driver:waiting?null:driver,bottomInset:(waiting?offerHeight:cardHeight)+26,topInset:top+170 }),[offer,current,route,driver,waiting,prepareCamera,reducedMotion,cardHeight,offerHeight,top]);
  useEffect(() => { onMapData(mapData); }, [mapData,onMapData]);
  const compact = height < 720;
  const finished = phase === 'done' || phase === 'declined' || phase === 'expired';
  return { c, reducedMotion, phase, elapsed, index, paused, setPaused, sound, setSound, saving, saveNotice, completionError, setCompletionError, retryCompletion, audioError, offer, current, active, moving, introVisible, waiting, offering, cardHeight, accept, changePhase, exitSimulation, start, minutes, distance, top, compact, finished };
}
type SimulationModel = ReturnType<typeof useSimulationController>;
type PanelProps = Readonly<{ model: SimulationModel }>;

export default function RideSimulation(props: SimulationProps) {
  const model = useSimulationController(props);
  const { c, reducedMotion, introVisible, top, sound, setSound, saving, exitSimulation, index, offer, active, waiting, finished } = model;
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill,{alignItems:'center'}]}>
    <SimulationMotion visible={introVisible} reducedMotion={reducedMotion} duration={380} style={StyleSheet.absoluteFill}><View style={[StyleSheet.absoluteFill,{backgroundColor:c.surface+'f2'}]}/></SimulationMotion>
    <View pointerEvents="box-none" style={{flex:1,width:'100%',maxWidth:520}}>
    <View style={[s.toolbar,{top}]}>
      <View style={[s.mode,{backgroundColor:c.surface,borderColor:c.border}]}><View style={s.dot}/><Text style={[s.modeText,{color:c.text}]}>SIMULAÇÃO</Text></View>
      <View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={sound?'Silenciar ofertas':'Ativar som das ofertas'} onPress={()=>setSound(value=>!value)} style={[s.tool,{backgroundColor:c.surface}]}><Text style={{color:c.text,fontSize:13}}>{sound?'♪ Som':'♪ Mudo'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Encerrar simulação" disabled={saving} onPress={exitSimulation} style={[s.tool,{backgroundColor:c.surface}]}><Text style={{color:c.text,fontSize:22}}>×</Text></Pressable>
      </View>
    </View>
    <SimulationContext key={index} offer={offer} top={top+52} active={active} visible={!waiting&&!finished} reducedMotion={reducedMotion}/>
    <IntroPanel model={model}/>
    <SearchPanel model={model}/>
    <OfferPanel model={model}/>
  </View></View>;
}
function stageHeading(phase: SimulationPhase) {
  if (phase === 'offer' || phase === 'accepting') return 'NOVA SOLICITAÇÃO';
  if (phase === 'pickup') return 'A CAMINHO DO PASSAGEIRO';
  if (phase === 'trip') return 'VIAGEM EM ANDAMENTO';
  return 'RESUMO DA SIMULAÇÃO';
}
function stageTitle(phase: SimulationPhase, passenger: string) {
  if (phase === 'pickup' || phase === 'trip') return passenger;
  if (phase === 'done') return 'Viagem concluída';
  if (phase === 'expired') return 'A oferta expirou';
  return 'Corrida encerrada';
}
function stageAddress({phase,offer,distance}: SimulationModel) {
  if (phase === 'pickup') return offer.pickup.name;
  if (phase === 'trip') return offer.destination.name;
  const summary = phase === 'done' ? km(distance)+' km percorridos' : 'Você pode receber outra oferta';
  return `${money(offer.fare)} · ${summary}`;
}

function IntroPanel({model}: PanelProps) {
  const { c, introVisible, reducedMotion, top, phase, elapsed, start } = model;
  return <SimulationMotion visible={introVisible} reducedMotion={reducedMotion} fromY={54} duration={650} style={[s.intro,{top:top+64}]} testID="simulation-intro">
    <ScrollView contentContainerStyle={s.introContent} showsVerticalScrollIndicator={false}>
      <View style={[s.radar,{borderColor:c.border}]}><View style={[s.radarInner,{backgroundColor:c.accentSurface}]}><Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.5}><Path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6"/></Svg></View></View>
      <Text style={[s.introBrand,{color:c.text}]}>Safe<Text style={{color:c.accent}}>Ride</Text></Text>
      <Text style={[s.introTitle,{color:c.text}]}>Mais informação.{'\n'}Melhores decisões.</Text>
      <View style={s.introTopics}>{[
        {label:'Segurança',path:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z',color:c.blue},
        {label:'Pavimento',path:'M7 3L3 21M17 3l4 18M12 3v4m0 4v3m0 4v3',color:c.orange},
        {label:'Trânsito',path:'M4 7h13l-3-3m3 3l-3 3M20 17H7l3-3m-3 3l3 3',color:c.violet},
      ].map(topic=><View key={topic.label} style={s.introTopic}><Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={topic.color} strokeWidth={1.6}><Path d={topic.path}/></Svg><Text style={{fontSize:11,color:c.muted}}>{topic.label}</Text></View>)}</View>
      <View style={[s.searchStatus,{borderColor:c.border,backgroundColor:c.surface}]}>
        <View style={[s.row,{justifyContent:'center'}]}><View style={s.dot}/><Text style={[s.searchTitle,{color:c.text}]}>Preparando sua experiência</Text></View>
        <Text style={[s.searchCaption,{color:c.muted}]}>Em seguida, vamos buscar uma corrida.</Text>
        {phase==='idle'?<Pressable accessibilityRole="button" onPress={start} style={s.accept}><Text style={s.acceptText}>Começar simulação</Text></Pressable>:<View accessibilityRole="progressbar" accessibilityLabel="Apresentação do SafeRide" accessibilityValue={{min:0,max:5,now:phase==='intro'?elapsed:5}} style={[s.progress,{backgroundColor:c.inset}]}><View style={[s.progressFill,{backgroundColor:c.accent,width:`${phase==='intro'?elapsed/5*100:100}%`}]}/></View>}
      </View>
      <Text style={[s.footnote,{color:c.muted,marginTop:18}]}>MODO SIMULAÇÃO{'\n'}Passageiros fictícios · contexto de bases públicas</Text>
    </ScrollView></SimulationMotion>;
}

function SearchPanel({model}: PanelProps) {
  const { c, phase, elapsed, reducedMotion, saveNotice } = model;
  return <SimulationMotion visible={phase==='searching'} reducedMotion={reducedMotion} fromY={50} duration={480} testID="simulation-search" style={[s.searchingPanel,{backgroundColor:c.surface,borderColor:c.border}]}>
      <View style={s.row}><View style={s.dot}/><Text style={[s.eyebrow,{color:c.accent}]}>VOCÊ ESTÁ ONLINE</Text></View>
      <Text accessibilityLiveRegion="polite" style={[s.stageTitle,{color:c.text,marginTop:12}]}>Buscando uma corrida próxima…</Text>
      <Text style={[s.searchCaption,{color:c.muted,marginVertical:16}]}>Uma oferta simulada chega em {phase==='searching'?Math.max(1,Math.ceil(5-elapsed)):0}s</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Buscando corrida simulada" accessibilityValue={{min:0,max:5,now:phase==='searching'?elapsed:5}} style={[s.progress,{backgroundColor:c.inset}]}><View style={[s.progressFill,{width:`${phase==='searching'?elapsed/5*100:100}%`}]}/></View>
    {saveNotice?<Text style={[s.footnote,{color:c.muted,marginTop:12}]}>{saveNotice}</Text>:null}
    </SimulationMotion>;
}

function OfferPanel({model}: PanelProps) {
  const { c, waiting, reducedMotion, cardHeight, offering, phase, offer, audioError, saveNotice } = model;
  return <SimulationMotion visible={!waiting} reducedMotion={reducedMotion} fromY={110} duration={650} delay={160} testID="simulation-offer" style={[s.offer,{height:cardHeight,backgroundColor:c.surface,borderColor:c.border}]}>
      <View style={[s.handle,{backgroundColor:c.border}]}/>
      <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingBottom:4}} showsVerticalScrollIndicator={false}>
        <View style={[s.row,{justifyContent:'space-between',marginBottom:5}]}><Text style={[s.eyebrow,{color:c.accent}]}>{stageHeading(phase)}</Text><Text style={{color:c.muted,fontSize:12}}>{offer.category}</Text></View>
        {offering ? <OfferDetails model={model}/> : <TripDetails model={model}/>}
        {audioError?<Text style={{color:c.orange,fontSize:12,marginTop:6}}>{audioError}</Text>:null}
      </ScrollView>
      <View style={[s.actions,{borderTopColor:c.border}]}>
        <RideActions model={model}/>
        {saveNotice?<Text accessibilityLiveRegion="polite" style={[s.footnote,{color:c.accent}]}>{saveNotice}</Text>:<Text style={[s.footnote,{color:c.muted}]}>Oferta fictícia · estimativa de percurso sem trânsito</Text>}
      </View>
    </SimulationMotion>;
}

function OfferDetails({model}: PanelProps) {
  const { c, offer, distance, minutes, compact, current } = model;
  return <>
          <View style={[s.row,{alignItems:'baseline'}]}><Text style={[s.fare,{color:c.text,fontSize:compact?32:40}]}>{money(offer.fare)}</Text><View style={{flex:1}}/><Text style={[s.rate,{color:c.accent,backgroundColor:c.accentSurface}]}>{money(offer.fare/((distance??1)/1000))}/km</Text></View>
          <Text style={[s.summary,{color:c.muted}]}>{minutes} min · {km(distance??0)} km · {offer.passenger.split(' ')[0]} ★ {offer.rating}</Text>
          <View style={[s.divider,{backgroundColor:c.border}]}/>
          <View style={s.stop}><View style={[s.marker,{backgroundColor:'#1878c9'}]}><Person/></View><View style={{flex:1}}><Text style={[s.stopLabel,{color:c.blue}]}>EMBARQUE · {Math.ceil(current.pickup.duration/60)} min · {km(current.pickup.distance)} km</Text><Text style={[s.address,{color:c.text}]} numberOfLines={2}>{offer.pickup.name}</Text></View></View>
          <View style={s.stop}><View style={[s.marker,{backgroundColor:c.inset}]}><Text style={{color:c.text}}>■</Text></View><View style={{flex:1}}><Text style={[s.stopLabel,{color:c.muted}]}>DESTINO · {Math.ceil(current.trip.duration/60)} min · {km(current.trip.distance)} km</Text><Text style={[s.address,{color:c.text}]} numberOfLines={2}>{offer.destination.name}</Text></View></View>
</>;
}

function TripDetails({model}: PanelProps) {
  const { c, phase, offer, moving, paused } = model;
  return <>
          <Text style={[s.stageTitle,{color:c.text}]}>{stageTitle(phase,offer.passenger)}</Text>
          <Text style={[s.address,{color:c.muted}]} numberOfLines={2}>{stageAddress(model)}</Text>
          {moving?<Text style={[s.passenger,{color:c.accent}]}>{paused?'Simulação pausada':'Movimento automático · velocidade de demonstração'}</Text>:null}
</>;
}

function RideActions({model}: PanelProps) {
  const { c, offering, elapsed, saving, changePhase, accept, moving, phase, paused, setPaused, completionError, setCompletionError, retryCompletion } = model;
  if (offering) return <>
          <View style={[s.progress,{backgroundColor:c.inset}]}><View style={[s.progressFill,{width:`${Math.max(0,100-elapsed/OFFER_SECONDS*100)}%`}]}/></View>
          <View style={s.row}><Pressable accessibilityRole="button" accessibilityLabel="Recusar corrida" disabled={saving} onPress={()=>changePhase('declined')} style={[s.secondary,{borderColor:c.border}]}><Text style={{color:c.text,fontWeight:'600'}}>Recusar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Aceitar corrida simulada" disabled={saving} onPress={accept} style={[s.accept,{flex:1,opacity:saving ? 0.6 : 1}]}><Text style={s.acceptText}>{saving?'Salvando…':'Aceitar corrida'} {saving?null:<Text style={{fontSize:12}}>· {Math.max(0,OFFER_SECONDS-Math.floor(elapsed))}s</Text>}</Text></Pressable></View>
</>;
  if (moving) return <>
          <View style={[s.progress,{backgroundColor:c.inset}]}><View style={[s.progressFill,{width:`${Math.min(100,elapsed/(phase==='pickup'?14:28)*100)}%`}]}/></View>
          <View style={s.row}><Pressable accessibilityRole="button" disabled={saving} onPress={()=>setPaused(value=>!value)} style={[s.accept,{flex:1}]}><Text style={s.acceptText}>{paused?'Continuar viagem':'Pausar'}</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={()=>changePhase('declined')} style={[s.secondary,{borderColor:c.border}]}><Text style={{color:c.text}}>Cancelar</Text></Pressable></View>
</>;
  if (completionError) return <Pressable accessibilityRole="button" onPress={()=>{setCompletionError(false);retryCompletion();}} style={s.accept}><Text style={s.acceptText}>Salvar e continuar</Text></Pressable>;
  return <Text style={[s.searchCaption,{color:c.muted}]}>Salvando a viagem para buscar a próxima…</Text>;
}

const s=StyleSheet.create({
  searchingPanel:{position:'absolute',left:16,right:16,bottom:20,padding:24,borderRadius:24,borderWidth:1,boxShadow:'0 8px 26px #0003'},
  toolbar:{position:'absolute',left:14,right:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  row:{flexDirection:'row',alignItems:'center',gap:8},mode:{borderWidth:1,borderRadius:22,paddingHorizontal:12,height:40,flexDirection:'row',alignItems:'center',gap:7},modeText:{fontSize:10,fontWeight:'800',letterSpacing:1.1},dot:{width:7,height:7,borderRadius:4,backgroundColor:'#39c6a1'},tool:{minWidth:44,height:40,borderRadius:20,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},
  intro:{position:'absolute',bottom:12,left:24,right:24},introContent:{flexGrow:1,justifyContent:'center',paddingVertical:16},radar:{width:112,height:112,borderRadius:56,borderWidth:1,alignSelf:'center',alignItems:'center',justifyContent:'center',marginBottom:16},radarInner:{width:86,height:86,borderRadius:43,alignItems:'center',justifyContent:'center'},introBrand:{fontSize:44,fontWeight:'800',letterSpacing:-1.8,textAlign:'center'},eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:1.1},introTitle:{fontSize:21,lineHeight:28,fontWeight:'600',marginTop:10,letterSpacing:-.3,textAlign:'center'},introTopics:{flexDirection:'row',justifyContent:'center',gap:26,marginVertical:26},introTopic:{alignItems:'center',gap:7},searchStatus:{padding:17,borderRadius:20,borderWidth:1,gap:11},searchTitle:{fontSize:13,fontWeight:'700'},searchCaption:{fontSize:12,textAlign:'center'},
  offer:{position:'absolute',bottom:10,left:12,right:12,borderRadius:25,borderWidth:1,overflow:'hidden',boxShadow:'0 10px 32px #0004'},handle:{height:4,width:34,borderRadius:3,alignSelf:'center',marginTop:8,marginBottom:9},fare:{fontWeight:'800',letterSpacing:-1.3},rate:{fontSize:11,fontWeight:'700',paddingHorizontal:8,paddingVertical:6,borderRadius:8},summary:{fontSize:13,marginTop:3},divider:{height:1,marginVertical:9},stop:{flexDirection:'row',gap:9,marginBottom:8},marker:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center'},stopLabel:{fontSize:9,fontWeight:'700',letterSpacing:.4},address:{fontSize:13,lineHeight:17,marginTop:3,fontWeight:'500'},passenger:{fontSize:11,marginTop:5},stageTitle:{fontSize:22,fontWeight:'800',letterSpacing:-.5},actions:{paddingHorizontal:14,paddingVertical:9,borderTopWidth:1,gap:7},accept:{backgroundColor:'#087f71',borderRadius:14,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:12,paddingVertical:10},acceptText:{color:'white',fontSize:16,fontWeight:'700'},secondary:{minHeight:48,borderWidth:1,borderRadius:14,paddingHorizontal:15,alignItems:'center',justifyContent:'center'},footnote:{fontSize:9,lineHeight:13,textAlign:'center',marginTop:4},progress:{height:3,borderRadius:3,overflow:'hidden'},progressFill:{height:3,backgroundColor:'#36bca0'},
});
