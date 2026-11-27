package br.com.saferide.prototype;

import java.util.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.net.*;
import java.net.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;
import org.springframework.context.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.util.HtmlUtils;

@Service @Profile("prototype") @EnableScheduling
public class NewsService {
 private final JdbcTemplate db;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NORMAL).build();
 @org.springframework.beans.factory.annotation.Value("${saferide.news.enabled:true}") private boolean enabled;
 private volatile String status="WAITING",lastAttempt="";
 private static final Set<String> PUBLISHERS=Set.of("g1.globo.com","agenciabrasil.ebc.com.br","agenciasp.sp.gov.br","www.agenciasp.sp.gov.br","www.cnnbrasil.com.br","www.band.uol.com.br","www.band.com.br","www.estadao.com.br","www1.folha.uol.com.br","prefeitura.sp.gov.br","capital.sp.gov.br","record.r7.com","sbtnews.sbt.com.br","cbn.globo.com");
 private static String searchFeed(String terms){
  return "https://news.google.com/rss/search?q="+URLEncoder.encode(terms+" when:7d",StandardCharsets.UTF_8)+"&hl=pt-BR&gl=BR&ceid=BR:pt-419";
 }
 private static final Map<String,String> DIRECT_SOURCES=Map.ofEntries(
   Map.entry("agenciabrasil.ebc.com.br","Agência Brasil"),
   Map.entry("g1.globo.com","G1"), Map.entry("record.r7.com","R7"),
   Map.entry("www.estadao.com.br","Estadão"), Map.entry("www.agenciasp.sp.gov.br","Agência SP"),
   Map.entry("portal.diadema.sp.gov.br","Prefeitura de Diadema"),
   Map.entry("frankamenteabc.com.br","Frankamente ABC"), Map.entry("abcdjornal.com.br","ABCD Jornal"),
   Map.entry("visaooeste.com.br","Visão Oeste"), Map.entry("tvsaobernardo.com","TV São Bernardo"),
   Map.entry("noticiasdemogi.com.br","Notícias de Mogi"), Map.entry("hojediario.com","Hoje Diário"),
   Map.entry("redecidadelive.com.br","Rede Cidade Live"), Map.entry("www.reporterdiario.com.br","Repórter Diário")
 );
 private static String publisherSearch(String host,String term){
  return "https://"+host+"/?s="+URLEncoder.encode(term,StandardCharsets.UTF_8)+"&feed=rss2";
 }
 private static final List<String> FEEDS=List.of(
   "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
   "https://g1.globo.com/rss/g1/sp/sao-paulo/",
   "https://g1.globo.com/rss/g1/sp/mogi-das-cruzes-suzano/",
   "https://record.r7.com/arc/outboundfeeds/rss/",
   publisherSearch("visaooeste.com.br","pavimento"),
   publisherSearch("visaooeste.com.br","roubo"),
   publisherSearch("tvsaobernardo.com","roubo"),
   publisherSearch("noticiasdemogi.com.br","asfalto"),
   publisherSearch("hojediario.com","tapa-buraco"),
   publisherSearch("redecidadelive.com.br","cascalhamento"),
   publisherSearch("abcdjornal.com.br","recapeamento"),
   publisherSearch("abcdjornal.com.br","roubo"),
   publisherSearch("hojediario.com","assalto"),
   publisherSearch("noticiasdemogi.com.br","veículo roubado"),
   publisherSearch("www.reporterdiario.com.br","roubo"),
   "https://record.r7.com/arc/outboundfeeds/rss/category/balanco-geral/",
   "https://www.estadao.com.br/arc/outboundfeeds/rss/?outputType=xml",
   "https://portal.diadema.sp.gov.br/?s=recapeamento&feed=rss2",
   "https://frankamenteabc.com.br/?s=pavimenta%C3%A7%C3%A3o&feed=rss2",
   "https://frankamenteabc.com.br/?s=recapeamento&feed=rss2",
   "https://frankamenteabc.com.br/?s=roubo&feed=rss2",
   "https://frankamenteabc.com.br/?s=furto+de+ve%C3%ADculos&feed=rss2",
   "https://www.agenciasp.sp.gov.br/?s=roubo+motorista&feed=rss2",
   "https://www.agenciasp.sp.gov.br/?s=roubo+de+carga&feed=rss2",
   searchFeed("\"São Paulo\" (trânsito OR interdição OR alagamento OR congestionamento)"),
   searchFeed("\"São Paulo\" (recapeamento OR pavimentação OR \"tapa-buraco\" OR cratera OR asfalto)"),
   searchFeed("(\"em SP\" OR \"São Paulo\") (motorista OR motociclista OR veículo OR entregador) (roubo OR assalto OR furtos OR assaltado)")
 );
 public NewsService(JdbcTemplate db){this.db=db;}
 public static Optional<Instant> publication(String date,Instant now){return publication(date,now,7);}
 public static Optional<Instant> publication(String date,Instant now,int days){
  try{Instant time;try{time=Instant.parse(date);}catch(Exception ignored){time=ZonedDateTime.parse(date,DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();}
   return time.isAfter(now.plusSeconds(300))||time.isBefore(now.minus(Duration.ofDays(days)))?Optional.empty():Optional.of(time);
  }catch(Exception e){return Optional.empty();}
 }
 @Scheduled(initialDelay=3000,fixedDelay=900000)
 public synchronized void collect(){
  if(!enabled)return;
  Instant now=Instant.now();lastAttempt=now.toString();boolean reachedSource=false,foundRelevant=false;
  for(String feed:FEEDS){
   try{
    var request=HttpRequest.newBuilder(URI.create(feed)).timeout(Duration.ofSeconds(10)).header("User-Agent","SafeRideAcademicPrototype/0.1 (+https://github.com/Lopezez-git/saferide)").GET().build();
    var response=http.send(request,HttpResponse.BodyHandlers.ofInputStream());int accepted=0;
    try(var stream=response.body()){
     if(response.statusCode()!=200)throw new IOException("Source unavailable");
     byte[] body=stream.readNBytes(2_000_001);if(body.length>2_000_000)throw new IOException("Feed too large");
     if(body.length>2&&(body[0]&255)==31&&(body[1]&255)==139){try(var gzip=new java.util.zip.GZIPInputStream(new ByteArrayInputStream(body))){body=gzip.readNBytes(2_000_001);}if(body.length>2_000_000)throw new IOException("Feed too large");}
     var factory=DocumentBuilderFactory.newInstance();factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);factory.setFeature("http://xml.org/sax/features/external-general-entities",false);factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);factory.setXIncludeAware(false);factory.setExpandEntityReferences(false);
     var items=factory.newDocumentBuilder().parse(new ByteArrayInputStream(body)).getElementsByTagName("item");reachedSource=true;
     for(int i=0;i<Math.min(items.getLength(),100);i++){
      Element item=(Element)items.item(i);String title=text(item,"title"),url=text(item,"link");var time=publication(text(item,"pubDate"),now);if(time.isEmpty())continue;
      URI uri=URI.create(url);if(!"https".equals(uri.getScheme()))continue;
      String feedHost=URI.create(feed).getHost();
      String source=DIRECT_SOURCES.get(feedHost);
      if("news.google.com".equals(feedHost)){
       Node node=item.getElementsByTagName("source").item(0);if(!(node instanceof Element publisher))continue;
       String host=URI.create(publisher.getAttribute("url")).getHost();if(!PUBLISHERS.contains(host)||!"news.google.com".equals(uri.getHost()))continue;
       source=publisher.getTextContent().strip()+" · via Google Notícias";
      }else{
       if(source==null || !feedHost.equalsIgnoreCase(uri.getHost()) || uri.getUserInfo()!=null || uri.getPath().length()<2)continue;
      }
      if(title.length()>300||url.length()>1000||source.length()>120)continue;
      String id=AuthService.hash(url);
      String description=excerpt(text(item,"atom:subtitle"),title);
      if(description==null)description=excerpt(text(item,"description"),title);
      if(NewsRelevance.regionalCategory(title,source,description)==null)continue;
      if(db.queryForObject("SELECT COUNT(*) FROM sr_news WHERE id=?",Integer.class,id)==0){
       db.update("INSERT INTO sr_news(id,title,url,source,published_at,collected_at,description) VALUES(?,?,?,?,?,?,?)",id,title,url,source,time.get().toString(),Timestamp.from(now),description);
      }else if(description!=null){
       db.update("UPDATE sr_news SET description=? WHERE id=? AND (description IS NULL OR description<>?)",description,id,description);
      }
      accepted++;
     }
    }
    if(accepted>0)foundRelevant=true;
   }catch(Exception e){if(e instanceof InterruptedException){Thread.currentThread().interrupt();break;}}
  }
  status=foundRelevant?"UPDATED":reachedSource?"NO_RECENT_ITEMS":"UNAVAILABLE";
 }
 public Map<String,Object> list(boolean editorial){
  Instant now=Instant.now();
  var recent=db.queryForList("SELECT id,title,url,source,description,published_at AS \"publishedAt\",collected_at AS \"collectedAt\" FROM sr_news WHERE published_at>=? AND published_at<=? ORDER BY published_at DESC,id",
    now.minus(Duration.ofDays(7)).toString(),now.toString());
  var items=new ArrayList<Map<String,Object>>();
  Set<List<String>> seen=new HashSet<>();
  Set<String> articleUrls=new HashSet<>();
  for(var item:recent){
   String category=NewsRelevance.regionalCategory((String)item.get("title"),(String)item.get("source"),(String)item.get("description"));
   if(category!=null &&
      seen.add(List.of((String)item.get("source"),(String)item.get("title"),(String)item.get("publishedAt")))){
    if(("Pavimento".equals(category)||"Segurança".equals(category)) && !prepareArticle(item))continue;
    if(!articleUrls.add((String)item.get("url")))continue;
    item.put("category",category);
    NewsWindow.from((String)item.get("title"),Instant.parse((String)item.get("publishedAt")))
      .ifPresent(window->item.put("window",window));
    items.add(item);
   }
  }
  return Map.of("status",status,"lastAttempt",lastAttempt,"items",editorial?editorialSelection(items,now):items);
 }

 // Rows arrive newest first. Expired stories cannot fill a weekly edition.
 static List<Map<String,Object>> editorialSelection(List<Map<String,Object>> items,Instant now){
  Instant cutoff=now.minus(Duration.ofDays(7));
  var selected=new ArrayList<Map<String,Object>>();
  Set<String> headlines=new HashSet<>();
  var recentPhrases=new HashMap<List<String>,Instant>();
  var counts=new HashMap<String,Integer>();
  for(var item:items){
   Instant published=Instant.parse((String)item.get("publishedAt"));
   if(published.isBefore(cutoff) || published.isAfter(now))continue;
   String key=NewsRelevance.headline((String)item.get("title")).toLowerCase(Locale.ROOT)
     .replace("recapeamento","recape").replaceAll("[^\\p{L}\\p{N}]+"," ").strip();
   if(!headlines.add(key))continue;
   String category=(String)item.get("category");
   if(!"Trânsito e acesso".equals(category)){
    if(counts.getOrDefault(category,0)>=8)continue;
    // Regional outlets often repeat the same lead with a different ending.
    String words=key.replaceAll("\\b(?:a|ao|o|à|de|do|da|dos|das|em|no|na|e|é|que|para|por)\\b"," ").strip();
    var tokens=words.isEmpty()?List.<String>of():Arrays.asList(words.split("\\s+"));
    var phrases=new ArrayList<List<String>>();
    if(tokens.size()>=4){
     String opening=String.join(" ",tokens.subList(0,4));
     String details=String.join(" ",tokens.subList(4,tokens.size()))+" "+item.getOrDefault("description","");
     String[] detailWords=details.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+");
     for(int i=1;i<detailWords.length;i++){
      if(detailWords[i-1].length()>3 && detailWords[i].length()>3)
       phrases.add(List.of(category,opening,detailWords[i-1],detailWords[i]));
     }
    }
    if(phrases.stream().map(recentPhrases::get).filter(Objects::nonNull)
        .anyMatch(previous->Duration.between(published,previous).abs().compareTo(Duration.ofHours(48))<=0))continue;
    for(var phrase:phrases)recentPhrases.put(phrase,published);
    counts.merge(category,1,Integer::sum);
   }
   selected.add(item);
  }
  return selected;
 }
 // Publisher-confirmed metadata for archived RSS entries whose Google links are opaque.
 private record Original(String source,String publishedAt,String title,String url,String summary){}
 private static final List<Original> ORIGINALS=List.of(
   new Original("Estadão","2026-11-26T01:00:00Z","Leitor reclama de buracos no Minhocão",
     "https://www.estadao.com.br/sao-paulo/seus-direitos/leitor-reclama-de-buracos-no-minhocao",
     "Após a reclamação de um leitor, a prefeitura informou que a equipe de tapa-buraco fez reparos no piso do Minhocão."),
   new Original("R7","2026-11-26T16:57:43Z","Homem é baleado na frente da filha ao tentar impedir roubo de moto em São Paulo",
     "https://record.r7.com/balanco-geral/video/homem-e-baleado-na-frente-da-filha-ao-tentar-impedir-roubo-de-moto-em-sao-paulo-26112026/",
     "Um homem foi baleado ao tentar impedir que levassem sua moto no Campo Limpo, na zona sul de São Paulo. A filha estava com ele.")
 );
 static boolean prepareArticle(Map<String,Object> item){
  String publisher=((String)item.get("source")).split(" · ",2)[0];
  for(var original:ORIGINALS){
   if(original.source().equals(publisher) && original.publishedAt().equals(item.get("publishedAt"))
     && original.title().equals(NewsRelevance.headline((String)item.get("title")))){
    item.put("url",original.url());item.put("description",original.summary());return true;
   }
  }
  if(!(item.get("description") instanceof String summary) || summary.isBlank())return false;
  try{
   URI uri=URI.create((String)item.get("url"));
   return "https".equals(uri.getScheme()) && uri.getHost()!=null && (PUBLISHERS.contains(uri.getHost()) || DIRECT_SOURCES.containsKey(uri.getHost()))
     && uri.getUserInfo()==null && uri.getPath().length()>1;
  }catch(IllegalArgumentException e){return false;}
 }
 private static String text(Element e,String name){Node n=e.getElementsByTagName(name).item(0);return n==null?"":n.getTextContent().strip();}
 static String excerpt(String html,String title){
  if(html.isBlank() || html.matches("(?is).*<(?:ol|ul|li)\\b.*"))return null;
  String plain=HtmlUtils.htmlUnescape(html.replaceAll("(?is)<(script|style)\\b[^>]*>.*?</\\1>"," ")
    .replaceAll("(?is)<[^>]+>"," ")).replace('\u00a0',' ').replaceAll("\\s+"," ").strip();
  String headline=NewsRelevance.headline(title);
  plain=plain.split("(?i)\\s+(?:The post\\s|O post\\s|Foto:\\s|Por Assessoria\\b)",2)[0].strip();
  if(plain.length()<24 || plain.equalsIgnoreCase(headline) || plain.equalsIgnoreCase(title))return null;
  if(plain.regionMatches(true,0,headline,0,headline.length())){
   plain=plain.substring(headline.length()).replaceFirst("^[\\s\\p{Punct}·–—]+","").strip();
   if(plain.length()<24)return null;
  }
  if(plain.length()<=320)return plain;
  int cut=plain.lastIndexOf(' ',319);
  return plain.substring(0,cut>0?cut:319).stripTrailing()+"…";
 }
}
