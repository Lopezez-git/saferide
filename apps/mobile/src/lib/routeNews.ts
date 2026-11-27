import type { Route } from "./simulation";

export const newsCategories = ["Trânsito e acesso", "Pavimento", "Segurança"] as const;
export type NewsCategory = (typeof newsCategories)[number];
export type RoadNews = {
  id: string; title: string; url: string; source: string; publishedAt: string; description?: string | null;
  category: NewsCategory; window?: { start: string; end: string };
};
export type NewsFeed = { items: RoadNews[]; status: string; lastAttempt: string };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\bav[.]\s*/g, "avenida ").replace(/\br[.]\s*/g, "rua ").replace(/\s+/g, " ").trim();
}

function mentionsStreet(title: string, street: string) {
  if (!/^(?:rua|avenida|estrada|rodovia|praca|largo|viaduto|ponte|tunel|marginal|alameda)\s+\S/.test(street)) return false;
  const escaped = street.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  // A route along Rua Augusta must not match a report about Rua Augusta Maia.
  return new RegExp("\\b" + escaped + "(?=$|[,;:.!?()–—]|\\s+(?:hoje|amanha|das|em|sera|fica|tem|com|interditad[ao]|bloquead[ao]|liberad[ao]|reabre|reabert[ao])\\b)").test(title);
}

const released = /\b(?:liberad[oa]s?|liberacao|reabert[oa]s?|reabertura|reabre|normalizad[oa]|encerrad[oa]|cancelad[oa])\b/;
const partial = /\b(?:sentido|altura|km|quilometro|esquina|cruzamento|entre|ontem)\b|,\s*\d+\b/;

export function newsOnRoute(items: RoadNews[], legs: readonly Route[], departure: number): RoadNews[] {
  const relevant = new Map<string, RoadNews>();
  const articles = items.map(item => ({ item, title: normalize(item.title.split(" - ")[0]) }));
  let legStart = departure;
  for (const leg of legs) {
    let passage = legStart;
    for (const step of leg.streetSteps ?? []) {
      const exit = passage + step.duration * 1000;
      const street = normalize(step.name);
      if (exit > passage && street) {
        const local = articles.filter(({title}) => mentionsStreet(title, street));
        for (const {item, title} of local) {
          if (!item.window || released.test(title) || partial.test(title)) continue;
          if (!(Date.parse(item.window.start) < exit && passage < Date.parse(item.window.end))) continue;
          const superseded = local.some(other => other.item.category === item.category &&
            released.test(other.title) && Date.parse(other.item.publishedAt) > Date.parse(item.publishedAt));
          if (!superseded) relevant.set(item.id, item);
        }
      }
      passage = exit;
    }
    legStart += leg.duration * 1000;
  }
  return [...relevant.values()];
}
