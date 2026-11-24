import { Modal, ScrollView, Text, View } from "react-native";
import { Button, styles } from "./ui";

export type RouteOption = {
  duration: number;
  distance: number;
  geometry: { coordinates: number[][] };
  policeRecords: number | null;
  pavementRequests: number | null;
  activeReports: number;
};

export type RouteComparison = {
  routes: RouteOption[];
  radiusMeters: number;
  policePeriodEnd: string | null;
  pavementPeriodEnd: string | null;
};

type Props = {
  comparison: RouteComparison;
  selected: number;
  onSelect: (index: number) => void;
  onClose: () => void;
};

function period(value: string | null) {
  if (!value) return "período indisponível";
  const [year, month] = value.split("-");
  return month + "/" + year;
}

export default function RouteOptions({ comparison, selected, onSelect, onClose }: Props) {
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#10231c77", padding: 18 }}>
      <View style={{ backgroundColor: "white", borderRadius: 20, padding: 18, gap: 12, maxHeight: "90%", maxWidth: 540, width: "100%" }}>
        <Text accessibilityRole="header" style={styles.title}>Comparar trajetos</Text>
        <ScrollView contentContainerStyle={{ gap: 14 }}>
          <Text style={styles.body}>{comparison.routes.length === 1 ? "O serviço de rotas encontrou um único caminho." : "Escolha o caminho que deseja ver no mapa."} Os totais consideram até {comparison.radiusMeters} m de cada percurso.</Text>
          {comparison.routes.map((route, index) => <View key={index} style={styles.card}>
            <Text style={styles.heading}>Trajeto {index + 1} · {(route.distance / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · {Math.round(route.duration / 60)} min</Text>
            <Text style={styles.body}>BOs de veículos (SSP-SP): {route.policeRecords ?? "base indisponível"}</Text>
            <Text style={styles.body}>Pedidos de tapa-buraco (SP156): {route.pavementRequests ?? "base indisponível"}</Text>
            <Text style={styles.body}>Relatos revisados em vigor: {route.activeReports}</Text>
            <Button title={selected === index ? "Ver trajeto selecionado no mapa" : "Escolher trajeto " + (index + 1)} secondary={selected !== index} onPress={() => onSelect(index)} />
          </View>)}
          <Text style={styles.subtitle}>Bases da capital até {period(comparison.policePeriodEnd)} (SSP-SP) e {period(comparison.pavementPeriodEnd)} (SP156). Caminhos mais longos podem acumular mais registros. Os totais históricos não estimam o risco individual. O tempo do OSRM exclui trânsito ao vivo.</Text>
        </ScrollView>
        <Button secondary title="Fechar comparação" onPress={onClose} />
      </View>
    </View>
  </Modal>;
}
