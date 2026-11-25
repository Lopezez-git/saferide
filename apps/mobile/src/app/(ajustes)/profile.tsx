import { Redirect } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  Page,
  useAppStyles,
  Field,
  Button,
  Chip,
  Feedback,
  ResourceState,
} from "../../components/ui";
import { useSession } from "../../lib/session";
import { api, User, message, Report } from "../../lib/client";
import { useResource } from "../../lib/useResource";
function Account({ user }: { user: User }) {
  const styles = useAppStyles();
  const session = useSession();
  const [name, setName] = useState(user.name);
  const [activity, setActivity] = useState(user.activity);
  const [vehicle, setVehicle] = useState(user.vehicle);
  const [platforms, setPlatforms] = useState(user.platforms);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const reports = useResource<Report[]>("/reports/mine", session.token);
  const reputation = useResource<{points: number; publishedReports: number; confirmationsReceived: number}>("/me/reputation", session.token);
  async function save() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      session.update(
        await api<User>("/me", {
          method: "PUT",
          token: session.token,
          body: { name, activity, vehicle, platforms },
        }),
      );
      setSuccess("Perfil salvo.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.heading}>{user.name}</Text>
        <Text style={styles.subtitle}>{user.email}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Minha reputação</Text>
        {reputation.data ? <Text style={styles.body}>{reputation.data.points} ponto(s) · {reputation.data.publishedReports} relato(s) publicado(s) · {reputation.data.confirmationsReceived} confirmação(ões) recebida(s)</Text> : null}
        <Text style={styles.subtitle}>Cada relato aprovado vale um ponto. Cada outra pessoa que confirma esse relato acrescenta um ponto. Relatos retirados pela moderação deixam de pontuar.</Text>
        <ResourceState {...reputation} />
        <Button secondary title="Atualizar reputação" onPress={reputation.refresh} />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Editar perfil</Text>
        <Field
          label="Nome público"
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Field
          label="Atividade"
          value={activity}
          onChangeText={setActivity}
          maxLength={60}
        />
        <Field
          label="Veículo"
          value={vehicle}
          onChangeText={setVehicle}
          maxLength={40}
        />
        <Text style={styles.label}>PLATAFORMAS EM QUE VOCÊ TRABALHA</Text>
        <View style={styles.row}>
          {["uber", "99", "ifood", "rappi", "outra", "independente"].map(
            (p) => (
              <Chip
                key={p}
                label={p}
                selected={platforms.includes(p)}
                onPress={() =>
                  setPlatforms((old) =>
                    old.includes(p) ? old.filter((x) => x !== p) : [...old, p],
                  )
                }
              />
            ),
          )}
        </View>
        <Text style={styles.subtitle}>
          Informações autodeclaradas. Não conecta suas contas externas.
        </Text>
        <Feedback error={error} success={success} />
        <Button
          title={busy ? "Salvando…" : "Salvar perfil"}
          disabled={busy || !platforms.length}
          onPress={save}
        />
        <Button
          title="Sair da conta"
          secondary
          onPress={() => {
            session.logout().catch((e) => setError(message(e)));
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Meus relatos</Text>
        <Button title="Atualizar relatos" secondary onPress={reports.refresh} />
        <ResourceState {...reports} />
        {reports.data?.map((r) => (
          <View key={r.id}>
            <Text style={styles.body}>{r.title}</Text>
            <Text style={styles.label}>
              {(
                {
                  PENDING: "Em revisão",
                  PUBLISHED: "Publicado",
                  REJECTED: "Não aprovado",
                  WITHDRAWN: "Retirado",
                } as Record<string, string>
              )[r.status ?? ""] ?? r.status}
            </Text>
          </View>
        ))}
        {reports.data?.length === 0 ? (
          <Text style={styles.subtitle}>
            Envie seu primeiro relato pela aba Mapa.
          </Text>
        ) : null}
      </View>
      {user.role === "MODERATOR" ? <Moderation /> : null}
    </>
  );
}
function Moderation() {
  const styles = useAppStyles();
  const { token } = useSession();
  const q = useResource<Report[]>("/moderation/reports", token);
  const [reason, setReason] = useState(
    "Revisão acadêmica: conteúdo e localização conferidos.",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function review(id: string, status: string) {
    setBusy(true);
    setError("");
    try {
      await api("/moderation/reports/" + id, {
        method: "POST",
        token,
        body: { status, reason },
      });
      q.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Revisar relatos</Text>
      <Field
        label="Motivo da decisão"
        value={reason}
        onChangeText={setReason}
        maxLength={300}
      />
      <Feedback error={error} />
      <ResourceState {...q} />
      {q.data?.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.heading}>{r.title}</Text>
          <Text style={styles.body}>{r.body}</Text>
          <Text style={styles.subtitle}>
            {r.latitude}, {r.longitude} · {r.status}
          </Text>
          <Button
            title="Aprovar"
            disabled={busy}
            onPress={() => review(r.id, "PUBLISHED")}
          />
          <Button
            title={r.status === "PUBLISHED" ? "Retirar" : "Rejeitar"}
            secondary
            disabled={busy}
            onPress={() =>
              review(r.id, r.status === "PUBLISHED" ? "WITHDRAWN" : "REJECTED")
            }
          />
        </View>
      ))}
    </View>
  );
}
export default function Profile() {
  const styles = useAppStyles();
  const { user, ready } = useSession();
  if (ready && !user) return <Redirect href="/settings" />;
  return (
    <Page
      title="Seu espaço."
      subtitle="Seu trabalho, suas plataformas e suas contribuições."
    >
      {!ready ? (
        <Text style={styles.body}>Restaurando sua sessão…</Text>
      ) : user ? (
        <Account key={user.id} user={user} />
      ) : null}
      <View style={styles.card}>
        <Text style={styles.heading}>Sobre a caixinha</Text>
        <Text style={styles.subtitle}>
          A aba Mapa permite simular a oferta e seu contexto. A sobreposição
          real sobre outros apps depende da etapa Android.
        </Text>
      </View>
    </Page>
  );
}
