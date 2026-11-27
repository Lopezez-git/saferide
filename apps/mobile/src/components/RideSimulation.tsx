import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSimulationTheme } from '../lib/simulationTheme';
import SimulationMotion, { useReducedMotion } from './SimulationMotion';
import type { MapData, MapPoint } from "./mapHtml";

import { createRideId, saveRide, submitRideFeedback, type FeedbackCategory, type Ride } from '../lib/rideHistory';
import SimulationContext from '../components/SimulationContext';
import SimulationProgress from './SimulationProgress';
import RideFeedback from './RideFeedback';
import { overlay } from '../lib/overlay';
import { planOffer, routeBody, type Offer, type PlannedOffer, type Route, legProgress, simulationDriver, simulationReducer, type SimulationPhase, OFFER_SECONDS } from '../lib/simulation';
import { api, message } from '../lib/client';
import { locate } from '../lib/location';
import { inPilot } from '../lib/trafficHours';



const money = (value: number) => value.toLocaleString('pt-BR', { style:'currency',currency:'BRL' });
const km = (value: number) => (value/1000).toLocaleString('pt-BR',{maximumFractionDigits:1});
function Person({ color = 'white' }: Readonly<{color?: string}>) { return <Svg width={19} height={19} viewBox="0 0 24 24" fill={color}><Circle cx={12} cy={7} r={4}/><Path d="M4 21v-3a8 8 0 0116 0v3z"/></Svg>; }

type SimulationProps = Readonly<{ onExit: () => void; onMapData: (data: MapData) => void; height: number; }>;
type FetchOffer = (start: MapPoint, index: number, signal: AbortSignal) => Promise<PlannedOffer>;
type RoadProps = SimulationProps & { start: MapPoint; firstOffer: PlannedOffer; fetchOffer: FetchOffer };
type OfferResult = { scenario: PlannedOffer } | { error: string };

