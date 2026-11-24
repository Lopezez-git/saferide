export type Police = { status: string; currentTimeWindow?: string; windows?: Record<string, Record<string, number>>; periodStart?: string; periodEnd?: string; sourceUrl?: string };
export type Pavement = { status: string; statuses?: Record<string, number>; sourceUpdatedAt?: string; sourceUrl?: string };
export type Traffic = { status: string; condition?: string; delaySeconds?: number; checkedAt?: string };

export function policeSummary(police?: Police | null) {
  const unavailable = { value: 'Indisponível', caption: 'SSP · histórico' };
  if (police === undefined) return { ...unavailable, value: 'Consultando…' };
  if (police?.status !== 'AVAILABLE') return unavailable;
  const hour = police.currentTimeWindow;
  if (!hour || !/^\d{1,2}$/.test(hour) || Number(hour) > 23) return unavailable;
  const window = police.windows?.[hour];
  if (!window) return unavailable;
  const counts = Object.values(window);
  if (counts.some(value => !Number.isSafeInteger(value) || value < 0)) return unavailable;
  const count: number = counts.reduce((total, value) => total + value, 0);
  const unit = count === 1 ? 'BO' : 'BOs';
  return {
    value: `${count} ${unit}`,
    caption: `Histórico · ${hour}h–${String((Number(hour) + 1) % 24).padStart(2, '0')}h`,
  };
}

export function pavementSummary(pavement?: Pavement | null) {
  if (pavement === undefined) return 'Consultando…';
  if (pavement?.status !== 'AVAILABLE') return 'Indisponível';
  const open = (pavement.statuses?.Aberto ?? 0) + (pavement.statuses?.['Em andamento'] ?? 0);
  return `${open} solicitações`;
}

export function trafficSummary(traffic?: Traffic | null) {
  if (traffic === undefined) return 'Consultando…';
  if (traffic?.status !== 'AVAILABLE') return 'Indisponível';
  const conditions: Record<string, string> = { LEVE: 'Tranquilo', MODERADO: 'Moderado', CONGESTIONADO: 'Congestionado' };
  return conditions[traffic.condition ?? ''] ?? 'Indisponível';
}

export function grossRates(fare: number, meters: number, seconds: number) {
  if (![fare, meters, seconds].every(Number.isFinite) || fare < 0 || meters <= 0 || seconds <= 0) return null;
  return { perKm: fare * 1000 / meters, perHour: fare * 3600 / seconds, perMinute: fare * 60 / seconds };
}

export function grossRatesLabel(fare: number, meters: number, seconds: number) {
  const rates = grossRates(fare, meters, seconds);
  if (!rates) return "Estimativa indisponível";
  const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return [brl(rates.perKm) + "/km", brl(rates.perHour) + "/h", brl(rates.perMinute) + "/min"].join(" · ");
}
