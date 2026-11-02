import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../components/ui";
export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitle: "SafeRide",
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.paper },
          tabBarActiveTintColor: colors.teal,
          tabBarStyle: { backgroundColor: "white" },
          tabBarIcon: () => null,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Mapa" }} />
        <Tabs.Screen name="community" options={{ title: "Comunidade" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
      </Tabs>
    </>
  );
}