function useSimulationController({ onExit, onMapData, height, start, firstOffer, fetchOffer }: RoadProps) {
  const inset = useSafeAreaInsets();
  const { palette: c } = useSimulationTheme();
  const reducedMotion = useReducedMotion();
  const [{phase,elapsed,offerIndex:index=0},dispatch] = useReducer(simulationReducer,{phase:'intro',elapsed:0,offerIndex:0});
  const [paused,setPaused] = useState(false);
  const [focused,setFocused] = useState(false);
  const [foreground,setForeground] = useState(AppState.currentState === 'active');
  const [overlayActive,setOverlayActive] = useState(()=>overlay.running());
  const [sound,setSound] = useState(true);
  const [saving,setSaving] = useState(false);
  const [saveNotice,setSaveNotice] = useState('');
  const [completionError,setCompletionError] = useState(false);
  const [feedbackRideId,setFeedbackRideId] = useState<string|null>(null);
  const [completionAttempt,retryCompletion] = useReducer((value:number)=>value+1,0);
  const accepting = useRef(false);
  const rideId = useRef<string|null>(null);
  const acceptedAt = useRef('');
  const checkpoint = useRef('');
  const [audioError,setAudioError] = useState('');
  const player = useAudioPlayer(require('../../assets/ride-chime.wav'));
  const audioStatus = useAudioPlayerStatus(player);
  const announced = useRef(false);
  const [origin,setOrigin] = useState(start);
  const [plans,setPlans] = useState<Partial<Record<number, OfferResult>>>({0:{scenario:firstOffer}});
  const [nextDecision,setNextDecision] = useState<'open'|'reserved'|'declined'>('open');
  const plan = plans[index];
  const currentScenario = plan && 'scenario' in plan ? plan.scenario : null;
  const planError = plan && 'error' in plan ? plan.error : '';
  const {offer,route:current} = currentScenario ?? firstOffer;
  const nextPlan = plans[index+1];
  const next = nextPlan && 'scenario' in nextPlan ? nextPlan.scenario : null;
  const active = focused && (foreground || overlayActive);
  const moving = phase === 'pickup' || phase === 'boarding' || phase === 'trip';
  const planningAfterArrival = moving || phase === 'done';
  const plannedIndex = planningAfterArrival ? index + 1 : index;
  const plannedOrigin = planningAfterArrival ? offer.destination : origin;
  const canPlan = active && !plans[plannedIndex] && (!planningAfterArrival || nextDecision !== 'declined');
  const remainingSeconds = current.trip.duration * (1 - legProgress(phase,elapsed).trip);
  const nearDropoff = phase === 'trip' && !!next && remainingSeconds <= 300;
  const passengerOnboard = phase === 'boarding' || phase === 'trip';
  const introVisible = phase === 'intro' || phase === 'idle';
  const waiting = phase === 'searching' || introVisible;
  const offering = phase === 'offer' || phase === 'accepting';
  const cardHeight = offering || (nearDropoff && nextDecision==='open') ? Math.min(220,height*0.38) : Math.min(135,height*0.28);
  const [contextLayout,setContextLayout] = useState<{index:number;height:number}>();
  const [requestLayout,setRequestLayout] = useState<{index:number;height:number}>();
  const onContextLayout = useCallback(({nativeEvent}:LayoutChangeEvent) => {
    setContextLayout({index,height:Math.ceil(nativeEvent.layout.height)});
  }, [index]);
  const onRequestLayout = useCallback(({nativeEvent}:LayoutChangeEvent) => {
    setRequestLayout({index,height:Math.ceil(nativeEvent.layout.height)});
  }, [index]);
  useEffect(() => {
    if (!canPlan) return;
    const controller = new AbortController();
    function storePlan(result: OfferResult) {
      if (controller.signal.aborted) return;
      setPlans(existing => ({ [plannedIndex - 1]: existing[plannedIndex - 1], [plannedIndex]: result }));
    }
    void fetchOffer(plannedOrigin, plannedIndex, controller.signal)
      .then(scenario => storePlan({ scenario }))
      .catch(() => storePlan({ error: 'Não foi possível calcular a próxima corrida.' }));
    return () => controller.abort();
  }, [canPlan, fetchOffer, plannedIndex, plannedOrigin]);
  function retryPlan() {
    setPlans(existing => ({ ...existing, [index]: undefined }));
  }
  useEffect(() => {
    if (phase !== 'offer' && !(nearDropoff && nextDecision === 'open')) { announced.current = false; return; }
    if (!active || !sound || !audioStatus.isLoaded || announced.current) return;
    announced.current = true;
    void player.seekTo(0).then(() => player.play()).catch(() => setAudioError('Som indisponível neste dispositivo.'));
  }, [phase,nearDropoff,nextDecision,active,sound,audioStatus.isLoaded,player]);
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); }; },[]));
  useEffect(() => { const listener=AppState.addEventListener('change',value=>{setForeground(value==='active');setOverlayActive(overlay.running());});return ()=>listener.remove(); },[]);
  useEffect(() => { if(!active || !sound || (phase!=='offer' && !nearDropoff))player.pause(); },[active,sound,phase,nearDropoff,player]);
  useEffect(() => {
    if(!active || paused || saving || !currentScenario || !(phase==='intro'||phase==='searching'||phase==='offer'||moving))return;
    const timer=setInterval(()=>dispatch({type:'tick'}),250);
    return ()=>clearInterval(timer);
  },[active,paused,saving,phase,moving,currentScenario]);
  function snapshot(id:string,status:Ride['status']):Ride {
    const { pickup: pickupFraction, trip: tripFraction } = legProgress(phase, elapsed);
    return {id,passenger:offer.passenger,origin:offer.pickup.name,destination:offer.destination.name,
      originLat:offer.pickup.latitude,originLon:offer.pickup.longitude,destinationLat:offer.destination.latitude,destinationLon:offer.destination.longitude,
      fare:offer.fare,plannedDistanceMeters:Math.round(current.pickup.distance+current.trip.distance),
      distanceMeters:Math.round(current.pickup.distance*pickupFraction+current.trip.distance*tripFraction),
      simulatedSeconds:Math.round(current.pickup.duration*pickupFraction+current.trip.duration*tripFraction),
      activeSeconds:Math.floor((current.pickup.distance > 0 ? 14 : 0)*pickupFraction+28*tripFraction+boardingSeconds(phase,elapsed)),status,createdAt:acceptedAt.current,
      finishedAt:status==='IN_PROGRESS'?null:new Date().toISOString()};
  }
  const latestSnapshot=useRef(snapshot);
  useEffect(()=>{latestSnapshot.current=snapshot;});
  useEffect(()=>{
    if(!rideId.current||!(phase==='pickup'||phase==='boarding'||phase==='trip'))return;
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
      setOrigin(offer.destination);
      if(nextDecision!=='reserved') setNextDecision('open');
      setCompletionError(false);setAudioError('');setFeedbackRideId(id);setPaused(true);dispatch({type:'next',skipDeclined:nextDecision==='declined'});
    }).catch(()=>{if(current){setCompletionError(true);setSaveNotice('Não foi possível salvar a conclusão. Tente novamente para continuar.');}});
    return()=>{current=false;};
  },[phase,completionAttempt,nextDecision,offer.destination]);
  function finishFeedback() {
    setFeedbackRideId(null);
    setPaused(false);
    if(nextDecision==='reserved'){
      setNextDecision('open');
      void accept(true);
    }
  }
  async function accept(reserved = false) {
    if(!currentScenario||saving||accepting.current||(reserved ? phase!=='searching' : phase!=='offer'))return;
    accepting.current=true;dispatch({type:'phase',phase:'accepting'});
    setSaving(true);setSaveNotice('Salvando corrida…');
    try {
      const id=await createRideId();acceptedAt.current=new Date().toISOString();
      const saved=await saveRide(snapshot(id,'IN_PROGRESS'));rideId.current=id;checkpoint.current='';
      setSaveNotice(saved?'Corrida salva no histórico':'Salva neste dispositivo · envio pendente');
      dispatch({type:'phase',phase:current.pickup.distance > 0 ? 'pickup' : 'boarding'});setPaused(false);
    } catch {setSaveNotice('Não foi possível iniciar o registro. Verifique a conexão e tente aceitar novamente.');dispatch({type:'phase',phase:'offer'});}
    finally{accepting.current=false;setSaving(false);}
  }
  function declineOffer() {
    if (saving || phase !== 'offer') return;
    setSaveNotice('');
    setNextDecision('open');
    setPaused(false);
    setAudioError('');
    dispatch({type:'next'});
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

  async function notificationFeedback(category:FeedbackCategory) {
    if(!feedbackRideId)return;
    try { await submitRideFeedback(feedbackRideId,[category]);setSaveNotice('Feedback salvo no banco.'); }
    catch { setSaveNotice('Não foi possível salvar o feedback. Responda depois no histórico.'); }
    finishFeedback();
  }
  const overlayHandlers=useRef({feedback:notificationFeedback,later:finishFeedback,stopped:()=>setOverlayActive(false)});
  useEffect(()=>{overlayHandlers.current={feedback:notificationFeedback,later:finishFeedback,stopped:()=>setOverlayActive(false)};});
  useEffect(()=>{const subscription=overlay.listen(action=>{if(action==='feedback:POTHOLE')void overlayHandlers.current.feedback('POTHOLE');if(action==='feedback:BAD_ROAD')void overlayHandlers.current.feedback('BAD_ROAD');if(action==='feedback:INSECURE')void overlayHandlers.current.feedback('INSECURE');if(action==='later')overlayHandlers.current.later();if(action==='stopped')overlayHandlers.current.stopped();});return ()=>subscription?.remove();},[]);
  const overlayPhase = feedbackRideId ? 'feedback' : nearDropoff && nextDecision==='open' ? 'offer' : phase;
  useEffect(()=>{overlay.phase(overlayPhase);},[overlayPhase]);
  useEffect(()=>()=>{overlay.phase('idle');overlay.update('Inicie uma corrida simulada no SafeRide para consultar o contexto.');},[]);

  const route = useMemo(()=>[...current.pickup.geometry.coordinates,...current.trip.geometry.coordinates],[current]);
  const driver = useMemo(() => waiting ? origin : simulationDriver(phase,elapsed,offer,current), [waiting,origin,phase,elapsed,offer,current]);
  const minutes = Math.ceil((current.pickup.duration+current.trip.duration)/60);
  const distance = current.pickup.distance+current.trip.distance;
  const top = Math.max(inset.top,10);
  const contextHeight = contextLayout?.index === index ? contextLayout.height : 0;
  const requestHeight = requestLayout?.index === index ? requestLayout.height : 0;
  const showRoute = moving || (offering && contextHeight > 0 && requestHeight > 0);
  const topInset = top + 52 + (phase === 'offer' ? contextHeight + 28 : 0);
  const bottomInset = offering ? requestHeight + 48 : cardHeight + 26;
  const driverMotion = useMemo(() => {
    if (phase !== 'pickup' && phase !== 'trip') return null;
    const leg = current[phase];
    return { key: `${index}:${phase}`, coordinates: leg.geometry.coordinates, elapsed, duration: phase === 'pickup' ? 14 : 28, running: active && !paused && !saving };
  }, [phase,current,index,elapsed,active,paused,saving]);
  const visibleRoute = passengerOnboard ? current.trip.geometry.coordinates : route;
  const mapData = useMemo<MapData>(()=>({
    simulation:true,navigation:moving,driverMotion,passengerOnboard,reduceMotion:reducedMotion!==false,reports:[],
    origin:showRoute?offer.pickup:null,destination:showRoute?offer.destination:null,selected:null,route:showRoute?visibleRoute:null,
    approachRoute:showRoute&&!passengerOnboard?current.pickup.geometry.coordinates:undefined,driver,bottomInset,topInset,
  }),[offer,current,visibleRoute,driver,moving,driverMotion,passengerOnboard,showRoute,reducedMotion,bottomInset,topInset]);
  useEffect(() => { onMapData(mapData); }, [mapData,onMapData]);
  const compact = height < 720;
  return { next,nearDropoff,nextDecision,setNextDecision,remainingSeconds,c, reducedMotion, phase, elapsed, index, paused, setPaused, sound, setSound, saving, saveNotice, completionError, setCompletionError, retryCompletion, audioError, offer, current, active, moving, introVisible, waiting, offering, cardHeight, onContextLayout, onRequestLayout, accept, declineOffer, exitSimulation, minutes, distance, top, compact, feedbackRideId, finishFeedback, currentScenario, planError, retryPlan };
}
type SimulationModel = ReturnType<typeof useSimulationController>;
type PanelProps = Readonly<{ model: SimulationModel }>;

