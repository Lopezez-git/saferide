import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View, ScrollView, Pressable, TextInput, Keyboard, Linking, useWindowDimensions } from "react-native";
import {
  styles,
  Button,
  Chip,
  Field,
  Feedback,
  ResourceState,
  SignInNotice,
} from "../components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import MapCanvas from "../components/MapCanvas";
import { MapPoint } from "../components/mapHtml";
import { useResource } from "../lib/useResource";
import { api, Report, message, when } from "../lib/client";
import { useSession } from "../lib/session";
import { nearRoute } from "../lib/spatial";
import { locate, DevicePosition } from "../lib/location";

const inPilot = (p: MapPoint) => p.latitude >= -24.1 && p.latitude <= -23.3 && p.longitude >= -46.9 && p.longitude <= -46.3;

const categories = {
  OBRA: "Obras",
  PAVIMENTO: "Pavimento",
  ALAGAMENTO: "Alagamento",
  ACESSO: "Acesso",
  SEGURANCA: "Segurança",
};
type PlaceResult = MapPoint & { id: string; name: string; address: string; accuracy?: string; city?: string; street?: string; district?: string };
type Route = {
  distance: number;
  duration: number;
  geometry: { coordinates: number[][] };
};
export default function MapScreen() {
  const { token, user } = useSession();
  const router = useRouter();
  const [topic, setTopic] = useState<"safety" | "pavement" | "news" | "community">("news");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const manualOrigin = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapHeight, setMapHeight] = useState(height - 64);
  const q = useResource<Report[]>("/reports");
  const [mode, setMode] = useState<"origin" | "destination" | "report">(
    "origin",
  );
  const [origin, setOrigin] = useState<MapPoint | null>(null);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const request = useRef(0);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inspected, setInspected] = useState<MapPoint | null>(null);
  const [localName, setLocalName] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [newsVersion, setNewsVersion] = useState(0);
  const [newsArea, setNewsArea] = useState({street:"",district:""});
  const [newsCity, setNewsCity] = useState("");
  const [newsPlace, setNewsPlace] = useState("");
  const newsKey = JSON.stringify([newsPlace,newsCity,newsArea.street,newsArea.district]);
  type LocalNews = {place:string;status:string;lastAttempt:string;items:{id:string;title:string;source:string;url:string;publishedAt:string;topic:string;scope:string;matchedPlace:string}[]};
  const [localNews, setLocalNews] = useState<{place:string;data:LocalNews|null;error:string;loading:boolean}>({place:"",data:null,error:"",loading:false});
  useEffect(() => {
    if (!newsPlace) return;
    const controller = new AbortController();
    api<LocalNews>("/news/local?place="+encodeURIComponent(newsPlace)+"&city="+encodeURIComponent(newsCity)+"&street="+encodeURIComponent(newsArea.street)+"&district="+encodeURIComponent(newsArea.district),{signal:controller.signal})
      .then(data => {if(!controller.signal.aborted)setLocalNews({place:newsKey,data,error:"",loading:false});})
      .catch(e => {if(!controller.signal.aborted)setLocalNews({place:newsKey,data:null,error:message(e),loading:false});});
    return () => controller.abort();
  },[newsPlace,newsCity,newsArea.street,newsArea.district,newsKey,newsVersion]);
  const news = localNews.place === newsKey ? localNews : {data:null,error:"",loading:!!newsPlace};

  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);
  const searchRequest = useRef(0);
  const [placeFocus, setPlaceFocus] = useState<(MapPoint & { key: number }) | null>(null);
  const [originName, setOriginName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const lastSearchAt = useRef(0);
  const placeCache = useRef(new Map<string, PlaceResult[]>());
  useFocusEffect(useCallback(() => {
    const term = search.trim();
    if (term.length < 3) return;
    const cached = placeCache.current.get(term.toLocaleLowerCase());
    if (cached) { setPlaces(cached); setSearched(true); setSearching(false); return; }
    const id = ++searchRequest.current;
    const controller = new AbortController();
    // Debounce typing and keep this device below the shared provider limit.
    const delay = Math.max(500, 1200 - (Date.now() - lastSearchAt.current));
    const timer = setTimeout(async () => {
      lastSearchAt.current = Date.now();
      setSearching(true);
      try {
        const results = await api<PlaceResult[]>("/places?q=" + encodeURIComponent(term), { signal: controller.signal });
        if (id === searchRequest.current && !controller.signal.aborted) { if (placeCache.current.size >= 30) placeCache.current.delete(placeCache.current.keys().next().value!); placeCache.current.set(term.toLocaleLowerCase(), results); setPlaces(results); setSearched(true); }
      } catch (e) {
        if (id === searchRequest.current && !controller.signal.aborted) setSearchError(message(e));
      } finally {
        if (id === searchRequest.current && !controller.signal.aborted) setSearching(false);
      }
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); searchRequest.current++; };
  }, [search]));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("PAVIMENTO");
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [, setLocating] = useState(false);
  const [, setLocationError] = useState("");
  const [locationFocus, setLocationFocus] = useState(0);
  const locationRequest = useRef(0);
  const findMe = useCallback(async () => {
    const id = ++locationRequest.current;
    setLocating(true);
    setLocationError("");
    try {
      const p = await locate((refined) => {
        if (id === locationRequest.current) setPosition(refined);
      });
      if (id !== locationRequest.current) return;
      if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) {
        throw new Error("O dispositivo retornou uma posição inválida. Tente novamente.");
      }
      setPosition(p);
      setLocationFocus((value) => value + 1);
      if (inPilot(p) && !manualOrigin.current) {
        setOrigin((current) => current ?? { latitude: p.latitude, longitude: p.longitude });
        setMode((current) => current === "origin" ? "destination" : current);
      }
    } catch (e) {
      if (id === locationRequest.current) setLocationError(message(e));
    } finally {
      if (id === locationRequest.current) setLocating(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void findMe();
    return () => { locationRequest.current++; };
  }, [findMe]));
  function pick(p: MapPoint) {
    if (
      p.latitude < -24.1 ||
      p.latitude > -23.3 ||
      p.longitude < -46.9 ||
      p.longitude > -46.3
    ) {
      setError("Escolha um ponto dentro da região piloto de São Paulo.");
      return;
    }
    setInspected(p); setLocalName(""); setNewsPlace(""); setReportOpen(false);
    setError("");
    if (mode === "report") {
      setPoint(p);
    } else {
      request.current++;
      setRouting(false);
      setRoute(null);
        if (mode === "origin") { manualOrigin.current = true; setOrigin(p); setOriginName(""); }
      else { setDestination(p); setDestinationName(""); }
    }
  }
  async function calculate() {
    if (!origin || !destination) return;
    const id = ++request.current;
    setRouting(true);
    setRoute(null);
    setError("");
    try {
      const r = await api<Route>("/route", {
        method: "POST",
        body: {
          fromLat: origin.latitude,
          fromLon: origin.longitude,
          toLat: destination.latitude,
          toLon: destination.longitude,
        },
      });
      if (id === request.current) { setRoute(r); setSheetOpen(false); Keyboard.dismiss(); }
    } catch (e) {
      if (id === request.current) setError(message(e));
    } finally {
      if (id === request.current) setRouting(false);
    }
  }
  async function submit() {
    if (!point) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api("/reports", {
        method: "POST",
        token,
        body: {
          title,
          body,
          category,
          ...point,
          observedAt: new Date().toISOString(),
        },
      });
      setTitle("");
      setBody("");
      setPoint(null);
      setSuccess(
        "Relato enviado para revisão. Acompanhe a situação no seu perfil.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setCheckedAt(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const reports = q.data ?? [];
  const shown = reports.filter(r => !r.validUntil || new Date(r.validUntil).getTime() > checkedAt);
  const focus = inspected ?? destination ?? origin ?? position;
  const nearby = focus ? shown.map(r => ({...r,distance:Math.hypot((r.latitude-focus.latitude)*111320,(r.longitude-focus.longitude)*111320*Math.cos(focus.latitude*Math.PI/180))})).filter(r => r.distance <= 1000).sort((a,b)=>a.distance-b.distance) : [];
  const actualNearby = nearby.filter(r => !/demonstração|fictício|ficticia|fictício/i.test(r.title+" "+r.body));
  const safety = actualNearby.filter(r => r.category === "SEGURANCA");
  const pavement = actualNearby.filter(r => r.category === "PAVIMENTO");
  const safetyNews = (news.data?.items || []).filter(n => n.topic === "Segurança");
  const pavementNews = (news.data?.items || []).filter(n => n.topic === "Pavimento" || n.topic === "Obras na via");
  const topicNews = topic === "safety" ? safetyNews : topic === "pavement" ? pavementNews : [];

  const contextual = route
    ? reports.filter((r) => nearRoute(r, route.geometry.coordinates))
    : [];
  return (
    <View style={{flex:1,backgroundColor:"#E6E9E3"}} onLayout={(event) => setMapHeight(event.nativeEvent.layout.height)}>
      <MapCanvas
        height={mapHeight}
        data={{ routeMinutes: route ? Math.round(route.duration / 60) : undefined, reports: shown, placeFocus, position, locationFocus, origin, destination, selected: point, route: route?.geometry.coordinates ?? null }}
        onPick={(point) => { if (search) { Keyboard.dismiss(); setSearch(""); setPlaces([]); setSearched(false); setSearching(false); searchRequest.current++; return; } if (!route || mode === "report") pick(point); else { setInspected(point); setLocalName(""); setNewsPlace(""); } setSheetOpen(true); }}
        onReport={(id) => { const report = reports.find(r => r.id === id); if (report) { setInspected(report); setLocalName(report.title); setNewsPlace(""); } setSheetOpen(true); }}
      />
      <View style={{position:"absolute",top:12+insets.top,left:12,right:12,maxWidth:520,alignSelf:"center",backgroundColor:"white",borderRadius:20,padding:14,boxShadow:"0 3px 18px #00000020"}}>
        <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
      <TextInput
        accessibilityLabel="Buscar endereço ou lugar"
        style={{flex:1,fontSize:17,minHeight:48,color:"#17211D",paddingHorizontal:12,backgroundColor:"#F2F4F2",borderRadius:12}}
        value={search}
        onChangeText={(text) => { searchRequest.current++; setSearch(text); setPlaces([]); setSearchError(""); setSearched(false); setSearching(text.trim().length >= 3); setSheetOpen(false); }}
        placeholder={mode === "origin" ? "Buscar lugar de partida" : mode === "destination" ? "Para onde? Busque um lugar" : "Buscar local do relato"}
        onFocus={() => setSheetOpen(false)}
        autoCorrect={false}
        maxLength={120}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      {search.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => { searchRequest.current++; setSearch(""); setPlaces([]); setSearched(false); setSearching(false); setSearchError(""); }} style={{width:40,minHeight:44,alignItems:"center",justifyContent:"center"}}><Text style={{fontSize:24,color:"#64716C"}}>×</Text></Pressable> : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:Math.max(160,mapHeight*0.42)}} contentContainerStyle={{gap:4}}>
      {searching ? <Text accessibilityLiveRegion="polite" style={styles.subtitle}>Buscando sugestões…</Text> : null}
      {search.length > 0 && search.trim().length < 3 ? <Text style={styles.subtitle}>Digite pelo menos 3 caracteres.</Text> : null}
      <Feedback error={searchError} />
      {places.length > 0 ? <Text style={[styles.subtitle,{paddingTop:10}]}>Sugestões em São Paulo e região</Text> : null}
      {places.map((place) => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`${place.name}, ${place.address}`} onPress={() => {
          Keyboard.dismiss(); setSheetOpen(true); pick(place); setNewsPlace(place.city ? place.name : ""); setNewsCity(place.city || ""); setNewsArea({street:place.street||"",district:place.district||""}); setLocalName([place.name,place.address].filter(Boolean).join(" · "));
          if (mode === "origin") { setOriginName([place.name,place.address].filter(Boolean).join(" · ")); setMode("destination"); }
          else if (mode === "destination") setDestinationName([place.name,place.address].filter(Boolean).join(" · "));
          setPlaceFocus({ latitude: place.latitude, longitude: place.longitude, key: Date.now() });
          searchRequest.current++; setSearching(false); setSearch(""); setPlaces([]); setSearched(false);
        }} style={({pressed}) => ({flexDirection:"row",alignItems:"center",gap:12,paddingVertical:13,paddingHorizontal:8,borderBottomWidth:1,borderBottomColor:"#EDF0EE",backgroundColor:pressed?"#EDF5F2":"white",borderRadius:8})}>
        <Text style={{fontSize:22,color:"#087F71"}}>⌖</Text>
        <View style={{flex:1,gap:3}}><Text style={styles.heading} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{place.address}</Text>
        {place.accuracy ? <Text style={{fontSize:11,color:place.accuracy.includes("aproximado")?"#915F15":"#64716C"}}>{place.accuracy}</Text> : null}</View>
        <Text style={{fontSize:22,color:"#64716C"}}>›</Text>
      </Pressable>)}
      {searched && places.length === 0 ? <Text style={styles.subtitle}>Nenhum resultado na região piloto. Tente o nome completo, bairro ou número.</Text> : null}
      {places.length > 0 ? <Text style={styles.subtitle}>Photon · © OpenStreetMap contributors</Text> : null}

        </ScrollView>
      </View>
      {route && !sheetOpen && !search ? <Pressable accessibilityRole="button" accessibilityLabel="Ver detalhes do trajeto" onPress={() => setSheetOpen(true)} style={{position:"absolute",bottom:30,alignSelf:"center",paddingHorizontal:20,paddingVertical:14,borderRadius:24,backgroundColor:"#17211D"}}><Text style={{color:"white",fontWeight:"600"}}>{(route.distance/1000).toFixed(1)} km · {Math.round(route.duration/60)} min · Ver trajeto</Text></Pressable> : null}
      {sheetOpen ? <View style={{position:"absolute",bottom:0,left:0,right:0,backgroundColor:"white",borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:mapHeight*0.65,boxShadow:"0 -4px 20px #00000016"}}>
        <Pressable accessibilityRole="button" accessibilityLabel={sheetOpen ? "Recolher painel do mapa" : "Abrir planejamento e relatos"} accessibilityState={{expanded:sheetOpen}} onPress={() => { Keyboard.dismiss(); setSheetOpen(!sheetOpen); }} style={{padding:16,gap:8,minHeight:80}}>
          <View style={{width:38,height:4,borderRadius:4,backgroundColor:"#CBD2CE",alignSelf:"center"}} />
          <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <Text style={{fontSize:21,fontWeight:"700",color:"#17211D",flexShrink:1}}>{localName || "Informações do local"}</Text>
            <Text style={{fontSize:20,color:"#17211D"}}>{sheetOpen ? "⌄" : "⌃"}</Text>
          </View>
          <Text numberOfLines={1} style={{fontSize:12,color:"#64716C"}}>{focus ? "Relatos em até 1 km do ponto selecionado" : "Selecione um lugar para consultar"}</Text>
        </Pressable>
        {sheetOpen ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingTop:0,gap:12,paddingBottom:28}}>
          <Feedback error={error} success={success} />
          <ResourceState {...q} />
          <View style={{flexDirection:"row",flexWrap:"wrap",gap:10}}>
            {([
              {id:"safety",title:"Segurança",color:"#A76A12",bg:"#FFF5E3",text:q.loading?"Consultando…":q.error?"Dados indisponíveis":safety.length||safetyNews.length?`${safety.length} relato(s) · ${safetyNews.length} notícia(s)`:news.loading?"Consultando notícias…":news.error||news.data?.status==="UNAVAILABLE"?"Notícias indisponíveis":"Sem registros nas fontes",caption:"Relatos e notícias · veja o alcance"},
              {id:"pavement",title:"Pavimento",color:"#B5532A",bg:"#FFF0E9",text:q.loading?"Consultando…":q.error?"Dados indisponíveis":pavement.length||pavementNews.length?`${pavement.length} relato(s) · ${pavementNews.length} notícia(s)`:news.loading?"Consultando notícias…":news.error||news.data?.status==="UNAVAILABLE"?"Notícias indisponíveis":"Sem registros nas fontes",caption:"Pavimento e obras · sem vistoria"},
              {id:"news",title:"Notícias",color:"#2563B5",bg:"#EBF3FF",text:news.loading?"Consultando…":news.error?"Fonte indisponível":!newsPlace?"Selecione um endereço":news.data?.status==="UNAVAILABLE"?"Consulta indisponível":`${news.data?.items.length ?? 0} notícia(s) do local e entorno`,caption:"Segurança e condições do trajeto"},
              {id:"community",title:"Comunidade",color:"#7952B3",bg:"#F4EEFF",text:q.loading?"Consultando…":q.error?"Dados indisponíveis":actualNearby.length?`${actualNearby.length} relato(s) do local`:"Sem relatos reais aqui",caption:"Experiências de motoristas"},
            ] as const).map(card => <Pressable key={card.id} accessibilityRole="button" accessibilityState={{selected:topic===card.id}} accessibilityLabel={`${card.title}: ${card.text}`} onPress={() => setTopic(card.id)} style={({pressed}) => ({width:"48%",flexGrow:1,minHeight:142,padding:13,gap:6,borderRadius:18,backgroundColor:card.bg,borderWidth:2,borderColor:topic===card.id?card.color:"transparent",opacity:pressed?0.8:1})}>
              <Svg width={27} height={27} viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
                {card.id==="safety" ? <Path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zm0 5v5m0 3h.01" /> : null}
                {card.id==="pavement" ? <Path d="M7 3L3 21M17 3l4 18M12 3v4m0 4v3m0 4v3" /> : null}
                {card.id==="news" ? <Path d="M4 3h16v18H4V3zm4 4h8v5H8V7zm0 9h8m-8 3h5" /> : null}
                {card.id==="community" ? <><Circle cx="9" cy="8" r="3"/><Path d="M3 21v-2a6 6 0 0112 0v2M16 5a3 3 0 010 6m2 3a5 5 0 013 5v2"/></> : null}
              </Svg>
              <Text style={{fontSize:16,fontWeight:"700",color:"#17211D"}}>{card.title}</Text>
              <Text style={{fontSize:13,fontWeight:"600",color:card.color}}>{card.text}</Text>
              <Text style={{fontSize:11,color:"#596860"}}>{card.caption}</Text>
            </Pressable>)}
          </View>
          <Text style={styles.subtitle}>Toque em um card para ver os detalhes. As cores identificam assuntos, não níveis de risco.</Text>
          {topic === "safety" ? <><Text style={styles.heading}>Segurança nas proximidades</Text><Text style={styles.body}>{safety.length||safetyNews.length?"Confira a data e a fonte de cada registro abaixo.":news.error||news.data?.status==="UNAVAILABLE"?"A consulta de notícias está indisponível; não foi possível verificar a cobertura de segurança.":"Não encontramos relatos ou notícias de segurança nas fontes consultadas. Estatísticas policiais ainda não estão integradas."}</Text><Text style={styles.subtitle}>Ausência de relatos não significa lugar seguro. Registros anteriores não confirmam ocorrência em andamento.</Text></> : null}
          {topic === "pavement" ? <><Text style={styles.heading}>Condições do pavimento</Text><Text style={styles.body}>{pavement.length||pavementNews.length?"Relatos e notícias de pavimento ou obras, com o local indicado abaixo.":news.error||news.data?.status==="UNAVAILABLE"?"A consulta de notícias está indisponível; não foi possível verificar a cobertura de pavimento.":"Não encontramos relatos ou notícias sobre pavimento nas fontes consultadas. A base pública de solicitações de tapa-buraco ainda não está integrada."}</Text></> : null}
          {topic === "community" ? <><Text style={styles.heading}>Quem passa por aqui</Text><Text style={styles.body}>{actualNearby.length?"Relatos de motoristas próximos do ponto selecionado.":"A comunidade ainda não tem relatos reais deste local. Compartilhe o que você observou para ajudar quem passa por aqui."}</Text><Button title="Abrir comunidade" secondary onPress={() => router.push("/community")} /></> : null}
          {(topic === "news" ? [] : actualNearby.filter(r => topic === "community" || r.category === (topic === "safety" ? "SEGURANCA" : "PAVIMENTO"))).map(r => <View key={r.id} style={styles.card}>
            <Text style={styles.label}>{categories[r.category as keyof typeof categories] ?? r.category} · {Math.round(r.distance)} m do ponto</Text>
            <Text style={styles.heading}>{r.title}</Text>
            <Text style={styles.body}>{r.body}</Text>
            <Text style={styles.subtitle}>{when(r.observedAt)} · {r.source || "Comunidade · relato revisado"}</Text>
            <Text style={styles.subtitle}>Revisão não comprova o fato.{r.validUntil ? ` Válido até ${when(r.validUntil)}.` : ""}</Text>
          </View>)}
          {topicNews.map(n => <Pressable key={n.id} accessibilityRole="link" onPress={() => Linking.openURL(n.url).catch(e => setError(message(e)))} style={styles.card}>
            <Text style={styles.label}>{n.topic} · {n.source} · {when(n.publishedAt)}</Text>
            <Text style={styles.subtitle}>{n.scope === "LOCAL" ? "Local mencionado" : n.scope === "STREET" ? "Na via de acesso, sem trecho confirmado" : "Contexto do bairro, não do ponto"}: {n.matchedPlace}</Text>
            <Text style={styles.heading}>{n.title}</Text><Text style={styles.subtitle}>Notícia publicada; não confirma situação ativa.</Text><Text style={{color:"#087F71"}}>Ler na fonte ↗</Text>
          </Pressable>)}
          {topic === "news" ? <>
          <Text style={styles.heading}>Notícias de {newsPlace || "um local identificado"}{newsCity && newsPlace ? " · "+newsCity : ""}</Text>
          <View style={[styles.card,{backgroundColor:"#EBF3FF"}]}><Text style={styles.heading}>De onde vêm as notícias?</Text><Text style={styles.body}>Busca específica por {newsPlace || "nome do local"} no Google Notícias. Também consultamos {newsArea.street || "a via, quando identificada"} e {newsArea.district || "o bairro, quando identificado"}. Filtramos títulos que mencionam um desses locais e situações de segurança, trânsito, clima ou pavimento. Fontes: G1, Agência Brasil, Agência SP, CNN Brasil ou Band.</Text><Text style={styles.subtitle}>Consulta ao selecionar o local · cache de 15 minutos · últimos 30 dias, como histórico. Cada matéria identifica o veículo de origem.</Text>{news.data?.lastAttempt ? <Text style={styles.subtitle}>Última tentativa: {when(news.data.lastAttempt)}</Text> : null}</View>
          <Text style={styles.subtitle}>Uma menção ao local não confirma a ocorrência no ponto exato nem uma situação em andamento. Não exibimos notícias gerais de São Paulo como substituição.</Text>
          <ResourceState {...news} refresh={() => { if (newsPlace) {setLocalNews({place:newsKey,data:null,error:"",loading:true});setNewsVersion(v=>v+1);} }} />
          {news.data?.status === "UNAVAILABLE" ? <Text style={styles.subtitle}>Consulta indisponível: somente resultados anteriores deste mesmo local, quando disponíveis.</Text> : null}
          {news.data?.items.slice(0,10).map(n => <Pressable key={n.id} accessibilityRole="link" onPress={() => Linking.openURL(n.url).catch(e => setError(message(e)))} style={styles.card}>
            <Text style={styles.label}>{n.topic} · {n.source} · {when(n.publishedAt)}</Text>
            <Text style={styles.subtitle}>{n.scope === "LOCAL" ? "Local mencionado" : n.scope === "STREET" ? "Via de acesso · trecho não confirmado" : "Bairro · não é ocorrência neste ponto"}: {n.matchedPlace}</Text><Text style={styles.heading}>{n.title}</Text><Text style={{color:"#087F71"}}>Ler na fonte ↗</Text>
          </Pressable>)}
          {!news.loading && !news.error && news.data?.status !== "UNAVAILABLE" && !news.data?.items.length ? <Text style={styles.body}>{newsPlace ? "Nenhuma notícia recente sobre segurança ou condições do trajeto foi encontrada neste local. Isso não indica ausência de ocorrências." : "Busque e selecione um endereço para consultar notícias desse lugar. Um ponto sem nome no mapa não permite identificar a rua com confiança."}</Text> : null}
          </> : null}
          <Button title={reportOpen ? "Fechar relato" : "Relatar uma situação neste local"} secondary disabled={!focus} onPress={() => { setPoint(reportOpen ? null : focus); setReportOpen(!reportOpen); }} />
      {reportOpen ? (user ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Relatar uma situação</Text>
          <Text style={styles.subtitle}>
            {point
              ? `Local selecionado: ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
              : "Selecione um local no mapa."}
          </Text>
          <View style={styles.row}>
            {Object.entries(categories).map(([k, v]) => (
              <Chip
                key={k}
                label={v}
                selected={category === k}
                onPress={() => setCategory(k)}
              />
            ))}
          </View>
          <Field
            label="Título do relato"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <Field
            label="O que você observou?"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
          />
          <Text style={styles.subtitle}>
            Envie uma observação feita agora. Não inclua nomes, placas ou dados
            pessoais. Para segurança, descreva apenas o registro conhecido, sem
            afirmar crime em andamento.
          </Text>
          <Button
            title={busy ? "Enviando…" : "Enviar para revisão"}
            disabled={busy || !point || !title.trim() || !body.trim()}
            onPress={submit}
          />
        </View>
      ) : (
        <SignInNotice />
      )) : null}

          {origin && destination ? <View style={styles.card}>
            <Text style={styles.heading}>Trajeto selecionado</Text>
            <Text style={styles.subtitle}>De: {originName || "Ponto marcado no mapa"}</Text>
            <Text style={styles.subtitle}>Para: {destinationName || "Ponto marcado no mapa"}</Text>
            {route ? <Text style={styles.body}>{(route.distance/1000).toFixed(1)} km · cerca de {Math.round(route.duration/60)} min · {contextual.length} relato(s) próximo(s) ao percurso</Text> : <Button title={routing ? "Calculando…" : "Traçar percurso"} disabled={routing} onPress={calculate} />}
          </View> : null}
          <Text style={styles.subtitle}>Protótipo acadêmico · fontes e detalhes nos relatos.</Text>
        </ScrollView> : null}
      </View> : null}
    </View>
  );
}
