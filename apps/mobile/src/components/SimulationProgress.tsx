import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

export default function SimulationProgress({ value, color, background, reducedMotion }: Readonly<{
  value: number; color: string; background: string; reducedMotion: boolean | null;
}>) {
  const [progress] = useState(() => new Animated.Value(value));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: reducedMotion ? 0 : 250,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, value, reducedMotion]);
  return <View style={{ height: 3, borderRadius: 3, overflow: 'hidden', backgroundColor: background }}>
    <Animated.View style={{ height: 3, backgroundColor: color, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}/>
  </View>;
}
