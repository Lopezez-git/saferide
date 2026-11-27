import type { Ride } from './rideHistory';

const numeric = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric' });
const label = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', year: 'numeric', month: 'long' });
export const historyDate = (ride: Ride) => new Date(ride.finishedAt ?? ride.createdAt);

export function monthNumber(date: Date | number) {
  const parts = numeric.formatToParts(date);
  return Number(parts.find(part => part.type === 'year')!.value) * 12 + Number(parts.find(part => part.type === 'month')!.value) - 1;
}
export function monthLabel(month: number) {
  return label.format(Date.UTC(Math.floor(month / 12), month % 12, 15, 12));
}
export function ridesInMonth(rides: Ride[], month: number) {
  return rides.filter(ride => {
    const date = historyDate(ride);
    return Number.isFinite(date.getTime()) && monthNumber(date) === month;
  }).sort((a, b) => historyDate(b).getTime() - historyDate(a).getTime());
}
export function completedTotal(rides: Ride[]) {
  const completed = rides.filter(ride => ride.status === 'COMPLETED');
  return {
    fare: completed.reduce((cents, ride) => cents + Math.round(ride.fare * 100), 0) / 100,
    count: completed.length,
    meters: completed.reduce((meters, ride) => meters + ride.distanceMeters, 0),
  };
}
