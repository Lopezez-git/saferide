import { Text, View } from "react-native";
import { Page, RequestState, styles } from "../components/ui";
import { useDemo } from "../lib/useDemo";
import { DemoList, Post } from "../lib/api";
export default function Community() {
  const query = useDemo<DemoList<Post>>("posts");
  return (
    <Page
      title="Quem vive a profissão."
      subtitle="Um espaço para trocar experiências, dicas e dúvidas."
    >
      <RequestState {...query} />
      {query.data?.items.map((post) => (
        <View key={post.id} style={styles.card}>
          <Text style={styles.label}>{post.category}</Text>
          <Text style={styles.heading}>{post.author}</Text>
          <Text style={styles.body}>{post.body}</Text>
          <Text style={styles.subtitle}>
            {post.comments} comentário(s) de exemplo
          </Text>
        </View>
      ))}
      {query.data?.items.length === 0 ? (
        <Text style={styles.body}>Ainda não há publicações.</Text>
      ) : null}
      <Text style={styles.subtitle}>
        Prévia de leitura. Cadastro, publicação e comentários serão
        implementados com autenticação.
      </Text>
    </Page>
  );
}
