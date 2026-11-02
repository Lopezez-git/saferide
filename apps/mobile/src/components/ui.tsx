import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
export const colors = {
  ink: "#173B38",
  teal: "#087F71",
  paper: "#F5F7F2",
  muted: "#586C65",
  line: "#DCE5DC",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  heading: { fontSize: 19, fontWeight: "700", color: colors.ink },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
    letterSpacing: 1,
  },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  button: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  tag: { backgroundColor: "#E0EEE6", padding: 10, borderRadius: 12 },
});
export function Page({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.label}>SAFERIDE / PROTÓTIPO</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.tag}>
        <Text style={styles.body}>Demonstração • informações fictícias</Text>
      </View>
      {children}
    </ScrollView>
  );
}
export function Button({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function RequestState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  return loading ? (
    <ActivityIndicator
      accessibilityLabel="Carregando exemplos"
      color={colors.teal}
    />
  ) : error ? (
    <View style={styles.card}>
      <Text accessibilityRole="alert" style={styles.body}>
        {error}
      </Text>
      <Button title="Tentar novamente" onPress={retry} />
    </View>
  ) : null;
}