type Preparation = { status: 'locating' | 'routing' } | { status: 'failed'; error: string } | { status: 'ready'; start: MapPoint; firstOffer: PlannedOffer };

export default function RideSimulation(props: SimulationProps) {
  const [preparation, setPreparation] = useState<Preparation>({ status: 'locating' });
  const [attempt, setAttempt] = useState(0);
  const { palette: c } = useSimulationTheme();
  const nextRequestAt = useRef(0);
  const fetchOffer = useCallback<FetchOffer>((start, index, signal) => planOffer(start, index, async (from, to) => {
    const delay = nextRequestAt.current - Date.now();
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    if (signal.aborted) throw new Error('Consulta encerrada.');
    const leg = await api<Route>('/route?newsContext=true', { method: 'POST', body: routeBody(from, to), signal });
    nextRequestAt.current = Date.now() + 1150;
    if (!(leg.distance > 0 && leg.duration > 0 && leg.geometry.coordinates.length >= 2)) {
      throw new Error('Trajeto indisponível.');
    }
    return leg;
  }), []);
  useEffect(() => {
    const controller = new AbortController();
    const update = (result: Preparation) => {
      if (!controller.signal.aborted) setPreparation(result);
    };
    async function prepare() {
      let start: MapPoint;
      try { start = await locate(undefined, { fresh: true }); }
      catch (error) { update({ status: 'failed', error: message(error) }); return; }
      if (controller.signal.aborted) return;
      if (!inPilot(start)) {
        update({ status: 'failed', error: 'Sua localização está fora da região piloto de São Paulo.' });
        return;
      }
      update({ status: 'routing' });
      try {
        const firstOffer = await fetchOffer(start, 0, controller.signal);
        update({ status: 'ready', start, firstOffer });
      } catch (error) {
        update({ status: 'failed', error: message(error) });
      }
    }
    void prepare();
    return () => controller.abort();
  }, [attempt, fetchOffer]);

  if (preparation.status === 'ready') return <RoadSimulation {...props} start={preparation.start} firstOffer={preparation.firstOffer} fetchOffer={fetchOffer} />;
  const statusText = preparation.status === 'failed' ? preparation.error : preparation.status === 'routing'
    ? 'Calculando um trajeto perto de você…' : 'Obtendo sua localização atual…';
  return <View style={[StyleSheet.absoluteFill,s.preparation,{backgroundColor:c.surface}]}>
    <Text accessibilityLiveRegion="polite" style={[s.preparationStatus,{color:c.text}]}>{statusText}</Text>
    {preparation.status === 'failed' && <Pressable accessibilityRole="button" style={s.accept} onPress={() => {
      setPreparation({ status: 'locating' });
      setAttempt(value => value + 1);
    }}><Text style={s.acceptText}>Tentar novamente</Text></Pressable>}
    <Pressable accessibilityRole="button" onPress={props.onExit} style={[s.secondary,{borderColor:c.border}]}><Text style={{color:c.accent}}>Voltar ao mapa</Text></Pressable>
  </View>;
}

