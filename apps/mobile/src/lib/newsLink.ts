type NewsItem = { url: string; title: string; source: string; publishedAt: string; description?: string | null };

// These archived feed entries identify videos but omit their publisher links and leads.
const sourceCorrections = [{
  publisher: "g1",
  title: "Alagamento no M'Boi Morim, em São Paulo",
  publishedAt: "2026-11-22T23:20:47Z",
  url: "https://g1.globo.com/sp/sao-paulo/noticia/2026/11/22/cidade-de-sp-entra-em-estado-de-atencao-para-alagamentos-defesa-civil-emite-alerta-severo.ghtml",
  headline: "Alagamento atinge a região da M’Boi Mirim",
  description: "O vídeo do g1 mostra o alagamento na zona sul. Naquele domingo, a Defesa Civil emitiu um alerta severo na capital.",
}, {
  publisher: "band.com.br",
  title: "São Paulo ultrapassa mil km de lentidão e enfrenta trânsito congestionado",
  publishedAt: "2026-11-26T20:51:13Z",
  url: "https://www.band.com.br/nacional/brasil/sao-paulo-ultrapassa-mil-km-de-lentidao-e-enfrenta-transito-congestionado",
  headline: "São Paulo passa de mil quilômetros de lentidão",
  description: "No fim da tarde de quinta-feira, motoristas também encontraram bloqueios em algumas das principais vias da capital, segundo a Band.",
}];

export function newsCopy(item: NewsItem) {
  const publisher = item.source.split(" · ")[0].trim();
  const suffix = " - " + publisher;
  const title = item.title.toLowerCase().endsWith(suffix.toLowerCase())
    ? item.title.slice(0, -suffix.length).trim() : item.title.trim();
  const archive = sourceCorrections.find(entry => entry.publisher === publisher.toLowerCase()
    && entry.title === title && Date.parse(entry.publishedAt) === Date.parse(item.publishedAt));
  return { publisher, title, headline: archive?.headline ?? title,
    description: archive?.description ?? item.description?.trim(), original: archive?.url };
}

export function newsLink(item: NewsItem) {
  try {
    const url = new URL(item.url);
    if (url.protocol === "https:" && !url.username && !url.password && url.hostname !== "news.google.com") {
      return { label: "Ler na fonte original", url: url.href };
    }
  } catch {
    // Old records can still be found by their headline.
  }
  const {publisher,title,original} = newsCopy(item);
  if (original) return { label: publisher.toLowerCase() === "g1" ? "Ler no G1" : "Ler na Band", url: original };
  if (publisher.toLowerCase() === "g1") {
    return { label: "Buscar título no G1", url: "https://g1.globo.com/busca/?q=" + encodeURIComponent(title) };
  }
  return {
    label: "Buscar notícia pelo título",
    url: "https://www.google.com/search?q=" + encodeURIComponent(title + " " + publisher),
  };
}
