import { useRef, useState } from "react";
import { Text, View } from "react-native";
import {
  Page,
  styles,
  Button,
  Chip,
  Field,
  Feedback,
  ResourceState,
  SignInNotice,
} from "../components/ui";
import MapCanvas from "../components/MapCanvas";
import { MapPoint } from "../components/mapHtml";
import { useResource } from "../lib/useResource";
import { api, Report, message, when } from "../lib/client";
import { useSession } from "../lib/session";
import { nearRoute } from "../lib/spatial";
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
type Route = {
  distance: number;
  duration: number;
  geometry: { coordinates: number[][] };
};
export default function MapScreen() {
  const { token, user } = useSession();
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("PAVIMENTO");
  const [busy, setBusy] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [minimized, setMinimized] = useState(false);
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
      if (mode === "origin") setOrigin(p);
      else setDestination(p);
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
      if (id === request.current) setRoute(r);
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
    <Page
      title="Conheça o caminho."
      subtitle="Consulte o trajeto e os relatos antes de fazer sua escolha."
    >
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
      <MapCanvas
        data={{
          reports: shown,
          origin,
          destination,
          selected: point,
          route: route?.geometry.coordinates ?? null,
        }}
        onPick={pick}
        onReport={setDetail}
      />
      <Field
        label="Buscar ponto de referência"
        value={search}
        onChangeText={setSearch}
        placeholder="Sé, Paulista, Ibirapuera ou Tietê"
      />
      <View style={styles.row}>
        {landmarks
          .filter((p) =>
            p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
          )
          .map((p) => (
            <Chip key={p.name} label={p.name} onPress={() => pick(p)} />
          ))}
      </View>
      <Text style={styles.subtitle}>
        Busca nesta lista de referência. Para outros locais, toque no mapa.
      </Text>
      <Feedback error={error} success={success} />
      {mode !== "report" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Seu trajeto</Text>
          <Text style={styles.body}>
            Origem:{" "}
            {origin
              ? `${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}`
              : "selecione no mapa"}
          </Text>
          <Text style={styles.body}>
            Destino:{" "}
            {destination
              ? `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`
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
                    " � " +
                    (contextual[0].source ?? "Relato revisado") +
                    " � " +
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
    </Page>
  );
}