function RoadSimulation(props: RoadProps) {
  const model = useSimulationController(props);
  const { c, reducedMotion, introVisible, top, sound, setSound, saving, exitSimulation, index, offer, active, waiting, phase } = model;
  const {next} = model;
  const showNext = model.nearDropoff && model.nextDecision === 'open';
  const request = model.offering ? offer : showNext ? next?.offer : undefined;
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
    {model.currentScenario && (waiting || phase === 'offer') && <SimulationContext
      key={index} offer={offer} meters={model.distance}
      route={model.current}
      seconds={model.current.pickup.duration + model.current.trip.duration}
      pickupSeconds={model.current.pickup.duration} top={top+52}
      active={active} visible={phase === 'offer'} reducedMotion={reducedMotion} onLayout={model.onContextLayout}
    />}
    {showNext && next && <SimulationContext
      offer={next.offer} meters={next.route.pickup.distance + next.route.trip.distance}
      seconds={next.route.pickup.duration + next.route.trip.duration}
      route={next.route}
      pickupSeconds={next.route.pickup.duration} top={top+52} active={active}
      remainingMinutes={Math.max(1,Math.ceil(model.remainingSeconds/60))} reducedMotion={reducedMotion}
    />}
    <IntroPanel model={model}/>
    <SearchPanel model={model}/>
    {request ? <RequestPanel model={model} request={request}/> : !waiting && <OfferPanel model={model}/>}
    <RideFeedback rideId={model.feedbackRideId} onClose={model.finishFeedback} />
  </View></View>;
}
function stageHeading(phase: SimulationPhase) {
  if (phase === 'offer' || phase === 'accepting') return 'OFERTA SIMULADA';
  if (phase === 'pickup') return 'BUSCAR PASSAGEIRO';
  if (phase === 'boarding') return 'EMBARQUE CONFIRMADO';
  if (phase === 'trip') return 'VIAGEM EM ANDAMENTO';
  return 'RESUMO DA SIMULAÇÃO';
}
function boardingSeconds(phase: SimulationPhase, elapsed: number) {
  if (phase === 'boarding') return elapsed;
  if (phase === 'trip' || phase === 'done') return 3;
  return 0;
}
function stageTitle(phase: SimulationPhase, passenger: string) {
  if (phase === 'boarding') return 'Passageiro a bordo';
  if (phase === 'pickup' || phase === 'trip') return passenger;
  if (phase === 'done') return 'Viagem concluída';
  if (phase === 'expired') return 'A oferta expirou';
  return 'Corrida encerrada';
}
function stageAddress({phase,offer,distance}: SimulationModel) {
  if (phase === 'pickup') return offer.pickup.name;
  if (phase === 'boarding') return `${offer.passenger.split(' ')[0]} embarcou. Vamos ao destino.`;
  if (phase === 'trip') return offer.destination.name;
  const summary = phase === 'done' ? km(distance)+' km percorridos' : 'Você pode receber outra oferta';
  return `${money(offer.fare)} · ${summary}`;
}

