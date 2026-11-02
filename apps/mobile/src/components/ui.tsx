import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Link } from "expo-router";
export const colors = {
  ink: "#153E38",
  teal: "#087F71",
  paper: "#F3F6F0",
  muted: "#526C63",
  line: "#D9E3DA",
  gold: "#D08D29",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 36,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.muted },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  heading: { fontSize: 19, fontWeight: "700", color: colors.ink },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.teal,
    letterSpacing: 1.5,
  },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  button: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 14 },
  tag: {
    backgroundColor: "#E2EBDA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 13,
    minHeight: 48,
    fontSize: 15,
    backgroundColor: "white",
    color: colors.ink,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: "white",
    minHeight: 44,
  },
  error: { color: "#A63829", fontSize: 14, lineHeight: 21 },
  success: { color: colors.teal, fontSize: 14, lineHeight: 21 },
});
export function Page({
  title,
  subtitle,
  children,
  compact = false,
}: PropsWithChildren<{ title: string; subtitle: string; compact?: boolean }>) {
  const { width } = useWindowDimensions();
  const small = width < 480;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={styles.page}
      contentContainerStyle={[styles.content, small ? { padding: 12, gap: 12, paddingBottom: 28 } : null]}
    >
      {!compact ? <Text style={styles.label}>SAFERIDE / SÃO PAULO</Text> : null}
      <Text accessibilityRole="header" style={[styles.title, small || compact ? { fontSize: 24 } : null]}>
        {title}
      </Text>
      {!compact ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {!compact ? <View style={styles.tag}>
        <Text style={{ ...styles.subtitle, fontSize: 12 }}>
          Protótipo acadêmico • use dados de teste
        </Text>
      </View> : null}
      {children}
      {compact ? <Text style={styles.subtitle}>Protótipo acadêmico • use dados de teste</Text> : null}
    </ScrollView>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[
        styles.button,
        secondary ? { backgroundColor: "#E2EBDA" } : null,
        disabled ? { opacity: 0.5 } : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.buttonText, secondary ? { color: colors.ink } : null]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.ink, borderColor: colors.ink }
          : null,
      ]}
    >
      <Text
        style={{
          color: selected ? "white" : colors.ink,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.subtitle}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#81928A"
        {...props}
        style={[
          styles.input,
          props.multiline ? { minHeight: 96, textAlignVertical: "top" } : null,
          props.style,
        ]}
      />
    </View>
  );
}
export function Feedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {success ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {success}
        </Text>
      ) : null}
    </>
  );
}
export function ResourceState({
  loading,
  error,
  refresh,
}: {
  loading: boolean;
  error: string;
  refresh: () => void;
}) {
  return loading ? (
    <ActivityIndicator accessibilityLabel="Carregando" color={colors.teal} />
  ) : error ? (
    <View style={styles.card}>
      <Feedback error={error} />
      <Button title="Tentar novamente" onPress={refresh} />
    </View>
  ) : null;
}
export function SignInNotice() {
  return (
    <View style={styles.card}>
      <Text style={styles.body}>Entre na sua conta para participar.</Text>
      <Link
        href="/profile"
        style={{ color: colors.teal, fontWeight: "700", paddingVertical: 10 }}
      >
        Entrar ou criar conta →
      </Link>
    </View>
  );
}
