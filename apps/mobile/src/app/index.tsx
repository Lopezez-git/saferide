import { useCallback, useRef, useState } from "react";
import { Text, View, ScrollView, Pressable, TextInput, Keyboard, useWindowDimensions } from "react-native";
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
import { useFocusEffect } from "expo-router";
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
const landmarks = [
  { name: "Praça da Sé", latitude: -23.5505, longitude: -46.6333 },
  { name: "MASP / Paulista", latitude: -23.5614, longitude: -46.6559 },
  { name: "Parque Ibirapuera", latitude: -23.5874, longitude: -46.6576 },
  { name: "Terminal Tietê", latitude: -23.5163, longitude: -46.6252 },
];
type PlaceResult = MapPoint & { id: string; name: string; address: string };
type Route = {
  distance: number;
  duration: number;
  geometry: { coordinates: number[][] };
};
export default function MapScreen() {
  const { token, user } = useSession();
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
  const [filter, setFilter] = useState("TODOS");
  const [detail, setDetail] = useState<string | null>(null);
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
  useFocusEffect(useCallback(() => {
    const term = search.trim();
    if (term.length < 3) return;
    const id = ++searchRequest.current;
    const controller = new AbortController();
    // Debounce typing and keep this device below the shared provider limit.
    const delay = Math.max(500, 1200 - (Date.now() - lastSearchAt.current));
    const timer = setTimeout(async () => {
      lastSearchAt.current = Date.now();
      setSearching(true);
      try {
        const results = await api<PlaceResult[]>("/places?q=" + encodeURIComponent(term), { signal: controller.signal });
        if (id === searchRequest.current && !controller.signal.aborted) { setPlaces(results); setSearched(true); }
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
  const [simulation, setSimulation] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
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
    setError("");
    if (mode === "report") {
      setPoint(p);
    } else {
      request.current++;
      setRouting(false);
      setRoute(null);
      setSimulation(false);
      if (mode === "origin") { manualOrigin.current = true; setOrigin(p); setOriginName(""); }
      else { setDestination(p); setDestinationName(""); }
    }
  }
  async function calculate() {
    if (!origin || !destination) return;
    const id = ++request.current;
    setRouting(true);
    setSimulation(false);
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
  const reports = q.data ?? [];
  const shown = reports.filter(
    (r) => filter === "TODOS" || r.category === filter,
  );
  const selected = reports.find((r) => r.id === detail);
  const contextual = route
    ? reports.filter((r) => nearRoute(r, route.geometry.coordinates))
    : [];
  return (
    <View style={{flex:1,backgroundColor:"#E6E9E3"}} onLayout={(event) => setMapHeight(event.nativeEvent.layout.height)}>
      <MapCanvas
        height={mapHeight}
        data={{ reports: shown, placeFocus, position, locationFocus, origin, destination, selected: point, route: route?.geometry.coordinates ?? null }}
        onPick={(point) => { pick(point); setSheetOpen(true); }}
        onReport={(id) => {setDetail(id); setSheetOpen(true);}}
      />
      <View style={{position:"absolute",top:12+insets.top,left:12,right:12,maxWidth:520,alignSelf:"center",backgroundColor:"white",borderRadius:20,padding:14,boxShadow:"0 3px 18px #00000020"}}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:Math.max(180,mapHeight*0.42)}} contentContainerStyle={{gap:8}}>
      <TextInput
        accessibilityLabel="Buscar endereço ou lugar"
        style={{fontSize:17,minHeight:48,color:"#17211D",paddingHorizontal:12,backgroundColor:"#F2F4F2",borderRadius:12}}
        value={search}
        onChangeText={(text) => { searchRequest.current++; setSearch(text); setPlaces([]); setSearchError(""); setSearched(false); setSearching(false); }}
        placeholder={mode === "origin" ? "Buscar lugar de partida" : mode === "destination" ? "Para onde? Busque um lugar" : "Buscar local do relato"}
        maxLength={120}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      {searching ? <Text accessibilityLiveRegion="polite" style={styles.subtitle}>Buscando sugestões…</Text> : null}
      {search.length > 0 && search.trim().length < 3 ? <Text style={styles.subtitle}>Digite pelo menos 3 caracteres.</Text> : null}
      <Feedback error={searchError} />
      {places.map((place) => <View key={place.id} style={styles.card}>
        <Text style={styles.heading}>{place.name}</Text>
        <Text style={styles.subtitle}>{place.address}</Text>
        <Button title={mode === "origin" ? "Usar como origem" : mode === "destination" ? "Usar como destino" : "Marcar neste local"} secondary onPress={() => {
          Keyboard.dismiss(); setSheetOpen(true); pick(place);
          if (mode === "origin") { setOriginName(place.name); setMode("destination"); }
          else if (mode === "destination") setDestinationName(place.name);
          setPlaceFocus({ latitude: place.latitude, longitude: place.longitude, key: Date.now() });
          searchRequest.current++; setSearching(false); setSearch(""); setPlaces([]); setSearched(false);
        }} />
      </View>)}
      {searched && places.length === 0 ? <Text style={styles.subtitle}>Nenhum resultado na região piloto. Tente o nome completo, bairro ou número.</Text> : null}
      {places.length > 0 ? <Text style={styles.subtitle}>Photon · © OpenStreetMap contributors</Text> : null}

        </ScrollView>
      </View>
      {sheetOpen ? <View style={{position:"absolute",bottom:0,left:0,right:0,backgroundColor:"white",borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:mapHeight*0.53,boxShadow:"0 -4px 20px #00000016"}}>
        <Pressable accessibilityRole="button" accessibilityLabel={sheetOpen ? "Recolher painel do mapa" : "Abrir planejamento e relatos"} accessibilityState={{expanded:sheetOpen}} onPress={() => { Keyboard.dismiss(); setSheetOpen(!sheetOpen); }} style={{padding:16,gap:8,minHeight:80}}>
          <View style={{width:38,height:4,borderRadius:4,backgroundColor:"#CBD2CE",alignSelf:"center"}} />
          <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <Text style={{fontSize:21,fontWeight:"700",color:"#17211D",flexShrink:1}}>{route ? `${(route.distance/1000).toFixed(1)} km · ${Math.round(route.duration/60)} min` : "Para onde vamos?"}</Text>
            <Text style={{fontSize:20,color:"#17211D"}}>{sheetOpen ? "⌄" : "⌃"}</Text>
          </View>
          <Text numberOfLines={1} style={{fontSize:12,color:"#64716C"}}>{locating ? "Buscando sua posição…" : position ? "Posição no mapa · São Paulo e região" : "São Paulo · localização indisponível"}</Text>
        </Pressable>
        {sheetOpen ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingTop:0,gap:12,paddingBottom:28}}>
          <Feedback error={locationError} />
          {position && !inPilot(position) ? <Text style={styles.subtitle}>Você está fora da região piloto. Trajetos e relatos estão limitados à área de São Paulo.</Text> : null}
      <View style={styles.row}>
        <Chip
          label="Marcar origem"
          selected={mode === "origin"}
          onPress={() => setMode("origin")}
        />
        <Chip
          label="Marcar destino"
          selected={mode === "destination"}
          onPress={() => setMode("destination")}
        />
        <Chip
          label="Novo relato"
          selected={mode === "report"}
          onPress={() => setMode("report")}
        />
      </View>
      <Text style={styles.subtitle}>
        Toque no mapa para{" "}
        {mode === "origin"
          ? "definir a origem"
          : mode === "destination"
            ? "definir o destino"
            : "marcar o local observado"}
        .
      </Text>
      <View style={styles.row}>
        {landmarks.map((p) => <Chip key={p.name} label={p.name} onPress={() => pick(p)} />)}
      </View>
      <Feedback error={error} success={success} />
      {mode !== "report" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Seu trajeto</Text>
          <Text style={styles.body}>
            Origem:{" "}
            {origin
              ? originName || `${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}`
              : "selecione no mapa"}
          </Text>
          <Text style={styles.body}>
            Destino:{" "}
            {destination
              ? destinationName || `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`
              : "selecione no mapa"}
          </Text>
          <Button
            title={routing ? "Consultando percurso…" : "Consultar trajeto"}
            disabled={!origin || !destination || routing}
            onPress={calculate}
          />
          {route ? (
            <>
              <Text style={styles.heading}>
                {(route.distance / 1000).toFixed(1)} km · cerca de{" "}
                {Math.round(route.duration / 60)} min
              </Text>
              <Text style={styles.subtitle}>
                Estimativa para carro via OSRM. Sem trânsito ao vivo ou
                navegação curva a curva.
              </Text>
              <Text style={styles.body}>
                {contextual.length
                  ? `${contextual.length} relato(s) revisado(s) próximo(s) ao percurso.`
                  : "Sem relatos revisados próximos ao percurso. Isso não significa ausência de problemas."}
              </Text>
              {contextual.map((r) => (
                <Text key={r.id} style={styles.subtitle}>
                  {r.title} · {when(r.observedAt)}
                </Text>
              ))}
              <Button
                title="Simular oferta com caixinha"
                secondary
                onPress={() => {
                  setSimulation(true);
                  setMinimized(false);
                }}
              />
            </>
          ) : null}
        </View>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Relatar uma situação</Text>
          <Text style={styles.subtitle}>
            {point
              ? `Local selecionado: ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
              : "Selecione o local no mapa ou nos pontos de referência."}
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
      )}
      {simulation ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: "#E0E9E0",
              borderColor: "#087F71",
              borderWidth: 2,
            },
          ]}
        >
          <Text style={styles.label}>
            SIMULAÇÃO DE OFERTA • DENTRO DO SAFERIDE
          </Text>
          <Text style={styles.heading}>Origem e destino selecionados</Text>
          <Text style={styles.subtitle}>
            Este painel não está sobre a Uber e não aceita uma corrida real.
          </Text>
          <View style={[styles.card, { backgroundColor: "#153E38" }]}>
            <Text style={[styles.heading, { color: "white" }]}>
              SafeRide {minimized ? "· minimizado" : ""}
            </Text>
            {!minimized ? (
              <Text style={{ color: "white", lineHeight: 22 }}>
                {contextual.length
                  ? contextual[0].title +
                    " - " +
                    (contextual[0].source ?? "Relato revisado") +
                    " - " +
                    when(contextual[0].observedAt)
                  : "Sem informações revisadas próximas deste trajeto."}
              </Text>
            ) : null}
            <Button
              title={minimized ? "Expandir" : "Minimizar"}
              onPress={() => setMinimized(!minimized)}
            />
          </View>
          <Button
            title="Fechar simulação"
            secondary
            onPress={() => setSimulation(false)}
          />
        </View>
      ) : null}
      <Text style={styles.heading}>Relatos revisados</Text>
      <View style={styles.row}>
        <Chip
          label="Todos"
          selected={filter === "TODOS"}
          onPress={() => setFilter("TODOS")}
        />
        {Object.entries(categories).map(([k, v]) => (
          <Chip
            key={k}
            label={v}
            selected={filter === k}
            onPress={() => setFilter(k)}
          />
        ))}
      </View>
      <Button title="Atualizar mapa e relatos" secondary onPress={q.refresh} />
      <ResourceState {...q} />
      {shown.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.label}>
            {categories[r.category as keyof typeof categories]} ·{" "}
            {when(r.observedAt)}
          </Text>
          <Text style={styles.heading}>{r.title}</Text>
          <Button
            title="Ver informações do relato"
            secondary
            onPress={() => setDetail(detail === r.id ? null : r.id)}
          />
          {selected?.id === r.id ? (
            <>
              <Text style={styles.body}>{r.body}</Text>
              <Text style={styles.subtitle}>
                {r.source}. Revisão não comprova o fato.{" "}
                {r.category === "SEGURANCA"
                  ? "Ocorrência registrada; não indica crime em andamento."
                  : ""}
              </Text>
              {r.validUntil ? (
                <Text style={styles.subtitle}>
                  Revisão necessária até: {when(r.validUntil)}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      ))}
      {!q.loading && !q.error && shown.length === 0 ? (
        <Text style={styles.subtitle}>
          Nenhum relato revisado nesta seleção. O mapa não classifica regiões
          como seguras ou perigosas.
        </Text>
      ) : null}
          <Text style={styles.subtitle}>Protótipo acadêmico · fontes e detalhes nos relatos.</Text>
        </ScrollView> : null}
      </View> : null}
    </View>
  );
}
