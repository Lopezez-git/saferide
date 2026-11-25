type NewsItem = { url: string; title: string; source: string; publishedAt: string };

// The original G1 report embeds the video referenced by this archived RSS item.
const sourceCorrections = [{
  publisher: "g1",
  title: "Alagamento no M'Boi Morim, em São Paulo",
  publishedAt: "2026-11-22T23:20:47Z",
  url: "https://g1.globo.com/sp/sao-paulo/noticia/2026/11/22/cidade-de-sp-entra-em-estado-de-atencao-para-alagamentos-defesa-civil-emite-alerta-severo.ghtml",
}];

export function newsLink(item: NewsItem) {
  try {
    const url = new URL(item.url);
    if (url.protocol === "https:" && !url.username && !url.password && url.hostname !== "news.google.com") {
      return { label: "Ler na fonte original", url: url.href };
    }
  } catch {
    // Old records can still be found by their headline.
  }
  const publisher = item.source.split(" · ")[0].trim();
  const suffix = " - " + publisher;
  const title = item.title.toLowerCase().endsWith(suffix.toLowerCase())
    ? item.title.slice(0, -suffix.length).trim() : item.title.trim();
  const correction = sourceCorrections.find(entry => entry.publisher === publisher.toLowerCase()
    && entry.title === title && Date.parse(entry.publishedAt) === Date.parse(item.publishedAt));
  if (correction) return { label: "Ler no G1", url: correction.url };
  if (publisher.toLowerCase() === "g1") {
    return { label: "Buscar título no G1", url: "https://g1.globo.com/busca/?q=" + encodeURIComponent(title) };
  }
  return {
    label: "Buscar notícia pelo título",
    url: "https://www.google.com/search?q=" + encodeURIComponent(title + " " + publisher),
  };
}
