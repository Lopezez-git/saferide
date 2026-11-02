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

@Service @Profile("prototype") @EnableScheduling
public class NewsService {
 private final JdbcTemplate db;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NORMAL).build();
 @org.springframework.beans.factory.annotation.Value("${saferide.news.enabled:true}") private boolean enabled;
 private volatile String status="WAITING",lastAttempt="";
 private static final Set<String> PUBLISHERS=Set.of("g1.globo.com","agenciabrasil.ebc.com.br","agenciasp.sp.gov.br","www.agenciasp.sp.gov.br","www.cnnbrasil.com.br","www.band.uol.com.br","www.band.com.br");
 public NewsService(JdbcTemplate db){this.db=db;}
 public static Optional<Instant> publication(String date,Instant now){
  try{Instant time;try{time=Instant.parse(date);}catch(Exception ignored){time=ZonedDateTime.parse(date,DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();}
   return time.isAfter(now.plusSeconds(300))||time.isBefore(now.minus(Duration.ofDays(7)))?Optional.empty():Optional.of(time);
  }catch(Exception e){return Optional.empty();}
 }
 @Scheduled(initialDelay=3000,fixedDelay=900000)
 public synchronized void collect(){
  if(!enabled)return;
  Instant now=Instant.now();lastAttempt=now.toString();boolean reachedSource=false;
  String query=URLEncoder.encode("(\"São Paulo\" OR \"capital paulista\") (trânsito OR interdição OR alagamento OR assalto) when:7d",StandardCharsets.UTF_8);
  List<String> feeds=List.of("https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml","https://news.google.com/rss/search?q="+query+"&hl=pt-BR&gl=BR&ceid=BR:pt-419");
  for(String feed:feeds){
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
      String regional=title.toLowerCase(Locale.ROOT);if(!regional.contains("são paulo")&&!regional.contains("capital paulista"))continue;
      String source="Agência Brasil";
      if(feed.contains("news.google.com")){
       Node node=item.getElementsByTagName("source").item(0);if(!(node instanceof Element publisher))continue;
       String host=URI.create(publisher.getAttribute("url")).getHost();if(!PUBLISHERS.contains(host)||!"news.google.com".equals(uri.getHost()))continue;
       source=publisher.getTextContent().strip()+" · via Google Notícias";
      }else{
       if(!"agenciabrasil.ebc.com.br".equals(uri.getHost()))continue;
       String normalized=title.toLowerCase(Locale.ROOT);
       if(!normalized.matches(".*(são paulo|capital paulista|\\bsp\\b).*"))continue;
       if(!normalized.matches(".*(trânsito|interdi|alag|obra|assalto|roubo|enchente|avenida|marginal|rodovia).*"))continue;
      }
      if(title.length()>300||url.length()>1000||source.length()>120)continue;
      String id=AuthService.hash(url);if(db.queryForObject("SELECT COUNT(*) FROM sr_news WHERE id=?",Integer.class,id)==0)db.update("INSERT INTO sr_news VALUES(?,?,?,?,?,?)",id,title,url,source,time.get().toString(),Timestamp.from(now));accepted++;
     }
    }
    if(accepted>0){status="UPDATED";return;}
   }catch(Exception e){if(e instanceof InterruptedException){Thread.currentThread().interrupt();break;}}
  }
  status=reachedSource?"NO_RECENT_ITEMS":"UNAVAILABLE";
 }
 public Map<String,Object> list(){return Map.of("status",status,"lastAttempt",lastAttempt,"items",db.queryForList("SELECT id,title,url,source,published_at AS publishedAt,collected_at AS collectedAt FROM sr_news WHERE (LOWER(title) LIKE '%são paulo%' OR LOWER(title) LIKE '%capital paulista%') AND published_at LIKE '20%' AND published_at>=? ORDER BY published_at DESC LIMIT 30",Instant.now().minus(Duration.ofDays(7)).toString()));}
 private static String text(Element e,String name){Node n=e.getElementsByTagName(name).item(0);return n==null?"":n.getTextContent().strip();}
}
