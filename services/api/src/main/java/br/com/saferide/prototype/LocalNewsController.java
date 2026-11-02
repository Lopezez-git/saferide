package br.com.saferide.prototype;
import java.util.*;
import java.time.*;
import java.net.*;
import java.net.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController @Profile("prototype")
@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
@RequestMapping("/api/v1")
public class LocalNewsController {
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
 private final Map<String,Result> cache=new LinkedHashMap<>();
 private long lastRequest;
 private static final Set<String> PUBLISHERS=Set.of("g1.globo.com","agenciabrasil.ebc.com.br","agenciasp.sp.gov.br","www.agenciasp.sp.gov.br","www.cnnbrasil.com.br","www.band.uol.com.br","www.band.com.br");
 public record Item(String id,String title,String url,String source,String publishedAt,String topic){}
 public record Result(String place,String status,String lastAttempt,List<Item> items){}
 private static String normalize(String value){return Normalizer.normalize(value,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("\\bav\\.?\\s+","avenida ").replaceAll("[^a-z0-9 ]"," ").replaceAll("\\s+"," ").strip();}
 public static boolean mentions(String title,String place){String p=normalize(place);return p.length()>=4&&!Set.of("sao paulo","sp","capital paulista").contains(p)&&(" "+normalize(title)+" ").contains(" "+p+" ");}
 @GetMapping("/news/local") public synchronized Result local(@RequestParam String place,@RequestParam(defaultValue="São Paulo") String city){
  city=city.strip();
  if(city.length()<2||city.length()>100||!city.matches("[\\p{L} .-]+"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Cidade inválida.");
  place=place.strip().replaceAll("\\s+"," ");
  if(place.length()<4||place.length()>160||!place.matches("[\\p{L}\\p{N} .,'’/()&-]+")||Set.of("sao paulo","sp","capital paulista").contains(normalize(place)))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Selecione uma rua ou um lugar específico.");
  long now=System.currentTimeMillis();String key=normalize(city)+"::"+normalize(place);var hit=cache.get(key);
  if(hit!=null&&Instant.parse(hit.lastAttempt()).toEpochMilli()>now-900000)return hit;
  if(now-lastRequest<1200)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Aguarde um instante e tente novamente.");
  lastRequest=now;Instant collected=Instant.now();List<Item> found=new ArrayList<>();
  try{
   String query=URLEncoder.encode("\""+place+"\" \""+city+"\" (assalto OR roubo OR acidente OR alagamento OR interdição OR trânsito OR buraco OR obras OR tiroteio) when:7d",StandardCharsets.UTF_8);
   var request=HttpRequest.newBuilder(URI.create("https://news.google.com/rss/search?q="+query+"&hl=pt-BR&gl=BR&ceid=BR:pt-419")).timeout(Duration.ofSeconds(10)).header("User-Agent","SafeRideAcademicPrototype/0.1 (+https://github.com/Lopezez-git/saferide)").GET().build();
   var response=http.send(request,HttpResponse.BodyHandlers.ofInputStream());
   try(var input=response.body()){
    if(response.statusCode()!=200)throw new IOException();byte[] bytes=input.readNBytes(2000001);if(bytes.length>2000000)throw new IOException();
    var factory=DocumentBuilderFactory.newInstance();factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);factory.setFeature("http://xml.org/sax/features/external-general-entities",false);factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);factory.setXIncludeAware(false);factory.setExpandEntityReferences(false);
    var items=factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes)).getElementsByTagName("item");
    Set<String> urls=new HashSet<>();
    for(int i=0;i<Math.min(100,items.getLength());i++){
     Element item=(Element)items.item(i);String title=text(item,"title"),url=text(item,"link");
     // Match the headline before the publisher suffix, never just the source name.
     String headline=title.contains(" - ")?title.substring(0,title.lastIndexOf(" - ")):title;
     if(title.length()>300||url.length()>1000||!mentions(headline,place)||!NewsRelevance.relevant(title))continue;
     var time=NewsService.publication(text(item,"pubDate"),collected);if(time.isEmpty())continue;
     var uri=URI.create(url);if(!"https".equals(uri.getScheme())||!"news.google.com".equals(uri.getHost()))continue;
     var nodes=item.getElementsByTagName("source");if(nodes.getLength()==0)continue;Element publisher=(Element)nodes.item(0);
     if(!PUBLISHERS.contains(URI.create(publisher.getAttribute("url")).getHost()))continue;
     if(urls.add(url))found.add(new Item(AuthService.hash(url),title,url,publisher.getTextContent().strip()+" · via Google Notícias",time.get().toString(),NewsRelevance.topic(headline)));
    }
   }
   found.sort(Comparator.comparing(Item::publishedAt).reversed());
   var result=new Result(place,found.isEmpty()?"NO_LOCAL_ITEMS":"UPDATED",collected.toString(),List.copyOf(found));
   if(cache.size()>=100)cache.remove(cache.keySet().iterator().next());cache.put(key,result);return result;
  }catch(Exception e){if(e instanceof InterruptedException)Thread.currentThread().interrupt();return new Result(place,"UNAVAILABLE",collected.toString(),hit==null?List.of():hit.items().stream().filter(n->Instant.parse(n.publishedAt()).isAfter(collected.minus(Duration.ofDays(7)))).toList());}
 }
 private static String text(Element e,String name){var n=e.getElementsByTagName(name).item(0);return n==null?"":n.getTextContent().strip();}
}
