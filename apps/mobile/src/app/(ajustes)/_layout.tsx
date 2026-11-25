import { Stack } from "expo-router";
import { useSimulationTheme } from "../../lib/simulationTheme";

export const unstable_settings = { initialRouteName: "settings" };

export default function SettingsLayout() {
  const { palette } = useSimulationTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="settings" options={{ title: "Configurações" }} />
      <Stack.Screen name="community" options={{ title: "Comunidade" }} />
      <Stack.Screen name="profile" options={{ title: "Meu perfil e reputação" }} />
    </Stack>
  );
}
