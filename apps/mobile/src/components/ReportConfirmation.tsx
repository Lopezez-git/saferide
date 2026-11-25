import { useState } from "react";
import { Text, View } from "react-native";
import { api, message, type Report } from "../lib/client";
import { Button, useAppStyles } from "./ui";

export default function ReportConfirmation({ report, token, onChange }: {
  report: Report;
  token: string | null;
  onChange: () => void;
}) {
  const styles = useAppStyles();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function vote() {
    setPending(true);
    setError("");
    try {
      await api("/reports/" + report.id + "/confirmation", {
        method: report.confirmedByMe ? "DELETE" : "PUT", token,
      });
      onChange();
    } catch (e) {
      setError(message(e));
    } finally {
      setPending(false);
    }
  }
  return <View style={{ gap: 8 }}>
    <Text style={styles.subtitle}>Confirmações da comunidade: {report.confirmations ?? 0} · Pontos do autor: {report.authorPoints ?? 0}</Text>
    {token && report.canConfirm ? <Button secondary disabled={pending}
      title={report.confirmedByMe ? "Retirar minha confirmação" : "Também observei esta situação"}
      onPress={vote} /> : null}
    {error ? <Text accessibilityRole="alert" style={styles.body}>{error}</Text> : null}
  </View>;
}