function IntroPanel({model}: PanelProps) {
  const { c, introVisible, reducedMotion, top, phase, elapsed } = model;
  return <SimulationMotion visible={introVisible} reducedMotion={reducedMotion} fromY={54} duration={650} style={[s.intro,{top:top+64}]} testID="simulation-intro">
    <ScrollView contentContainerStyle={s.introContent} showsVerticalScrollIndicator={false}>
      <View style={[s.radar,{borderColor:c.border}]}><View style={[s.radarInner,{backgroundColor:c.accentSurface}]}><Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.5}><Path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6"/></Svg></View></View>
      <Text style={[s.introBrand,{color:c.text}]}>Safe<Text style={{color:c.accent}}>Ride</Text></Text>
      <Text style={[s.introTitle,{color:c.text}]}>Contexto para ofertas da Uber e da 99</Text>
      <View style={s.introTopics}>{[
        {label:'Segurança',path:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z',color:c.blue},
        {label:'Pavimento',path:'M7 3L3 21M17 3l4 18M12 3v4m0 4v3m0 4v3',color:c.orange},
        {label:'Trânsito',path:'M4 7h13l-3-3m3 3l-3 3M20 17H7l3-3m-3 3l3 3',color:c.violet},
      ].map(topic=><View key={topic.label} style={s.introTopic}><Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={topic.color} strokeWidth={1.6}><Path d={topic.path}/></Svg><Text style={{fontSize:11,color:c.muted}}>{topic.label}</Text></View>)}</View>
      <View style={[s.searchStatus,{borderColor:c.border,backgroundColor:c.surface}]}>
        <View style={[s.row,{justifyContent:'center'}]}><View style={s.dot}/><Text style={[s.searchTitle,{color:c.text}]}>Preparando sua experiência</Text></View>
        <Text style={[s.searchCaption,{color:c.muted}]}>Percurso pelas vias próximas à sua localização.</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="Apresentação do SafeRide" accessibilityValue={{min:0,max:5,now:phase==='intro'?elapsed:5}} style={[s.progress,{backgroundColor:c.inset}]}><View style={[s.progressFill,{backgroundColor:c.accent,width:`${phase==='intro'?elapsed/5*100:100}%`}]}/></View>
      </View>
      <Text style={[s.footnote,{color:c.muted,marginTop:18}]}>MODO SIMULAÇÃO{'\n'}A plataforma envia a oferta. O SafeRide mostra os ganhos e o contexto do destino.</Text>
    </ScrollView></SimulationMotion>;
}

