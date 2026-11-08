import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

export function useReducedMotion() {
  const [reduced,setReduced]=useState<boolean | null>(null);
  useEffect(()=>{
    let mounted=true;
    const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduced(value);}).catch(()=>{if(mounted)setReduced(false);});
    return()=>{mounted=false;listener.remove();};
  },[]);
  return reduced;
}

/** Retains the outgoing panel until its exit finishes. Only opacity/transform animate. */
export default function SimulationMotion({visible,reducedMotion,fromY=0,duration=480,delay=0,style,children,testID}: Readonly<{
  visible:boolean; reducedMotion:boolean | null; fromY?:number; duration?:number; delay?:number;
  style?:StyleProp<ViewStyle>; children?:ReactNode; testID?:string;
}>) {
  const [progress]=useState(()=>new Animated.Value(0));
  const [retained,setRetained]=useState(visible);
  // Keep an entering panel mounted even if visibility changes before entry ends.
  if(visible&&!retained)setRetained(true);
  useEffect(()=>{
    if(reducedMotion===null)return;
    const transitionDuration = visible ? duration : 260;
    const animation=Animated.timing(progress,{
      toValue:visible?1:0,duration:reducedMotion?0:transitionDuration,
      delay:visible&&!reducedMotion?delay:0,easing:Easing.out(Easing.cubic),
      useNativeDriver:Platform.OS!=='web',
    });
    animation.start(({finished})=>{if(finished&&!visible)setRetained(false);});
    return()=>animation.stop();
  },[visible,reducedMotion,progress,duration,delay]);
  if(!visible&&!retained)return null;
  return <Animated.View testID={testID} pointerEvents={visible?'box-none':'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible?'auto':'no-hide-descendants'} style={[style,{
    opacity:progress,transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[reducedMotion?0:fromY,0]})}],
  }]}>{children}</Animated.View>;
}
