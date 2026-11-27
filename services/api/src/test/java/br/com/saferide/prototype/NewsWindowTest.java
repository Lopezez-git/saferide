package br.com.saferide.prototype;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class NewsWindowTest {
    @Test void weeklyEditionLimitsEachTopicIndependentlyAndNeverBackfills() {
        var now = Instant.parse("2026-11-27T12:00:00Z");
        var rows = new java.util.ArrayList<java.util.Map<String,Object>>();
        for(int i=0;i<10;i++){
            rows.add(java.util.Map.of("title","Pavimento "+i,"category","Pavimento","publishedAt",now.minusSeconds(i).toString()));
        }
        rows.add(java.util.Map.of("title","Segurança na divisa","category","Segurança","publishedAt",now.minusSeconds(604800).toString()));
        rows.add(rows.get(rows.size()-1));
        rows.add(java.util.Map.of("title","Matéria expirada","category","Segurança","publishedAt",now.minusSeconds(604801).toString()));
        rows.add(java.util.Map.of("title","Matéria futura","category","Segurança","publishedAt",now.plusSeconds(1).toString()));
        var selected=NewsService.editorialSelection(rows,now);
        assertEquals(9,selected.size());
        assertEquals("Pavimento 7",selected.get(7).get("title"));
        assertEquals("Segurança na divisa",selected.get(8).get("title"));
    }
    @Test void sameIncidentFromTwoOutletsOccupiesOnePlace() {
        var now=Instant.parse("2026-11-27T00:00:00Z");
        var first=java.util.Map.<String,Object>of("title","Homem é baleado na frente da filha durante assalto no Campo Limpo",
            "description","A vítima voltava de moto.","category","Segurança","publishedAt",now.toString());
        var second=java.util.Map.<String,Object>of("title","Homem é baleado na frente da filha ao tentar impedir roubo",
            "description","O caso aconteceu no Campo Limpo.","category","Segurança","publishedAt",now.minusSeconds(7200).toString());
        assertEquals(java.util.List.of(first),NewsService.editorialSelection(java.util.List.of(first,second),now));
    }
    @Test void pavementAndSafetyCardsRequireAnArticleLinkAndAnActualSummary() {
        var item=new java.util.HashMap<String,Object>(java.util.Map.of(
            "source","Estadão · via Google Notícias","title","Leitor reclama de buracos no Minhocão - Estadão",
            "publishedAt","2026-11-26T01:00:00Z","url","https://news.google.com/rss/articles/opaque"));
        assertTrue(NewsService.prepareArticle(item));
        assertEquals("www.estadao.com.br",java.net.URI.create((String)item.get("url")).getHost());
        assertTrue(((String)item.get("description")).contains("reparos"));
        item.put("title","Outra via recebe reparos");
        item.put("publishedAt","2026-11-27T10:00:00Z");
        item.put("url","https://record.r7.com/reportagem/nova/");
        assertTrue(NewsService.prepareArticle(item));
        item.put("url","https://news.google.com/rss/articles/opaque");
        assertFalse(NewsService.prepareArticle(item));
        item.put("url","https://record.r7.com/reportagem/nova/");
        item.remove("description");
        assertFalse(NewsService.prepareArticle(item));
    }
    @Test void newsExcerptPreservesProseAndSkipsAggregatedHeadlineLists() {
        var title = "Interdição na Paulista - G1";
        assertNull(NewsService.excerpt("<a href='artigo'>Interdição na Paulista</a> &nbsp; G1",title));
        assertNull(NewsService.excerpt("<ol><li>Um título de outra reportagem</li></ol>",title));
        assertEquals("Há bloqueios para obras na esquina desde a manhã.",
            NewsService.excerpt("<p>Há bloqueios para obras na esquina desde a manhã.</p>",title));
    }
    private final Instant published = Instant.parse("2026-11-27T01:00:00Z"); // 26/11 in São Paulo
    @Test void explicitDayAndOvernightIntervalUseSourceTimezone() {
        var window = NewsWindow.from("Avenida Paulista interditada amanhã das 22h às 02h30", published).orElseThrow();
        assertEquals(Instant.parse("2026-11-28T01:00:00Z"), window.start());
        assertEquals(Instant.parse("2026-11-28T05:30:00Z"), window.end());
    }
    @Test void incompleteOrAmbiguousDateCannotTriggerAnOffer() {
        for(String title:new String[]{"Alagamento na Paulista hoje", "Obras das 8h às 11h", "Interdição em 31/02 das 08h às 10h", "Hoje e amanhã das 8h às 11h"})
            assertTrue(NewsWindow.from(title,published).isEmpty());
    }
    @Test void filtersStoriesThatMatterToDrivers() {
        assertEquals("Pavimento",NewsRelevance.regionalCategory("Castello Branco terá interdição em Barueri para reparo no pavimento","Visão Oeste",""));
        assertEquals("Segurança",NewsRelevance.regionalCategory("Polícia recupera peças de motocicletas roubadas em Alphaville","Visão Oeste","O caso ocorreu em Barueri."));
        assertNull(NewsRelevance.regionalCategory("Polícia prende procurado em São Caetano do Sul","ABCD Jornal","Possuía antecedentes por roubo de motocicleta."));
        assertTrue(NewsRelevance.inPilotRegion("Leitor reclama de buracos no Minhocão - Estadão"));
        assertEquals("Pavimento",NewsRelevance.feedCategory("Leitor reclama de buracos no Minhocão - Estadão"));
        assertTrue(NewsRelevance.inPilotRegion("Roubo de motos na zona sul de SP"));
        assertFalse(NewsRelevance.inPilotRegion("Cratera no litoral de São Paulo - G1"));
        assertFalse(NewsRelevance.inPilotRegion("Recapeamento em Manaus - GP São Paulo"));
        assertEquals("Trânsito e acesso",NewsRelevance.feedCategory("Alagamento no M'Boi Mirim em São Paulo - G1"));
        assertEquals("Pavimento",NewsRelevance.feedCategory("Tapa-buraco começa em São Paulo"));
        assertEquals("Segurança",NewsRelevance.feedCategory("Roubo de veículos em São Paulo"));
        assertNull(NewsRelevance.feedCategory("Projeto de lei sobre roubo de veículos em São Paulo"));
        assertNull(NewsRelevance.feedCategory("Presidente visita São Paulo"));
    }
}