function SearchPanel({model}: PanelProps) {
  const { c, phase, elapsed, reducedMotion, planError, retryPlan } = model;
  return <SimulationMotion visible={phase==='searching'} reducedMotion={reducedMotion} fromY={50} duration={480} testID="simulation-search" style={[s.searchingPanel,{backgroundColor:c.surface,borderColor:c.border}]}>
      <Text accessibilityLiveRegion="polite" style={[s.stageTitle,{color:c.text}]}>{planError || 'Localizando corrida…'}</Text>
      {planError ? <Pressable accessibilityRole="button" style={s.accept} onPress={retryPlan}><Text style={s.acceptText}>Tentar novamente</Text></Pressable>
        : <SimulationProgress value={elapsed/5} color={c.accent} background={c.inset} reducedMotion={reducedMotion}/>}
    </SimulationMotion>;
}

function RequestPanel({model, request}: PanelProps & { request: Offer }) {
  const {c, saving, offering, elapsed, reducedMotion} = model;
  return <View onLayout={offering ? model.onRequestLayout : undefined} style={[s.searchingPanel,{backgroundColor:c.surface,borderColor:c.border,gap:8,padding:16}]}>
    <Text style={[s.eyebrow,{color:c.accent}]}>{offering ? 'Nova corrida' : 'Próxima corrida após o desembarque'} · {request.platform}</Text>
    <Text style={{color:c.text}}>Embarque · {request.pickup.name}</Text>
    <Text style={{color:c.text}}>Destino · {request.destination.name}</Text>
    {offering && <SimulationProgress value={1-elapsed/OFFER_SECONDS} color={c.accent} background={c.inset} reducedMotion={reducedMotion}/>}
    <View style={s.row}>
      <Pressable accessibilityRole="button" disabled={saving} onPress={()=>offering ? model.declineOffer() : model.setNextDecision('declined')} style={[s.secondary,{borderColor:c.border}]}><Text style={{color:c.text}}>Recusar corrida</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={saving} onPress={()=>offering ? model.accept() : model.setNextDecision('reserved')} style={[s.accept,{flex:1}]}><Text style={s.acceptText}>{saving?'Salvando…':'Aceitar corrida'}</Text></Pressable>
    </View>
    {offering && /Falha|Não foi|pendente/.test(model.saveNotice) && <Text style={{color:c.orange}}>{model.saveNotice}</Text>}
  </View>;
}

