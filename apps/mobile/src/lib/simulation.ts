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
  const last = points.at(-1)!;
  return { longitude: last[0], latitude: last[1] };
}

export const OFFER_SECONDS = 10;
export type SimulationPhase = 'idle' | 'intro' | 'searching' | 'offer' | 'accepting' | 'pickup' | 'trip' | 'done' | 'declined' | 'expired';
export type Playback = { phase: SimulationPhase; elapsed: number; offerIndex?: number };
const timedPhases: Partial<Record<SimulationPhase, { duration: number; next: SimulationPhase }>> = {
  intro: { duration: 5, next: 'searching' },
  searching: { duration: 5, next: 'offer' },
  offer: { duration: OFFER_SECONDS, next: 'searching' },
  pickup: { duration: 14, next: 'trip' },
  trip: { duration: 28, next: 'done' },
};
export function legProgress(phase: SimulationPhase, elapsed: number) {
  if (phase === 'pickup') return { pickup: Math.min(1, elapsed / 14), trip: 0 };
  if (phase === 'trip') return { pickup: 1, trip: Math.min(1, elapsed / 28) };
  if (phase === 'done') return { pickup: 1, trip: 1 };
  return { pickup: 0, trip: 0 };
}

export function simulationDriver(phase: SimulationPhase, elapsed: number, offer: Offer, route: { pickup: Route; trip: Route }) {
  if (phase === 'pickup') return pointAlong(route.pickup.geometry.coordinates, elapsed / 14);
  if (phase === 'trip') return pointAlong(route.trip.geometry.coordinates, elapsed / 28);
  if (phase === 'done') return offer.destination;
  return offer.driver;
}

export function simulationReducer(state: Playback, action: { type: 'tick' } | { type: 'next' } | { type: 'phase'; phase: SimulationPhase }): Playback {
  if (action.type === 'next') return {phase:'searching',elapsed:0,offerIndex:((state.offerIndex??0)+1)%offers.length};
  if (action.type === 'phase') return { ...state, phase: action.phase, elapsed: 0 };
  const timing = timedPhases[state.phase];
  if (!timing) return state;
  const elapsed = state.elapsed + 0.25;
  if (elapsed >= timing.duration) {
    if(state.phase==='offer')return simulationReducer(state,{type:'next'});
    return { ...state, phase: timing.next, elapsed: 0 };
  }
  return { ...state, elapsed };
}
