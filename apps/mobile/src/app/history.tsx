import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ride, loadRides, feedbackOptions, loadSimulatedCommunityFeedback, SimulatedCommunityFeedback } from '../lib/rideHistory';
import { styles, Button } from '../components/ui';
import RideFeedback from '../components/RideFeedback';
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const km=(n:number,decimals=2)=>(n/1000).toLocaleString('pt-BR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
const time=(n:number)=>`${Math.floor(n/60)} min ${n%60} s`;
export default function HistoryScreen() {
 const [items,setItems]=useState<Ride[]>([]),[loading,setLoading]=useState(true),[offline,setOffline]=useState(false),[error,setError]=useState('');
 const [feedbackRideId,setFeedbackRideId]=useState<string|null>(null);
 const [community,setCommunity]=useState<SimulatedCommunityFeedback[]>([]);
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{const result=await loadRides();setItems(result.items);setOffline(result.offline);try{setCommunity(await loadSimulatedCommunityFeedback());}catch{setCommunity([]);}}catch{setError('Não foi possível ler o histórico. Tente novamente.');}finally{setLoading(false);}},[]);
 useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
 const completed=items.filter(r=>r.status==='COMPLETED');
 return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}>
  <Text style={styles.title}>Suas corridas</Text><Text style={styles.subtitle}>Histórico de simulações deste dispositivo. Passageiros e valores fictícios.</Text>
  <View style={styles.card}><Text style={styles.heading}>{completed.length} {completed.length===1?'concluída':'concluídas'} · {money(completed.reduce((n,r)=>n+r.fare,0))}</Text><Text style={styles.subtitle}>{km(items.reduce((n,r)=>n+r.distanceMeters,0),1)} km percorridos no simulador · até 100 corridas do servidor</Text></View>
  {offline?<Text style={styles.subtitle}>Sem conexão com o servidor. Exibindo o histórico local; registros pendentes serão enviados ao atualizar.</Text>:null}
  {error?<Text style={{color:'#a33224'}}>{error}</Text>:null}
  {!loading&&!items.length?<View style={styles.card}><Text style={styles.heading}>Nenhuma corrida aceita ainda</Text><Text style={styles.subtitle}>Na aba Mapa, toque em Simular corrida e aceite um pedido. Ele aparecerá aqui.</Text></View>:null}
  {items.map(ride=><View key={ride.id} style={styles.card}>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}><Text style={[styles.heading,{flex:1}]}>{ride.passenger}</Text><Text style={styles.heading}>{money(ride.fare)}</Text></View>
    <Text style={{color:ride.status==='COMPLETED'?'#087F71':ride.status==='CANCELLED'?'#a33224':'#a66c10',fontWeight:'700'}}>{ride.status==='COMPLETED'?'Concluída':ride.status==='CANCELLED'?'Cancelada':'Em andamento / interrompida'} · Simulação</Text>
    <Text style={styles.subtitle}>{new Date(ride.createdAt).toLocaleString('pt-BR')}{ride.pending?' · Sincronização pendente':offline?' · Cópia no dispositivo · sem conexão':ride.cachedOnly?' · Cópia no dispositivo · fora da consulta atual':' · Salvo no banco'}</Text>
    <Text style={styles.body}>Passageiro: {ride.passenger}{'\n'}Embarque: {ride.origin}{'\n'}Destino: {ride.destination}</Text>
    <Text style={styles.body}>{km(ride.distanceMeters)} km rodados · {time(ride.simulatedSeconds)} de viagem simulada</Text>
    <Text style={styles.subtitle}>Inclui deslocamento até o cliente. Planejado: {km(ride.plannedDistanceMeters)} km. Tempo ativo do teste: {time(ride.activeSeconds)}.</Text>
    <Text style={styles.subtitle}>{ride.status==='COMPLETED'?'Valor simulado recebido':'Valor ofertado; não contabilizado como recebido'}: {money(ride.fare)}</Text>
    {ride.finishedAt?<Text style={styles.subtitle}>Encerrada em {new Date(ride.finishedAt).toLocaleString('pt-BR')}</Text>:null}
    {ride.status==='COMPLETED'?(ride.feedback?.length?<Text style={styles.subtitle}>Feedback: {ride.feedback.map(value=>feedbackOptions.find(o=>o.value===value)?.label).join(', ')}</Text>:<><Text style={styles.subtitle}>Feedback pendente · responda quando estiver parado</Text><Button title="Dar feedback" secondary onPress={()=>setFeedbackRideId(ride.id)}/></>):null}
  </View>)}
  <Button title={loading?'Atualizando…':'Atualizar histórico'} onPress={refresh} disabled={loading}/>
  {community.length?<View style={styles.card}><Text style={styles.heading}>Relatos de demonstração</Text><Text style={styles.subtitle}>Somente corridas fictícias · localização aproximada pelo trajeto</Text>{community.slice(0,10).map((item,index)=><View key={`${item.createdAt}-${index}`}><Text style={styles.body}>{feedbackOptions.find(o=>o.value===item.category)?.label} · {new Date(item.createdAt).toLocaleString('pt-BR')}</Text><Text style={styles.subtitle}>{item.origin} → {item.destination}</Text></View>)}</View>:null}
  <RideFeedback rideId={feedbackRideId} onClose={()=>setFeedbackRideId(null)} onSaved={()=>void refresh()}/>
 </ScrollView>;
}