function OfferPanel({model}: PanelProps) {
  const { c, waiting, reducedMotion, cardHeight, phase, offer, audioError, saveNotice } = model;
  const importantNotice = /Falha|Não foi|pendente/.test(saveNotice) ? saveNotice : '';
  return <SimulationMotion visible={!waiting} reducedMotion={reducedMotion} fromY={110} duration={650} delay={160} testID="simulation-offer" style={[s.offer,{height:cardHeight,backgroundColor:c.surface,borderColor:c.border}]}>
      <View style={[s.handle,{backgroundColor:c.border}]}/>
      <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingBottom:4}} showsVerticalScrollIndicator={false}>
        <View style={[s.row,{justifyContent:'space-between',marginBottom:5}]}><Text style={[s.eyebrow,{color:c.accent}]}>{offer.platform} · {stageHeading(phase)}</Text><Text style={{color:c.muted,fontSize:12}}>{offer.category}</Text></View>
        <TripDetails model={model}/>
        {audioError?<Text style={{color:c.orange,fontSize:12,marginTop:6}}>{audioError}</Text>:null}
      </ScrollView>
      {importantNotice ? <Text style={[s.footnote,{color:c.orange}]}>{importantNotice}</Text> : null}
      {model.completionError && <Pressable accessibilityRole="button" onPress={()=>{model.setCompletionError(false);model.retryCompletion();}} style={s.accept}><Text style={s.acceptText}>Salvar e continuar</Text></Pressable>}
    </SimulationMotion>;
}

function TripDetails({model}: PanelProps) {
  const { c, phase, offer, paused, reducedMotion } = model;
  const boarding = phase === 'boarding';
  const onboard = boarding || phase === 'trip';
  return <View accessibilityLiveRegion="polite">
    <View style={[s.row,{marginTop:8,marginBottom:8}]}>
      <SimulationMotion visible reducedMotion={reducedMotion} key={onboard?'onboard':'pickup'} fromY={12} duration={420} style={[s.tripAvatar,{backgroundColor:onboard?c.accentSurface:c.inset}]}>
        {onboard ? <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2.5}><Path d="M5 12l4 4L19 6"/></Svg> : <Person color={c.blue}/>}
      </SimulationMotion>
      <View style={{flex:1}}>
        <Text style={[s.stageTitle,{color:boarding?c.accent:c.text}]}>{stageTitle(phase,offer.passenger)}</Text>
        {phase==='trip'?<Text style={{color:c.accent,fontSize:12,marginTop:3}}>✓ Passageiro a bordo</Text>:null}
      </View>
    </View>
    <Text style={[s.address,{color:c.muted}]} numberOfLines={2}>{stageAddress(model)}</Text>
    {paused&&!boarding?<Text style={[s.passenger,{color:c.orange}]}>Simulação pausada</Text>:null}
  </View>;
}

