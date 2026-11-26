export function inPilot(point: { latitude: number; longitude: number }) {
  return point.latitude >= -24.1 && point.latitude <= -23.3 && point.longitude >= -46.9 && point.longitude <= -46.3;
}

const localClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", hourCycle: "h23",
});

export const trafficHoursDetail = "Referência da CET para São Paulo: de segunda a sexta, das 7h às 10h e das 17h às 20h. Feriados e eventos podem mudar o padrão. A faixa horária não mede o trânsito da rua nem acrescenta minutos ao percurso.";

export function trafficByHour(timestamp: number) {
  const parts = localClock.formatToParts(timestamp);
  const day = parts.find(part => part.type === "weekday")?.value;
  const hour = Number(parts.find(part => part.type === "hour")?.value);
  const weekday = day !== "Sat" && day !== "Sun";
  const peak = weekday && ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20));
  return { label: peak ? "Horário típico de pico" : "Fora do pico típico", level: peak ? "moderateTraffic" as const : "offPeak" as const };
}
