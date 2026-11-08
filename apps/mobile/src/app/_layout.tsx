import Svg, { Path, Circle, type SvgProps } from "react-native-svg";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../lib/session";
import { colors } from "../components/ui";
import { SimulationThemeProvider } from "../lib/simulationTheme";
function TabIcon({ name, color, size }: { name: string; color: SvgProps["stroke"]; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
    {name === "index" ? <Path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5zm6-2v16m6-14v16" /> : null}
    {name === "simulation" ? <><Path d="M8 4l12 8-12 8V4z" /></> : null}
    {name === "history" ? <><Circle cx="12" cy="12" r="9"/><Path d="M12 7v5l3 2"/></> : null}
    {name === "settings" ? <><Path d="M4 7h16M4 17h16"/><Circle cx="9" cy="7" r="3"/><Circle cx="15" cy="17" r="3"/></> : null}
    {name === "community" ? <><Circle cx="9" cy="8" r="3" /><Path d="M3 21v-2a6 6 0 0112 0v2M16 5a3 3 0 010 6m2 3a5 5 0 013 5v2" /></> : null}
    {name === "news" ? <><Path d="M4 3h16v16a2 2 0 01-2 2H6a2 2 0 01-2-2V3zm4 12h8m-8 3h8" /><Path d="M8 7h8v5H8z" /></> : null}
    {name === "profile" ? <><Circle cx="12" cy="8" r="4" /><Path d="M4 21v-1a8 8 0 0116 0v1" /></> : null}
  </Svg>;
}
export default function Layout() {
  return (
    <SessionProvider><SimulationThemeProvider>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={({ route }) => ({
          headerTitle: "SafeRide",
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.paper },
          tabBarActiveTintColor: colors.teal,
          tabBarStyle: { backgroundColor: "white", minHeight: 68, paddingTop: 7 },
          tabBarInactiveTintColor: "#718079",
          tabBarLabelPosition: "below-icon",
          tabBarIcon: ({ color, size }) => <TabIcon name={route.name} color={color} size={size} />,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Mapa", headerShown: false }} />
        <Tabs.Screen name="simulation" options={{ title: "Simular", headerShown: false, href: null }} />
        <Tabs.Screen name="community" options={{ title: "Comunidade", href: null }} />
        <Tabs.Screen name="history" options={{ title: "Histórico", headerTitle: "Histórico" }} />
        <Tabs.Screen name="news" options={{ title: "Notícias" }} />
        <Tabs.Screen name="settings" options={{ title: "Ajustes", headerTitle: "Configurações" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil", href: null }} />
      </Tabs>
    </SimulationThemeProvider></SessionProvider>
  );
}
