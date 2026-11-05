import type { MapPoint } from '../components/mapHtml';

export type Route = { distance: number; duration: number; geometry: { coordinates: number[][] } };
export type Offer = { passenger: string; pickup: MapPoint & { name: string }; destination: MapPoint & { name: string }; driver: MapPoint; fare: number; rating: string; reviews: number; category: string };
export const offers: Offer[] = [
  { passenger: 'Mariana Costa', pickup: { latitude: -23.6628226, longitude: -46.7111852, name: 'Estação Socorro, Santo Amaro' }, destination: { latitude: -23.6821152, longitude: -46.7017165, name: 'Rua Professor Oswaldo Quirino Simões, Socorro' }, driver: { latitude: -23.6702, longitude: -46.7064 }, fare: 11.03, rating: '4,89', reviews: 952, category: 'Bag' },
  { passenger: 'Lucas Almeida', pickup: { latitude: -23.5614, longitude: -46.6559, name: 'MASP · Avenida Paulista, Bela Vista' }, destination: { latitude: -23.6234167, longitude: -46.6985436, name: 'Morumbi Shopping · Av. Roque Petroni Júnior, 1089' }, driver: { latitude: -23.568, longitude: -46.659 }, fare: 32.70, rating: '4,96', reviews: 318, category: 'Comfort' },
  { passenger: 'Ana Souza', pickup: { latitude: -23.6234167, longitude: -46.6985436, name: 'Morumbi Shopping · Vila Cordeiro' }, destination: { latitude: -23.5874, longitude: -46.6576, name: 'Parque Ibirapuera · Avenida Pedro Álvares Cabral' }, driver: { latitude: -23.628, longitude: -46.696 }, fare: 24.80, rating: '4,92', reviews: 640, category: 'X' },
];
export function routeBody(from: MapPoint, to: MapPoint) { return { fromLat: from.latitude, fromLon: from.longitude, toLat: to.latitude, toLon: to.longitude }; }
export function pointAlong(points: number[][], fraction: number): MapPoint | null {
  if (!points.length) return null;
  const lengths = points.slice(1).map((p, i) => Math.hypot((p[0] - points[i][0]) * Math.cos(p[1] * Math.PI / 180), p[1] - points[i][1]));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, fraction));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const ratio = remaining / lengths[i];
      return { longitude: points[i][0] + (points[i+1][0] - points[i][0]) * ratio, latitude: points[i][1] + (points[i+1][1] - points[i][1]) * ratio };
    }
    remaining -= lengths[i];
  }
  const last = points[points.length - 1];
  return { longitude: last[0], latitude: last[1] };
}

export type SimulationPhase = 'idle' | 'offer' | 'pickup' | 'trip' | 'done' | 'declined' | 'expired';
export type Playback = { phase: SimulationPhase; elapsed: number };
export function simulationReducer(state: Playback, action: { type: 'tick' } | { type: 'phase'; phase: SimulationPhase }): Playback {
  if (action.type === 'phase') return { phase: action.phase, elapsed: 0 };
  const duration = state.phase === 'offer' ? 45 : state.phase === 'pickup' ? 14 : state.phase === 'trip' ? 28 : 0;
  if (!duration) return state;
  const elapsed = state.elapsed + 0.25;
  if (elapsed >= duration) return { phase: state.phase === 'offer' ? 'expired' : state.phase === 'pickup' ? 'trip' : 'done', elapsed: 0 };
  return { ...state, elapsed };
}
