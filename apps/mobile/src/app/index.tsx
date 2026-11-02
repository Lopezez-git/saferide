import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { Page, RequestState, styles, colors } from "../components/ui";
import { useDemo } from "../lib/useDemo";
import { DemoList, Occurrence } from "../lib/api";
export default function MapScreen() {
  const query = useDemo<DemoList<Occurrence>>("occurrences");
  const [selected, setSelected] = useState<number | null>(null);
  const items = query.data?.items ?? [];
  const detail = items.find((item) => item.id === selected);
  return (
    <Page
      title="Conheça o caminho."
      subtitle="Explore os exemplos e consulte a origem de cada informação."
    >
      <View
        style={{
          height: 240,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: "#E5EBDE",
        }}
        accessibilityLabel="Mapa esquemático de demonstração, não representa ruas reais"
      >
        <Svg width="100%" height="100%" viewBox="0 0 360 240">
          <Rect x="235" y="15" width="100" height="65" rx="20" fill="#C3D7B9" />
          <Path
            d="M-20 50 L380 190 M55 -10 L170 260 M250 -10 L220 250 M-10 175 L380 50"
            stroke="#FFFFFF"
            strokeWidth="17"
            fill="none"
          />
          <Path
            d="M80 20 L140 150 L245 185"
            stroke="#087F71"
            strokeWidth="5"
            fill="none"
            strokeDasharray="9 7"
          />
        </Svg>
        <Text
          style={{
            position: "absolute",
            left: 15,
            bottom: 15,
            color: colors.ink,
            backgroundColor: "#FFFFFF",
            padding: 8,
            borderRadius: 8,
          }}
        >
          Mapa ilustrativo • sem navegação
        </Text>
      </View>
      <RequestState {...query} />
      {query.data && items.length === 0 ? (
        <Text style={styles.body}>
          Sem exemplos disponíveis. Isso não indica ausência de problemas.
        </Text>
      ) : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalhes: ${item.title}`}
          accessibilityState={{ selected: selected === item.id }}
          onPress={() => setSelected(item.id)}
          style={[
            styles.card,
            selected === item.id ? { borderColor: colors.teal } : null,
          ]}
        >
          <Text style={styles.label}>{item.category} • FICTÍCIO</Text>
          <Text style={styles.heading}>{item.title}</Text>
          <Text style={styles.subtitle}>Consultar detalhes →</Text>
        </Pressable>
      ))}
      {detail ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>
            {detail.title}
          </Text>
          <Text style={styles.body}>{detail.description}</Text>
          <Text style={styles.subtitle}>{detail.source}</Text>
          <Text style={styles.subtitle}>
            Data do exemplo: {detail.occurredAt.replace("T", " ")} ·{" "}
            {detail.precision}
          </Text>
        </View>
      ) : null}
    </Page>
  );
}
