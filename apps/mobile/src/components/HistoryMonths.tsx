import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const fullMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function HistoryMonths({ current, selected, onSelect, reducedMotion }: Readonly<{
  current: number; selected: number; onSelect: (month: number) => void; reducedMotion: boolean | null;
}>) {
  const { fontScale } = useWindowDimensions();
  const first = Math.min(current - 23, selected);
  const months = Array.from({ length: current - first + 1 }, (_, index) => first + index);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const positioned = useRef(false);
  const layoutWidth = useRef(0);
  const [width, setWidth] = useState(0);
  const itemWidth = Math.max(width > 0 && width < 200 ? 80 : 104, Math.ceil(60 * fontScale));
  const [scrollX] = useState(() => new Animated.Value((selected - first) * 104));
  useEffect(() => {
    if (!width) return;
    clearTimeout(settleTimer.current);
    scroll.current?.scrollTo({ x: (selected - first) * itemWidth, animated: positioned.current && layoutWidth.current === width && reducedMotion === false });
    layoutWidth.current = width;
    positioned.current = true;
  }, [selected, first, width, itemWidth, reducedMotion]);
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const monthCount = months.length;
  const settle = useCallback((x: number) => {
    clearTimeout(settleTimer.current);
    const index = Math.max(0, Math.min(monthCount - 1, Math.round(x / itemWidth)));
    onSelect(first + index);
    scroll.current?.scrollTo({ x: index * itemWidth, animated: reducedMotion === false });
  }, [monthCount, first, onSelect, reducedMotion, itemWidth]);
  useEffect(() => {
    if(Platform.OS !== 'web')return;
    const listener = scrollX.addListener(({ value }) => {
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => settle(value), 180);
    });
    return () => {
      scrollX.removeListener(listener);
      clearTimeout(settleTimer.current);
    };
  }, [scrollX, settle]);
  return <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => onSelect(selected - 1)} style={styles.arrow}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#d5f7ec" strokeWidth={2}><Path d="m14 6-6 6 6 6" /></Svg>
    </Pressable>
    <View style={[styles.viewport, {height:Math.max(48,Math.ceil(44 * fontScale + 4))}]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <Animated.ScrollView
        ref={scroll} horizontal showsHorizontalScrollIndicator={false}
        testID="history-months" accessibilityLabel="Meses do histórico"
        snapToInterval={itemWidth} decelerationRate="fast" disableIntervalMomentum
        bounces={false} scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: Math.max(0, (width - itemWidth) / 2) }}
        onContentSizeChange={() => scroll.current?.scrollTo({ x: (selected - first) * itemWidth, animated: false })}
        onMomentumScrollEnd={event => settle(event.nativeEvent.contentOffset.x)}
        onScrollBeginDrag={() => clearTimeout(settleTimer.current)}
        onMomentumScrollBegin={() => clearTimeout(settleTimer.current)}
        onScrollEndDrag={event => {
          if(Platform.OS === 'web')return;
          const x=event.nativeEvent.contentOffset.x;
          clearTimeout(settleTimer.current);
          settleTimer.current=setTimeout(() => settle(x),180);
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: Platform.OS !== 'web',
        })}
      >
        {months.map((month, index) => {
          const date = new Date(Date.UTC(Math.floor(month / 12), month % 12, 15));
          const inputRange = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
          return <Animated.View key={month} style={{
            width: itemWidth,
            opacity: scrollX.interpolate({ inputRange, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' }),
            transform: [{ scale: reducedMotion ? 1 : scrollX.interpolate({ inputRange, outputRange: [0.86, 1, 0.86], extrapolate: 'clamp' }) }],
          }}>
            <Pressable accessibilityRole="button" accessibilityLabel={fullMonth.format(date)} accessibilityState={{ selected: month === selected }} onPress={() => onSelect(month)} style={[styles.month, month === selected && styles.selected]}>
              <Text style={[styles.name, month === selected && styles.selectedText]}>{monthName.format(date).replace('.', '')}</Text>
              <Text style={[styles.year, month === selected && styles.selectedText]}>{date.getUTCFullYear()}</Text>
            </Pressable>
          </Animated.View>;
        })}
      </Animated.ScrollView>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" disabled={selected >= current} accessibilityState={{ disabled: selected >= current }} onPress={() => onSelect(selected + 1)} style={[styles.arrow, selected >= current && { opacity: 0.25 }]}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#d5f7ec" strokeWidth={2}><Path d="m10 6 6 6-6 6" /></Svg>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -6 },
  viewport: { flex: 1, minWidth: 0, height: 48, overflow: 'hidden' },
  arrow: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  month: { marginHorizontal: 4, borderRadius: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 1 },
  selected: { backgroundColor: '#ffffff14', borderWidth: 1, borderColor: '#ffffff30' },
  name: { color: '#e6fff5', textTransform: 'capitalize', fontSize: 16, fontWeight: '700' },
  year: { color: '#c6e5dc', fontSize: 10, fontWeight: '500' },
  selectedText: { color: '#ffffff' },
});
