import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ride, loadRides, feedbackOptions, loadSimulatedCommunityFeedback, SimulatedCommunityFeedback } from '../lib/rideHistory';
import { palettes, useSimulationTheme } from '../lib/simulationTheme';
import RideFeedback from '../components/RideFeedback';
import { useCurrentMinute } from '../lib/useCurrentMinute';
import HistoryMonths from '../components/HistoryMonths';
import SimulationMotion, { useReducedMotion } from '../components/SimulationMotion';
import { completedTotal, historyDate, monthLabel, monthNumber, ridesInMonth } from '../lib/historyMonth';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const km = (meters: number) => (meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const duration = (seconds: number) => seconds >= 60 ? Math.floor(seconds / 60) + ' min' + (seconds % 60 ? ' ' + seconds % 60 + ' s' : '') : seconds + ' s';
const feedbackLabel = (category: string) => feedbackOptions.find(option => option.value === category)?.label ?? category;
const filters = [{ value: 'ALL', label: 'Todas' }, { value: 'COMPLETED', label: 'Concluídas' }, { value: 'CANCELLED', label: 'Canceladas' }, { value: 'PENDING', label: 'Feedback pendente' }] as const;
type Filter = typeof filters[number]['value'];
const statuses = { COMPLETED: 'Concluída', CANCELLED: 'Cancelada', IN_PROGRESS: 'Em andamento / interrompida' };
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const paths = {
  refresh: 'M20 7v5h-5M4 17v-5h5M5 8a7 7 0 0112-3l3 3M4 16l3 3a7 7 0 0012-3',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18M12 7v5l3 2',
  route: 'M6 4v10a4 4 0 004 4h8M14 14l4 4-4 4',
  chevron: 'M6 9l6 6 6-6',
  check: 'M5 12l4 4L19 6',
};
function HistoryIcon({ name, color, size = 20 }: { name: keyof typeof paths; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><Path d={paths[name]} /></Svg>;
}
export default function HistoryScreen() {
  const { palette: p, theme } = useSimulationTheme();
  const s = sheets[theme];
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.25;
  const reducedMotion = useReducedMotion();
  const currentMonth = monthNumber(useCurrentMinute());
  const [items, setItems] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [chosenMonth, setChosenMonth] = useState<number | null>(null);
  const request = useRef(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [feedbackRideId, setFeedbackRideId] = useState<string | null>(null);
  const [community, setCommunity] = useState<SimulatedCommunityFeedback[]>([]);
  const selectMonth = useCallback((month: number) => {
    setChosenMonth(month === currentMonth ? null : month);
    setExpanded(null);
  }, [currentMonth]);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    setLoading(true); setError('');
    try {
      const result = await loadRides();
      if(version !== request.current)return;
      setItems(result.items); setOffline(result.offline);
      try {
        const reports = await loadSimulatedCommunityFeedback();
        if(version === request.current)setCommunity(reports);
      } catch { if(version === request.current)setCommunity([]); }
    } catch { if(version === request.current)setError('Não foi possível ler o histórico. Tente novamente.'); }
    finally { if(version === request.current)setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); return () => { request.current++; }; }, [refresh]));
  const selected = Math.min(chosenMonth ?? currentMonth, currentMonth);
  const selectedMonth = monthLabel(selected);
  const monthRides = ridesInMonth(items, selected);
  const total = completedTotal(monthRides);
  const filtered = monthRides.filter(ride => filter === 'ALL' || (filter === 'PENDING' ? ride.status === 'COMPLETED' && !ride.feedback?.length : ride.status === filter));
  return <ScrollView style={s.page} contentContainerStyle={[s.content, compact && { padding: 14 }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={p.accent} />}>
    <View style={s.header}>
      <View style={s.grow}><Text style={s.title}>Suas corridas</Text><Text style={s.subtitle}>Simulações deste dispositivo</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Atualizar histórico" disabled={loading} onPress={() => void refresh()} style={s.refresh}>
        {loading ? <ActivityIndicator color={p.accent} /> : <HistoryIcon name="refresh" color={p.accent} />}
      </Pressable>
    </View>
    <View style={s.summary}>
      <HistoryMonths current={currentMonth} selected={selected} onSelect={selectMonth} reducedMotion={reducedMotion} />
      <SimulationMotion key={selectedMonth} visible reducedMotion={reducedMotion} fromY={8} duration={260}>
        <View style={s.balance}>
          <Text style={s.summaryLabel}>Total simulado do mês</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[s.total, compact && { fontSize: 30 }]}>{loading && !items.length ? '—' : money(total.fare)}</Text>
        </View>
        <View style={s.summaryBottom}>
          <View style={s.summaryStat}>
            <Text style={s.summaryValue}>{loading && !items.length ? '—' : total.count}</Text>
            <Text style={s.summaryText}>{total.count === 1 ? 'corrida concluída' : 'corridas concluídas'}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryStat}>
            <Text style={s.summaryValue}>{loading && !items.length ? '—' : km(total.meters)}</Text>
            <Text style={s.summaryText}>km</Text>
          </View>
        </View>
      </SimulationMotion>
    </View>
    {offline ? <View style={s.notice}><Text style={s.small}>Modo offline · cópia deste dispositivo. Atualize para sincronizar.</Text></View> : null}
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
      {filters.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: filter === option.value }} onPress={() => setFilter(option.value)} style={[s.filter, filter === option.value && s.filterSelected]}>
        <Text style={[s.filterText, filter === option.value && { color: p.accent }]}>{option.label}</Text>
      </Pressable>)}
    </ScrollView>
    {loading && !items.length ? <Text style={s.subtitle}>Carregando suas corridas…</Text> : null}
    <SimulationMotion key={selectedMonth + filter} visible reducedMotion={reducedMotion} fromY={12} duration={300} style={{ gap: 16 }}>
    {!loading && !filtered.length ? <View style={s.empty}>
      <View style={s.emptyIcon}><HistoryIcon name="route" color={p.accent} size={30} /></View>
      <Text style={s.emptyTitle}>{items.length ? 'Nenhuma corrida neste período' : 'Seu próximo trajeto começa no mapa'}</Text>
      <Text style={s.emptyText}>{items.length ? 'Escolha outro mês ou ajuste o filtro de corridas.' : 'Aceite uma oferta na demonstração para acompanhar o percurso e registrar seu feedback aqui.'}</Text>
      {!items.length ? <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={s.primary}><Text style={s.primaryText}>Ir para o mapa</Text></Pressable> : null}
    </View> : null}
    {filtered.map(ride => {
      const finished = ride.status === 'COMPLETED';
      const statusColor = finished ? p.accent : ride.status === 'CANCELLED' ? p.danger : p.orange;
      const syncLabel = ride.pending ? 'Sincronização pendente' : offline ? 'Cópia offline' : ride.cachedOnly ? 'Cópia no dispositivo' : 'Salvo no banco';
      const open = expanded === ride.id;
      return <View key={ride.id} style={[s.card, compact && { padding: 14 }]}>
        <View style={s.cardTop}>
          <Text style={s.date}>{dateFormat.format(historyDate(ride))}</Text>
          <View style={[s.status, { borderColor: statusColor }]}><View style={[s.dot, { backgroundColor: statusColor }]} /><Text style={[s.statusText, { color: statusColor }]}>{statuses[ride.status]}</Text></View>
        </View>
        <View style={s.cardHeadline}>
          <View style={s.grow}><Text style={s.passenger}>{ride.passenger}</Text><Text style={s.small}>Passageiro · simulação</Text></View>
          <View style={s.fare}><Text style={s.price}>{money(ride.fare)}</Text><Text style={s.small}>{finished ? 'Valor simulado' : 'Valor ofertado'}</Text></View>
        </View>
        <View style={s.journey}>
          <View style={s.timeline}><Svg width={16} height={16} viewBox="0 0 16 16"><Circle cx="8" cy="8" r="4" fill="none" stroke={p.muted} strokeWidth="2" /></Svg><View style={s.timelineLine} /><View style={s.destinationDot} /></View>
          <View style={s.grow}>
            <View style={s.stop}><Text style={s.stopLabel}>EMBARQUE</Text><Text style={s.address}>{ride.origin}</Text></View>
            <View style={s.stop}><Text style={s.stopLabel}>DESTINO</Text><Text style={s.address}>{ride.destination}</Text></View>
          </View>
        </View>
        <View style={s.stats}>
          <View style={s.row}><HistoryIcon name="route" color={p.muted} size={17} /><Text style={s.stat}>{km(ride.distanceMeters)} km</Text></View>
          <View style={s.row}><HistoryIcon name="clock" color={p.muted} size={17} /><Text style={s.stat}>{duration(ride.simulatedSeconds)}</Text></View>
          {ride.pending || offline || ride.cachedOnly ? <Text style={s.sync}>{syncLabel}</Text> : null}
        </View>
        {finished ? <View style={s.feedback}>
          {ride.feedback?.length ? <View style={s.row}><HistoryIcon name="check" color={p.accent} size={18} /><Text style={s.feedbackText}>{ride.feedback.map(feedbackLabel).join(' · ')}</Text></View> : <Pressable accessibilityRole="button" accessibilityLabel={'Dar feedback da corrida com ' + ride.passenger} onPress={() => setFeedbackRideId(ride.id)} style={s.feedbackButton}>
            <View style={s.grow}><Text style={s.feedbackTitle}>Como foi o trajeto?</Text><Text style={s.small}>Feedback pendente · responda quando parar</Text></View><Text style={s.feedbackAction}>Avaliar</Text>
          </Pressable>}
        </View> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={(open ? 'Ocultar' : 'Ver') + ' detalhes da corrida com ' + ride.passenger} accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : ride.id)} style={s.detailsButton}>
          <Text style={s.small}>{open ? 'Ocultar detalhes' : 'Detalhes da corrida'}</Text><View style={open && { transform: [{ rotate: '180deg' }] }}><HistoryIcon name="chevron" color={p.muted} size={16} /></View>
        </Pressable>
        {open ? <View style={s.details}>
          <Text style={s.detailText}>Planejado · {km(ride.plannedDistanceMeters)} km</Text>
          <Text style={s.detailText}>Tempo ativo do teste · {duration(ride.activeSeconds)}</Text>
          <Text style={s.detailText}>Distância e tempo incluem a ida até o passageiro.</Text>
          <Text style={s.detailText}>{syncLabel}</Text>
          <Text style={s.detailText}>Aceita em {new Date(ride.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</Text>
          {!finished ? <Text style={s.detailText}>Valor ofertado sem contabilização no total das concluídas.</Text> : null}
          {ride.finishedAt ? <Text style={s.detailText}>Encerrada em {new Date(ride.finishedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</Text> : null}
        </View> : null}
      </View>;
    })}
    </SimulationMotion>
    {community.length ? <View style={s.community}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCommunity }} onPress={() => setShowCommunity(value => !value)} style={s.communityHeader}>
        <View style={s.grow}><Text style={s.feedbackTitle}>Relatos de demonstração</Text><Text style={s.small}>{community.length} disponíveis · trajetos aproximados</Text></View><HistoryIcon name="chevron" color={p.muted} />
      </Pressable>
      {showCommunity ? community.slice(0, 10).map((item, index) => <View key={item.createdAt + '-' + index} style={s.communityItem}>
        <Text style={s.feedbackTitle}>{feedbackLabel(item.category)}</Text><Text style={s.small}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text><Text style={s.detailText}>{item.origin} → {item.destination}</Text>
      </View>) : null}
    </View> : null}
    <RideFeedback rideId={feedbackRideId} onClose={() => setFeedbackRideId(null)} onSaved={() => void refresh()} />
  </ScrollView>;
}
const createStyles = (p: typeof palettes.dark) => StyleSheet.create({
  page: { flex: 1, backgroundColor: p.background },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 18, paddingBottom: 36, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  grow: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 29, fontWeight: '700', letterSpacing: -0.8, color: p.text }, subtitle: { fontSize: 14, color: p.muted, marginTop: 4 },
  refresh: { width: 46, height: 46, borderRadius: 16, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center', borderColor: p.border, borderWidth: 1 },
  summary: { backgroundColor: '#124b42', padding: 16, borderRadius: 22, borderWidth: 1.5, borderColor: '#92dfbec2', boxShadow: '0 5px 12px rgba(6, 36, 28, 0.28)' },
  balance: { marginTop: 10, marginBottom: 16 },
  summaryLabel: { color: '#bcd8d0', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  total: { color: '#fff', fontSize: 34, fontWeight: '700', letterSpacing: -1, marginTop: 4, textAlign: 'center', fontVariant: ['tabular-nums'] },
  summaryBottom: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ffffff1a', paddingTop: 12 },
  summaryStat: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 5 },
  summaryDivider: { width: 1, height: 18, backgroundColor: '#ffffff26' },
  summaryValue: { color: '#e6fff5', fontSize: 15, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  summaryText: { color: '#c4dfd6', fontSize: 11, textAlign: 'center' },
  filters: { gap: 8, paddingVertical: 2 }, filter: { minHeight: 44, paddingHorizontal: 16, borderRadius: 24, justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
  filterSelected: { borderColor: p.accent, backgroundColor: p.accentSurface }, filterText: { fontSize: 14, fontWeight: '600', color: p.muted },
  card: { padding: 18, borderRadius: 22, backgroundColor: p.surface, borderColor: p.border, borderWidth: 1 },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  date: { color: p.muted, fontSize: 12 }, status: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 }, statusText: { fontSize: 11, fontWeight: '600' },
  cardHeadline: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginVertical: 18 },
  passenger: { color: p.text, fontSize: 19, fontWeight: '700' }, fare: { alignItems: 'flex-end' }, price: { color: p.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.6 },
  small: { color: p.muted, fontSize: 12, lineHeight: 18 },
  journey: { flexDirection: 'row', gap: 12 }, timeline: { width: 16, alignItems: 'center', paddingTop: 5, paddingBottom: 27 },
  timelineLine: { flex: 1, width: 1, minHeight: 42, backgroundColor: p.border, marginVertical: 5 }, destinationDot: { width: 9, height: 9, backgroundColor: p.accent, borderRadius: 2 },
  stop: { paddingBottom: 15 }, stopLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: p.muted, marginBottom: 4 }, address: { color: p.text, fontSize: 14, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: p.border },
  stat: { color: p.text, fontSize: 13, fontWeight: '600' }, sync: { color: p.orange, fontSize: 11 },
  feedback: { backgroundColor: p.accentSurface, borderRadius: 13, paddingHorizontal: 12, marginTop: 4 },
  feedbackButton: { minHeight: 72, flexDirection: 'row', gap: 10, alignItems: 'center' }, feedbackTitle: { color: p.text, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  feedbackText: { flex: 1, color: p.accent, fontSize: 12, lineHeight: 19, paddingVertical: 12 }, feedbackAction: { color: p.accent, fontSize: 13, fontWeight: '700' },
  detailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: -8 },
  details: { gap: 6, paddingTop: 12, paddingBottom: 4 }, detailText: { fontSize: 12, lineHeight: 19, color: p.muted },
  community: { borderColor: p.border, borderWidth: 1, borderRadius: 18, backgroundColor: p.surface, paddingHorizontal: 16 },
  communityHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 72 }, communityItem: { paddingVertical: 14, gap: 5, borderTopWidth: 1, borderTopColor: p.border },
  notice: { padding: 12, borderRadius: 12, backgroundColor: p.inset }, error: { color: p.danger, fontSize: 13 },
  empty: { padding: 28, alignItems: 'center', gap: 12 }, emptyIcon: { backgroundColor: p.accentSurface, padding: 18, borderRadius: 24 },
  emptyTitle: { color: p.text, textAlign: 'center', fontSize: 20, fontWeight: '700' }, emptyText: { color: p.muted, textAlign: 'center', fontSize: 14, lineHeight: 22, maxWidth: 330 },
  primary: { backgroundColor: '#087f71', borderRadius: 14, paddingHorizontal: 25, minHeight: 46, justifyContent: 'center', marginTop: 6 }, primaryText: { color: '#fff', fontWeight: '700' },
});
const sheets = { light: createStyles(palettes.light), dark: createStyles(palettes.dark) };
