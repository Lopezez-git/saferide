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
import { palettes, useSimulationTheme } from "../lib/simulationTheme";

type Palette = typeof palettes.dark;
function createStyles(p: Palette) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: p.background },
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
    color: p.text,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 14, lineHeight: 22, color: p.muted },
  card: {
    backgroundColor: p.surface,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: p.border,
  },
  heading: { fontSize: 19, fontWeight: "700", color: p.text },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: p.accent,
    letterSpacing: 1.5,
  },
  body: { fontSize: 15, lineHeight: 23, color: p.text },
  button: {
    backgroundColor: "#087F71",
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 14 },
  tag: {
    backgroundColor: p.accentSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
    padding: 13,
    minHeight: 48,
    fontSize: 15,
    backgroundColor: p.surface,
    color: p.text,
  },
  chip: {
    borderWidth: 1,
    borderColor: p.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: p.surface,
    minHeight: 44,
  },
  error: { color: p.danger, fontSize: 14, lineHeight: 21 },
  success: { color: p.accent, fontSize: 14, lineHeight: 21 },
  });
}
const sheets = { light: createStyles(palettes.light), dark: createStyles(palettes.dark) };
export function useAppStyles() {
  return sheets[useSimulationTheme().theme];
}

export function Page({
  title,
  subtitle,
  children,
  compact = false,
}: PropsWithChildren<{ title: string; subtitle: string; compact?: boolean }>) {
  const styles = useAppStyles();
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
  const styles = useAppStyles();
  const {palette: p} = useSimulationTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[
        styles.button,
        secondary ? { backgroundColor: p.accentSurface } : null,
        disabled ? { opacity: 0.5 } : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.buttonText, secondary ? { color: p.text } : null]}
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
  const styles = useAppStyles();
  const {palette: p} = useSimulationTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: p.text, borderColor: p.text }
          : null,
      ]}
    >
      <Text
        style={{
          color: selected ? p.surface : p.text,
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
  const styles = useAppStyles();
  const {palette: p} = useSimulationTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.subtitle}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={p.muted}
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
  const styles = useAppStyles();
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
  const styles = useAppStyles();
  const {palette: p} = useSimulationTheme();
  return loading ? (
    <ActivityIndicator accessibilityLabel="Carregando" color={p.accent} />
  ) : error ? (
    <View style={styles.card}>
      <Feedback error={error} />
      <Button title="Tentar novamente" onPress={refresh} />
    </View>
  ) : null;
}
