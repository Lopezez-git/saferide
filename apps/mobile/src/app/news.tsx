import { Linking, Text, View } from "react-native";
import { useState } from "react";
import {
  Page,
  styles,
  Button,
  Feedback,
  ResourceState,
} from "../components/ui";
import { useResource } from "../lib/useResource";
import { when, message } from "../lib/client";
type News = {
  status: string;
  lastAttempt: string;
  items: {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    collectedAt: string;
  }[];
};
export default function NewsScreen() {
  const q = useResource<News>("/news");
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  return (
    <Page
      title="O que acontece na região."
      subtitle="Notícias sobre São Paulo e região. Confira o município na fonte."
    >
      <Text style={styles.subtitle}>
        A coleta ocorre a cada 15 minutos. Uma notícia não confirma situação em
        andamento e não gera alerta no mapa sem revisão.
      </Text>
      <Button
        title="Consultar notícias salvas"
        secondary
        onPress={() => {
          setDemo(false);
          q.refresh();
        }}
      />
      <ResourceState {...q} />
      <Feedback error={error} />
      {q.data ? (
        <View style={styles.tag}>
          <Text style={styles.body}>
            {q.data.status === "UNAVAILABLE"
              ? "Fonte indisponível. Exibindo somente notícias já salvas."
              : q.data.status === "NO_RECENT_ITEMS"
                ? "Nenhuma notícia recente elegível. As notícias salvas ainda válidas continuam abaixo."
                : q.data.status === "WAITING"
                  ? "Primeira coleta em andamento. Consulte novamente em instantes."
                  : "Coleta concluída."}
          </Text>
          {q.data.lastAttempt ? (
            <Text style={styles.subtitle}>
              Última tentativa: {when(q.data.lastAttempt)}
            </Text>
          ) : null}
        </View>
      ) : null}
      {q.data?.items.map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.label}>{n.source}</Text>
          <Text style={styles.heading}>{n.title}</Text>
          <Text style={styles.subtitle}>
            Publicação:{" "}
            {n.publishedAt ? when(n.publishedAt) : "data não informada"}
          </Text>
          <Text style={styles.subtitle}>Coletada: {when(n.collectedAt)}</Text>
          <Button
            title="Ler na fonte original ↗"
            secondary
            onPress={() => {
              Linking.openURL(n.url).catch((e) => setError(message(e)));
            }}
          />
        </View>
      ))}
      {q.data?.items.length === 0 ? (
        <Text style={styles.subtitle}>
          Nenhuma notícia elegível salva. Isso não indica ausência de
          ocorrências.
        </Text>
      ) : null}
      <Button
        title={
          demo
            ? "Ocultar exemplo fictício"
            : "Ver exemplo fictício para apresentação"
        }
        secondary
        onPress={() => setDemo(!demo)}
      />
      {demo ? (
        <View style={styles.card}>
          <Text style={styles.label}>
            DEMONSTRAÇÃO • NÃO É UMA NOTÍCIA REAL
          </Text>
          <Text style={styles.heading}>
            Obra altera acesso a uma rua de exemplo
          </Text>
          <Text style={styles.body}>
            Este cartão mostra como uma notícia seria apresentada. Não tem
            ligação com um evento real nem entra nos alertas.
          </Text>
        </View>
      ) : null}
    </Page>
  );
}
