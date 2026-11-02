import { Report } from "./client";
// Approximate local distance in metres; a nearby record is not proven to be on the same road.
export function nearRoute(report: Report, route: number[][]) {
  const scale = 111320;
  const k = Math.cos((report.latitude * Math.PI) / 180);
  const x = report.longitude * scale * k,
    y = report.latitude * scale;
  for (let i = 1; i < route.length; i++) {
    const ax = route[i - 1][0] * scale * k,
      ay = route[i - 1][1] * scale,
      bx = route[i][0] * scale * k,
      by = route[i][1] * scale;
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)),
    );
    if (Math.hypot(x - ax - t * dx, y - ay - t * dy) <= 300) return true;
  }
  return false;
}