const s=StyleSheet.create({
  preparation:{alignItems:'center',justifyContent:'center',gap:18,padding:24},
  preparationStatus:{textAlign:'center',maxWidth:420},
  tripAvatar:{width:46,height:46,borderRadius:23,alignItems:'center',justifyContent:'center'},
  searchingPanel:{position:'absolute',left:16,right:16,bottom:20,padding:24,borderRadius:24,borderWidth:1,boxShadow:'0 8px 26px #0003'},
  toolbar:{position:'absolute',left:14,right:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  row:{flexDirection:'row',alignItems:'center',gap:8},mode:{borderWidth:1,borderRadius:22,paddingHorizontal:12,height:40,flexDirection:'row',alignItems:'center',gap:7},modeText:{fontSize:10,fontWeight:'800',letterSpacing:1.1},dot:{width:7,height:7,borderRadius:4,backgroundColor:'#39c6a1'},tool:{minWidth:44,height:40,borderRadius:20,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},
  intro:{position:'absolute',bottom:12,left:24,right:24},introContent:{flexGrow:1,justifyContent:'center',paddingVertical:16},radar:{width:112,height:112,borderRadius:56,borderWidth:1,alignSelf:'center',alignItems:'center',justifyContent:'center',marginBottom:16},radarInner:{width:86,height:86,borderRadius:43,alignItems:'center',justifyContent:'center'},introBrand:{fontSize:44,fontWeight:'800',letterSpacing:-1.8,textAlign:'center'},eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:1.1},introTitle:{fontSize:21,lineHeight:28,fontWeight:'600',marginTop:10,letterSpacing:-.3,textAlign:'center'},introTopics:{flexDirection:'row',justifyContent:'center',gap:26,marginVertical:26},introTopic:{alignItems:'center',gap:7},searchStatus:{padding:17,borderRadius:20,borderWidth:1,gap:11},searchTitle:{fontSize:13,fontWeight:'700'},searchCaption:{fontSize:12,textAlign:'center'},
  offer:{position:'absolute',bottom:10,left:12,right:12,borderRadius:25,borderWidth:1,overflow:'hidden',boxShadow:'0 10px 32px #0004'},handle:{height:4,width:34,borderRadius:3,alignSelf:'center',marginTop:8,marginBottom:9},fare:{fontWeight:'800',letterSpacing:-1.3},rate:{fontSize:11,fontWeight:'700',paddingHorizontal:8,paddingVertical:6,borderRadius:8},summary:{fontSize:13,marginTop:3},divider:{height:1,marginVertical:9},stop:{flexDirection:'row',gap:9,marginBottom:8},marker:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center'},stopLabel:{fontSize:9,fontWeight:'700',letterSpacing:.4},address:{fontSize:13,lineHeight:17,marginTop:3,fontWeight:'500'},passenger:{fontSize:11,marginTop:5},stageTitle:{fontSize:21,fontWeight:'800',letterSpacing:-.5},actions:{paddingHorizontal:14,paddingVertical:9,borderTopWidth:1,gap:7},accept:{backgroundColor:'#087f71',borderRadius:14,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:12,paddingVertical:10},acceptText:{color:'white',fontSize:16,fontWeight:'700'},secondary:{minHeight:48,borderWidth:1,borderRadius:14,paddingHorizontal:15,alignItems:'center',justifyContent:'center'},footnote:{fontSize:9,lineHeight:13,textAlign:'center',marginTop:4},progress:{height:3,borderRadius:3,overflow:'hidden'},progressFill:{height:3,backgroundColor:'#36bca0'},
});
