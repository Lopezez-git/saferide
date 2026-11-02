import { useState } from "react";
import { Text, View } from "react-native";
import {
  Page,
  styles,
  Button,
  Field,
  Chip,
  Feedback,
  ResourceState,
  SignInNotice,
} from "../components/ui";
import { api, Post, Comment, message, when } from "../lib/client";
import { useSession } from "../lib/session";
import { useResource } from "../lib/useResource";
const categories = {
  DICA: "Dicas",
  DUVIDA: "Dúvidas",
  CONVERSA: "Conversas",
  EXPERIENCIA: "Experiências",
};
function Comments({ post, onChange }: { post: Post; onChange: () => void }) {
  const { token, user } = useSession();
  const q = useResource<Comment[]>("/posts/" + post.id + "/comments");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    setError("");
    try {
      await api("/posts/" + post.id + "/comments", {
        method: "POST",
        token,
        body: { body },
      });
      setBody("");
      q.refresh();
      onChange();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <ResourceState {...q} />
      {q.data?.map((c) => (
        <View key={c.id} style={[styles.card, { backgroundColor: "#F3F6F0" }]}>
          <Text style={styles.label}>{c.author}</Text>
          <Text style={styles.body}>{c.body}</Text>
          {user?.id === c.authorId ? (
            <Button
              title="Excluir meu comentário"
              secondary
              onPress={() => {
                api("/comments/" + c.id, { method: "DELETE", token })
                  .then(() => {
                    q.refresh();
                    onChange();
                  })
                  .catch((e) => setError(message(e)));
              }}
            />
          ) : null}
        </View>
      ))}
      {q.data?.length === 0 ? (
        <Text style={styles.subtitle}>Seja o primeiro a comentar.</Text>
      ) : null}
      {user ? (
        <>
          <Field
            label="Seu comentário"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
          />
          <Button
            title={busy ? "Enviando…" : "Comentar"}
            onPress={send}
            disabled={busy || !body.trim()}
          />
        </>
      ) : (
        <SignInNotice />
      )}
      <Feedback error={error} />
    </View>
  );
}
export default function Community() {
  const { token, user } = useSession();
  const q = useResource<Post[]>("/posts");
  const [filter, setFilter] = useState("TODOS");
  const [category, setCategory] = useState("CONVERSA");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  async function publish() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api("/posts", { method: "POST", token, body: { body, category } });
      setBody("");
      setSuccess("Publicação enviada para a comunidade.");
      q.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await api("/posts/" + id, { method: "DELETE", token });
      setConfirm(null);
      q.refresh();
    } catch (e) {
      setError(message(e));
    }
  }
  const posts = q.data?.filter(
    (p) => filter === "TODOS" || p.category === filter,
  );
  return (
    <Page
      title="A profissão conecta."
      subtitle="Dicas, dúvidas e conversas de quem vive o caminho todos os dias."
    >
      {user ? (
        <View style={styles.card}>
          <Text style={styles.heading}>O que você quer compartilhar?</Text>
          <View style={styles.row}>
            {Object.entries(categories).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={category === key}
                onPress={() => setCategory(key)}
              />
            ))}
          </View>
          <Field
            label="Sua publicação"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            placeholder="Compartilhe uma experiência ou faça uma pergunta…"
          />
          <Text style={styles.subtitle}>
            Não publique dados de passageiros, placas ou acusações pessoais.
            Relatos para o mapa são enviados na aba Mapa.
          </Text>
          <Button
            title={busy ? "Publicando…" : "Publicar"}
            onPress={publish}
            disabled={busy || !body.trim()}
          />
        </View>
      ) : (
        <SignInNotice />
      )}
      <Feedback error={error} success={success} />
      <View style={styles.row}>
        <Chip
          label="Todas"
          selected={filter === "TODOS"}
          onPress={() => setFilter("TODOS")}
        />
        {Object.entries(categories).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </View>
      <Button title="Atualizar feed" secondary onPress={q.refresh} />
      <ResourceState {...q} />
      {posts?.map((post) => (
        <View key={post.id} style={styles.card}>
          <Text style={styles.label}>
            {categories[post.category as keyof typeof categories]} ·{" "}
            {when(post.createdAt)}
          </Text>
          <Text style={styles.heading}>{post.author}</Text>
          <Text style={styles.subtitle}>
            {post.platforms.split(",").join(" · ")}
          </Text>
          <Text style={styles.body}>{post.body}</Text>
          <Button
            title={
              open === post.id
                ? "Fechar comentários"
                : `Comentários (${post.comments})`
            }
            secondary
            onPress={() => setOpen(open === post.id ? null : post.id)}
          />
          {user?.id === post.authorId ? (
            <Button
              title={
                confirm === post.id
                  ? "Confirmar exclusão"
                  : "Excluir minha publicação"
              }
              secondary
              onPress={() =>
                confirm === post.id ? remove(post.id) : setConfirm(post.id)
              }
            />
          ) : null}
          {open === post.id ? (
            <Comments post={post} onChange={q.refresh} />
          ) : null}
        </View>
      ))}
      {posts?.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.heading}>A conversa começa com você.</Text>
          <Text style={styles.subtitle}>
            Ainda não há publicações nesta categoria.
          </Text>
        </View>
      ) : null}
    </Page>
  );
}
