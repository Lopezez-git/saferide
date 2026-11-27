import type { Report } from "./client";
import { nearRoute } from "./spatial";

type Level = keyof typeof levels;

export function volumeLevel(count: number | null): Level {
  if (count === null || !Number.isInteger(count) || count <= 0) return "unknown";
  if (count < 3) return "low";
  return count < 10 ? "medium" : "high";
}

function monthIndex(month?: string) {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NaN;
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5));
}

export function safetyLevel(total: number | undefined, hourly: number | null, start?: string, end?: string): Level {
  const months = monthIndex(end) - monthIndex(start) + 1;
  if (!Number.isFinite(months) || months < 1 || total === undefined || !Number.isInteger(total)
    || hourly === null || !Number.isInteger(hourly) || hourly < 0 || hourly > total) return "unknown";
  if (total === 0) return "noVehicleReports";
  const monthlyAverage = total / months;
  const frequent = monthlyAverage >= 3;
  if (monthlyAverage >= 10 || hourly >= 10 || (frequent && hourly >= 3)) return "high";
  if (frequent || hourly >= 3) return "medium";
  return "low";
}
export function pendingRepairs(statuses?: Record<string, number>, total?: number): number | null {
  if (!statuses || total === undefined) return null;
  let pending = 0;
  let counted = 0;
  for (const [name, count] of Object.entries(statuses)) {
    if (!Number.isInteger(count) || count < 0) return null;
    const status = name.trim().toLowerCase();
    if (["aberto", "aberta", "em andamento"].includes(status)) pending += count;
    else if (!["finalizada", "finalizado", "cancelada", "cancelado"].includes(status)) return null;
    counted += count;
  }
  return counted === total ? pending : null;
}

export function pavementLevel(count: number | null): Level {
  return count === 0 ? "noPendingRepairs" : volumeLevel(count);
}

export function trafficLevel(condition?: string): Level {
  switch (condition) {
    case "LEVE": return "light";
    case "MODERADO": return "moderateTraffic";
    case "CONGESTIONADO": return "heavyTraffic";
    default: return "unknown";
  }
}

const levels = {
  unknown: ["Sem avaliação", "gray"],
  offPeak: ["Fora do pico típico", "blue"],
  noPendingRepairs: ["Sem pedidos pendentes", "green"],
  noVehicleReports: ["Nenhum BO de veículo registrado", "green"],
  light: ["Fluidez boa", "green"],
  low: ["Poucos registros", "yellow"],
  medium: ["Volume intermediário", "orange"],
  high: ["Volume elevado", "red"],
  moderateTraffic: ["Atenção", "yellow"],
  heavyTraffic: ["Atraso elevado", "red"],
} as const;

const tones = {
  gray: ["#eff2f4", "#475560", "#252e35", "#ced7de"],
  blue: ["#e3f2fd", "#155687", "#173349", "#a9d9ff"],
  green: ["#e2f6e9", "#14603b", "#17392d", "#9fe5ba"],
  yellow: ["#fff4cc", "#715300", "#3b341b", "#f3d978"],
  orange: ["#ffead8", "#843c08", "#442c20", "#ffc18e"],
  red: ["#ffe5e5", "#952d32", "#46252b", "#ffb1b5"],
} as const;

export function levelStyle(level: Level, dark: boolean) {
  const [label, color] = levels[level];
  const [lightBg, lightInk, darkBg, darkInk] = tones[color];
  return { label, background: dark ? darkBg : lightBg, ink: dark ? darkInk : lightInk };
}

type PoliceReading = {
  status: string; stale?: boolean; total?: number; unknownTimeTotal?: number;
  categories?: Record<string, number>; currentTimeWindow?: string; windows?: Record<string, Record<string, number>>;
  periodStart?: string; periodEnd?: string;
};
type PavementReading = {
  status: string; stale?: boolean; totalRequests?: number; statuses?: Record<string, number>;
};

export function policeReadingLevel(data?: PoliceReading | null): Level {
  if (data?.status !== "AVAILABLE" || data.stale !== false) return "unknown";
  const window = data.windows?.[data.currentTimeWindow ?? ""];
  if (!window || (data.total && data.total === data.unknownTimeTotal)) return "unknown";
  const counts = Object.values(window);
  if (counts.some(n => !Number.isSafeInteger(n) || n < 0)) return "unknown";
  return safetyLevel(data.total, counts.reduce((sum, n) => sum + n, 0), data.periodStart, data.periodEnd);
}

export function pavementReadingLevel(data?: PavementReading | null): Level {
  return pavementLevel(data?.status === "AVAILABLE" && data.stale === false ? pendingRepairs(data.statuses, data.totalRequests) : null);
}

