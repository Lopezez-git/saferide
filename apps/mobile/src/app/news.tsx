import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Page, useAppStyles, Chip, Feedback, ResourceState } from "../components/ui";
import { message, when } from "../lib/client";
import { newsCopy, newsLink } from "../lib/newsLink";
import { useSimulationTheme } from "../lib/simulationTheme";
import { newsCategories, type NewsCategory, type NewsFeed } from "../lib/routeNews";
import { useResource } from "../lib/useResource";

const filters = ["Todas", ...newsCategories] as const;

export default function NewsScreen() {
  const styles = useAppStyles();
  const {palette} = useSimulationTheme();
  const narrow = useWindowDimensions().width < 600;
  const q = useResource<NewsFeed>("/news?editorial=true");
  const { refresh } = q;
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (!firstFocus.current) refresh();
    firstFocus.current = false;
    const interval = setInterval(() => {
      if (AppState.currentState === "active") refresh();
    }, 60000);
    const foreground = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => { clearInterval(interval); foreground.remove(); };
  }, [refresh]));
  const [filter, setFilter] = useState<NewsCategory | "Todas">("Todas");
  const [error, setError] = useState("");
  const items = q.data?.items.filter(item => filter === "Todas" || item.category === filter);
  return (
    <Page compact title="Notícias para quem dirige" subtitle="São Paulo e região">
      <View style={layout.metaRow}>
        <Text style={styles.subtitle}>São Paulo e região · últimos 7 dias</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Atualizar notícias" hitSlop={6} onPress={q.refresh} style={layout.action}>
          <Text style={{color:palette.muted}}>↻ Atualizar</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={layout.filterStrip} contentContainerStyle={layout.filterRow}>
        {filters.map(label => <Chip key={label} label={label} selected={label === filter} onPress={() => setFilter(label)} />)}
      </ScrollView>
      <ResourceState {...q} loading={q.loading && !q.data} />
      <Feedback error={error} />
      {q.data?.status === "UNAVAILABLE" && <Text style={styles.subtitle}>Fontes indisponíveis. Exibindo a última coleta disponível.</Text>}
      <View style={{gap: narrow ? 8 : 16}}>
      {items?.map((item, index) => {
        const link = newsLink(item);
        const copy = newsCopy(item);
        const lead = index === 0;
        const ink = lead ? "#f5faf7" : palette.text;
        const secondary = lead ? "#d1e5df" : palette.muted;
        const accent = lead ? "#a1e6ce" : palette.accent;
        const publisher = copy.publisher === "band.com.br" ? "Band" : copy.publisher;
        const openArticle = () => {
          setError("");
          Linking.openURL(link.url).catch(e => setError(message(e)));
        };
        const cardStyle = [styles.card, lead && layout.leadCard];
        if (narrow) {
          return <Pressable key={item.id} accessibilityRole="link"
            accessibilityLabel={`${copy.headline}. ${publisher}. ${link.label}`}
            onPress={openArticle}
            style={({pressed}) => [...cardStyle, layout.mobileCard, pressed && layout.pressed]}>
            <View style={layout.mobileByline}>
              <Text style={[layout.kicker,{color:accent}]}>{item.category.toLocaleUpperCase("pt-BR")}</Text>
              <Text style={[layout.timestamp,{color:secondary}]}>{when(item.publishedAt)}</Text>
            </View>
            <Text numberOfLines={2} style={[layout.mobileTitle, lead && layout.mobileLeadTitle,{color:ink}]}>{copy.headline}</Text>
            {copy.description ? <Text numberOfLines={2} style={[layout.preview,{color:secondary}]}>{copy.description}</Text> : null}
            <Text numberOfLines={1} style={[layout.source,{color:accent}]}>{publisher} ↗</Text>
          </Pressable>;
        }
        return <View key={item.id} style={cardStyle}>
          <View style={layout.section}><View style={[layout.rule,{backgroundColor:accent}]} /><Text style={[styles.label,{color:accent}]}>{item.category.toLocaleUpperCase("pt-BR")}</Text></View>
          <Text accessibilityRole="header" style={[layout.headline, {color:ink, fontSize:lead ? 34 : 22}]}>{copy.headline}</Text>
          {copy.description ? <Text style={[layout.description,{color:secondary}]}>{copy.description}</Text> : null}
          <View style={[layout.footer,{borderTopColor:lead ? "#3a5e54" : palette.border}]}>
            <Text style={[layout.credit,{color:secondary}]}>{publisher} · {when(item.publishedAt)}</Text>
            <Pressable accessibilityRole="link" accessibilityLabel={link.label + " · " + copy.headline} onPress={openArticle} style={({pressed}) => [layout.action,{opacity:pressed ? 0.65 : 1}]}>
              <Text style={[layout.link,{color:accent}]}>{link.label} ↗</Text>
            </Pressable>
          </View>
        </View>;
      })}
      </View>
      {items?.length === 0 && <Text accessibilityLiveRegion="polite" style={styles.body}>
        {filter === "Todas" ? "Nenhuma notícia sobre as vias nesta consulta." : `Nenhuma notícia de ${filter.toLowerCase()} nesta consulta.`}
      </Text>}
    </Page>
  );
}

const layout = StyleSheet.create({
  filterStrip:{flexGrow:0},
  filterRow:{alignItems:"center",gap:8},
  leadCard:{backgroundColor:"#163c34",borderColor:"#30574d",padding:26},
  mobileCard:{paddingHorizontal:12,paddingVertical:10,gap:4,borderRadius:12},
  mobileByline:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",columnGap:8},
  kicker:{fontSize:11,lineHeight:15,letterSpacing:0.6,fontWeight:"700"},
  timestamp:{fontSize:11,lineHeight:15},
  mobileTitle:{fontSize:16,lineHeight:20,fontWeight:"700",letterSpacing:-0.25},
  mobileLeadTitle:{fontSize:18,lineHeight:22},
  preview:{fontSize:14,lineHeight:18},
  source:{fontSize:12,lineHeight:16,fontWeight:"600"},
  pressed:{opacity:0.78},
  metaRow:{flexDirection:"row", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", columnGap:12},
  section:{flexDirection:"row",alignItems:"center",gap:8},
  rule:{width:20,height:2},
  headline:{fontWeight:"800",letterSpacing:-0.7,maxWidth:620},
  description:{fontSize:16,lineHeight:24,maxWidth:600},
  footer:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",columnGap:12,borderTopWidth:1,marginTop:5,paddingTop:3},
  credit:{fontSize:12,lineHeight:20},
  action:{minHeight:44,justifyContent:"center"},
  link:{fontSize:13,fontWeight:"600"},
});
