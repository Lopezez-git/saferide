import roads from './simulation-routes.json';
import type { MapPoint } from '../components/mapHtml';

export type Route = { distance: number; duration: number; geometry: { coordinates: number[][] } };
export type Offer = { platform: 'Uber' | '99'; passenger: string; pickup: MapPoint & { name: string }; destination: MapPoint & { name: string }; driver: MapPoint; fare: number; rating: string; reviews: number; category: string };
export const offers: Offer[] = [
  { platform:'Uber', passenger: 'Mariana Costa', pickup: { latitude: -23.6628226, longitude: -46.7111852, name: 'Estação Socorro, Santo Amaro' }, destination: { latitude: -23.6821152, longitude: -46.7017165, name: 'Rua Professor Oswaldo Quirino Simões, Socorro' }, driver: { latitude: -23.6702, longitude: -46.7064 }, fare: 11.03, rating: '4,89', reviews: 952, category: 'Bag' },
  { platform:'99', passenger: 'Lucas Almeida', pickup: { latitude: -23.5614, longitude: -46.6559, name: 'MASP · Avenida Paulista, Bela Vista' }, destination: { latitude: -23.6234167, longitude: -46.6985436, name: 'Morumbi Shopping · Av. Roque Petroni Júnior, 1089' }, driver: { latitude: -23.568, longitude: -46.659 }, fare: 32.70, rating: '4,96', reviews: 318, category: '99Plus' },
  { platform:'Uber', passenger: 'Ana Souza', pickup: { latitude: -23.6234167, longitude: -46.6985436, name: 'Morumbi Shopping · Vila Cordeiro' }, destination: { latitude: -23.5874, longitude: -46.6576, name: 'Parque Ibirapuera · Avenida Pedro Álvares Cabral' }, driver: { latitude: -23.628, longitude: -46.696 }, fare: 24.80, rating: '4,92', reviews: 640, category: 'X' },
];
// Great-circle offsets keep each fictional pickup nearby at any latitude.
function offset(origin: MapPoint, meters: number, degrees: number): MapPoint {
  const rad = Math.PI / 180;
  const latitude = origin.latitude * rad;
  const arc = meters / 6371000;
  const bearing = degrees * rad;
  const end = Math.asin(Math.sin(latitude)*Math.cos(arc) + Math.cos(latitude)*Math.sin(arc)*Math.cos(bearing));
  const delta = Math.atan2(Math.sin(bearing)*Math.sin(arc)*Math.cos(latitude), Math.cos(arc)-Math.sin(latitude)*Math.sin(end));
  return {latitude:end/rad, longitude:(origin.longitude+delta/rad+540)%360-180};
}

type Stop = Offer['pickup'];

function coordinateStop(point: MapPoint): Stop {
  return {...point, name: point.latitude.toFixed(5) + ', ' + point.longitude.toFixed(5)};
}

export type RoadCircuit = { approach: Route; outbound: Route; inbound: Route; station: Stop; street: Stop };
export type DriverStop = 'start' | 'station' | 'street';

export function roadPoint(route: Route, end = false): MapPoint {
  const points = route.geometry.coordinates;
  const [longitude, latitude] = points[end ? points.length - 1 : 0];
  return { longitude, latitude };
}

const socorro = roads.routes[0];
export const demoCircuit: RoadCircuit = {
  approach: socorro.pickup, outbound: socorro.trip, inbound: roads.socorroReturn,
  station: { ...offers[0].pickup, ...roadPoint(socorro.trip) },
  street: { ...offers[0].destination, ...roadPoint(socorro.trip, true) },
};

type FetchLeg = (from: MapPoint, to: MapPoint) => Promise<Route>;
export async function localCircuit(driver: MapPoint, fetchLeg: FetchLeg): Promise<RoadCircuit> {
  const approach = await fetchLeg(driver, offset(driver, 650, 65));
  const station = coordinateStop(roadPoint(approach, true));
  const outbound = await fetchLeg(station, offset(station, 2600, 120));
  const street = coordinateStop(roadPoint(outbound, true));
  const inbound = await fetchLeg(street, station);
  const connected = (a: MapPoint, b: MapPoint) =>
    Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001;
  if (!connected(station, roadPoint(outbound)) || !connected(street, roadPoint(inbound)) ||
      !connected(station, roadPoint(inbound, true))) throw new Error('Trechos sem conexão viária.');
  return { approach, outbound, inbound, station, street };
}

export function roadScenario(circuit: RoadCircuit, origin: DriverStop, index: number) {
  const inbound = origin === 'street';
  const trip = inbound ? circuit.inbound : circuit.outbound;
  const pickup = inbound ? circuit.street : circuit.station;
  const destination = inbound ? circuit.station : circuit.street;
  const point = trip.geometry.coordinates[0];
  const approach = origin === 'start' ? circuit.approach :
    { distance: 0, duration: 0, geometry: { coordinates: [point, point] } };
  return {
    offer: { ...offers[index], driver: roadPoint(approach), pickup, destination },
    route: { pickup: approach, trip },
    arrival: (inbound ? 'station' : 'street') as DriverStop,
  };
}

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
export type SimulationPhase = 'idle' | 'intro' | 'searching' | 'offer' | 'accepting' | 'pickup' | 'boarding' | 'trip' | 'done' | 'declined' | 'expired';
export type Playback = { phase: SimulationPhase; elapsed: number; offerIndex?: number };
const timedPhases: Partial<Record<SimulationPhase, { duration: number; next: SimulationPhase }>> = {
  intro: { duration: 5, next: 'searching' },
  searching: { duration: 5, next: 'offer' },
  offer: { duration: OFFER_SECONDS, next: 'searching' },
  pickup: { duration: 14, next: 'boarding' },
  boarding: { duration: 3, next: 'trip' },
  trip: { duration: 28, next: 'done' },
};
export function legProgress(phase: SimulationPhase, elapsed: number) {
  if (phase === 'pickup') return { pickup: Math.min(1, elapsed / 14), trip: 0 };
  if (phase === 'boarding') return { pickup: 1, trip: 0 };
  if (phase === 'trip') return { pickup: 1, trip: Math.min(1, elapsed / 28) };
  if (phase === 'done') return { pickup: 1, trip: 1 };
  return { pickup: 0, trip: 0 };
}

export function simulationDriver(phase: SimulationPhase, elapsed: number, offer: Offer, route: { pickup: Route; trip: Route }) {
  if (phase === 'pickup') return pointAlong(route.pickup.geometry.coordinates, elapsed / 14);
  if (phase === 'boarding') return pointAlong(route.pickup.geometry.coordinates, 1);
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