const dots = { green: "🟢", yellow: "🟡", orange: "🟠", red: "🔴", gray: "⚪", blue: "🔵" };
function dot(level: Level) { return dots[levels[level][1]]; }

function vehicleCounts(counts: Record<string, number> | undefined, total?: number) {
  const names: Record<string, [string,string]> = { Furto:["furto","furtos"], Roubo:["roubo","roubos"], "Roubo e furto":["BO misto","BOs mistos"] };
  const entries = Object.entries(counts ?? {}).filter(([, n]) => n > 0);
  if (entries.length && entries.every(([kind]) => names[kind]) && (total === undefined || total === entries.reduce((sum, [,n]) => sum+n, 0)))
    return entries.map(([kind,n]) => `${n} ${names[kind][n === 1 ? 0 : 1]}`).join(", ");
  return total === undefined ? "sem categoria" : `${total} BOs`;
}

export function offerContext(police?: PoliceReading | null, pavement?: PavementReading | null) {
  const safety = policeReadingLevel(police), road = pavementReadingLevel(pavement);
  const unavailable = (data?: { stale?: boolean } | null) => data === undefined ? "consultando" : data?.stale ? "base desatualizada" : "sem avaliação";
  const history = safety === "unknown" ? unavailable(police) : vehicleCounts(police?.categories, police?.total);
  const pending = pendingRepairs(pavement?.statuses, pavement?.totalRequests);
  const surface = road === "unknown" ? unavailable(pavement) : pending === 0 ? "sem pedidos pendentes" : `${pending} ${pending === 1 ? "pedido pendente" : "pedidos pendentes"}`;
  let hourLabel = "";
  if (safety !== "unknown" && police?.currentTimeWindow) {
    const hour = police.currentTimeWindow;
    const counts = police.windows![hour];
    const value = Object.values(counts).some(n => n > 0) ? vehicleCounts(counts) : "nenhum BO confirmado na faixa";
    hourLabel = `${hour}h–${String((Number(hour)+1)%24).padStart(2,"0")}h · ${value}`;
  }
  return { safety, road, history, surface, hourLabel };
}

type RoadSignal = { level: Level; label: string; reason: string };

export function offerPavement(pavement: PavementReading | null | undefined, reports: Report[] | null | undefined,
  route: number[][], now: number): RoadSignal {
  const pending = pavement?.status === "AVAILABLE" && pavement.stale === false
    ? pendingRepairs(pavement.statuses, pavement.totalRequests) : null;
  const nearby = reports?.filter(report =>
    (report.category === "PAVIMENTO" || report.category === "ALAGAMENTO") &&
    Date.parse(report.reviewedAt ?? "") <= now && Date.parse(report.validUntil ?? "") > now &&
    nearRoute(report, route));
  const flood = nearby?.some(report => report.category === "ALAGAMENTO");
  const unpaved = nearby?.some(report => /^(?:via|rua|estrada) (?:sem asfalto|de terra)\b/i.test(report.title.trim()));
  if (flood || unpaved) return { level: "high", label: flood ? "Alagamento" : "Via sem asfalto", reason: "Relato a até 300 m da rota" };
  if (nearby?.length) return { level: "low", label: "Via irregular", reason: "Relato a até 300 m da rota" };
  if (pending !== null && pending > 0) return {
    level: "low", label: pending === 1 ? "1 pedido pendente" : pending + " pedidos pendentes", reason: "Tapa-buraco · SP156"
  };
  if (pending === 0 && nearby && route.length >= 2) return { level: "noPendingRepairs", label: "Sem alertas", reason: "Nas fontes consultadas" };
  const loading = pavement === undefined || reports === undefined;
  return { level: "unknown", label: loading ? "Consultando…" : "Sem avaliação", reason: loading ? "" : "Dados insuficientes" };
}

export function offerNotification(police?: PoliceReading | null, pavement?: PavementReading | null, trafficText?: string, trafficTone: Level = "unknown", roadSignal?: RoadSignal) {
  const {safety,road,history,surface,hourLabel} = offerContext(police,pavement);
  const roadText = roadSignal ? `${dot(roadSignal.level)} Pavimento · ${roadSignal.label}` : `${dot(road)} Tapa-buraco · ${surface}`;
  const lines = [`Segurança: ${dot(safety)} Veículos · ${history}`, `Pavimento: ${roadText}`];
  if (hourLabel) lines.push("Horário: " + hourLabel);
  if (trafficText) lines.push(`Trânsito: ${dot(trafficTone)} ${trafficText}`);
  return lines.join("\n");
}
