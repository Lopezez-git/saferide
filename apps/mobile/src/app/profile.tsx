import { Text, View } from "react-native";
import { Page, RequestState, styles } from "../components/ui";
import { useDemo } from "../lib/useDemo";
import { Profile } from "../lib/api";
export default function ProfileScreen() {
  const query = useDemo<Profile>("profile");
  return (
    <Page
      title="Seu espaço."
      subtitle="Sua atividade e suas plataformas em um só lugar."
    >
      <RequestState {...query} />
      {query.data ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{query.data.name}</Text>
          <Text style={styles.body}>
            {query.data.activity} · {query.data.vehicle}
          </Text>
          <Text style={styles.label}>PLATAFORMAS AUTODECLARADAS</Text>
          <Text style={styles.body}>{query.data.platforms.join(" · ")}</Text>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.heading}>Caixinha flutuante</Text>
        <Text style={styles.body}>
          Planejada para a próxima etapa Android. Esta versão ainda não exibe
          informações sobre outros aplicativos.
        </Text>
      </View>
    </Page>
  );
}
