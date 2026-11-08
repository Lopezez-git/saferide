import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { rideStorage } from './rideStorage';

type Theme = 'light' | 'dark';
const palettes = {
  dark: { surface:'#182128', inset:'#243039', text:'#f5f8fa', muted:'#adbdc8', border:'#35434d', accent:'#78e3c1', accentSurface:'#243e38', blue:'#83baff', orange:'#ffc28a', violet:'#cbbaff' },
  light: { surface:'#ffffff', inset:'#f0f4f6', text:'#14252e', muted:'#546772', border:'#dce5e9', accent:'#087b62', accentSurface:'#e5f6ef', blue:'#1268b5', orange:'#a74c12', violet:'#7050b5' },
};
const ThemeContext = createContext<{theme:Theme; palette:typeof palettes.dark; setTheme:(theme:Theme)=>void; error:string}>({theme:'dark',palette:palettes.dark,setTheme:()=>{},error:''});
export function SimulationThemeProvider({children}:{children:ReactNode}) {
  const [theme,setValue]=useState<Theme>('dark');
  const [error,setError]=useState('');
  const changed=useRef(false);
  const saves=useRef(Promise.resolve());
  useEffect(()=>{let mounted=true;void rideStorage.get('saferide.simulation.theme').then(value=>{if(mounted&&!changed.current&&(value==='light'||value==='dark'))setValue(value);}).catch(()=>{if(mounted)setError('Não foi possível recuperar o tema salvo.');});return()=>{mounted=false;};},[]);
  function setTheme(value:Theme){changed.current=true;setValue(value);setError('');saves.current=saves.current.then(()=>rideStorage.set('saferide.simulation.theme',value)).catch(()=>setError('Tema aplicado, mas não foi possível salvar neste dispositivo.'));}
  return <ThemeContext.Provider value={{theme,palette:palettes[theme],setTheme,error}}>{children}</ThemeContext.Provider>;
}
export const useSimulationTheme=()=>useContext(ThemeContext);
