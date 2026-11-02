import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../lib/session";
import { colors } from "../components/ui";
export default function Layout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerTitle: "SafeRide",
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.paper },
          tabBarActiveTintColor: colors.teal,
          tabBarStyle: { backgroundColor: "white", minHeight: 62 },
          tabBarIcon: () => null,
          tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Mapa" }} />
        <Tabs.Screen name="community" options={{ title: "Comunidade" }} />
        <Tabs.Screen name="news" options={{ title: "Notícias" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
      </Tabs>
    </SessionProvider>
  );
}
