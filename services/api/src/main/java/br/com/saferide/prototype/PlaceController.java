package br.com.saferide.prototype;
import java.util.*;
import java.time.Duration;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController @Profile("prototype")
@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
@RequestMapping("/api/v1")
public class PlaceController {
 private final ObjectMapper json;
 private final String endpoint;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
 private final Map<String,Cached> cache=new LinkedHashMap<>();
 private long lastRequest;
 record Cached(long time,List<Place> places){}
 public record Place(String id,String name,String address,double latitude,double longitude){}
 public PlaceController(ObjectMapper json,@Value("${places.url:https://photon.komoot.io/api/}") String endpoint){this.json=json;this.endpoint=endpoint;}
 @GetMapping("/places") public synchronized List<Place> search(@RequestParam String q){
  String term=q.strip().replaceAll("\\s+"," ");
  if(term.length()<3||term.length()>120)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Digite entre 3 e 120 caracteres.");
  String key=term.toLowerCase(Locale.ROOT);long now=System.currentTimeMillis();var hit=cache.get(key);
  if(hit!=null&&now-hit.time()<3600000)return hit.places();
  if(now-lastRequest<1100)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Aguarde um instante antes de buscar novamente.");
  lastRequest=now;
  try{
   var uri=URI.create(endpoint+"?q="+URLEncoder.encode(term,StandardCharsets.UTF_8)+"&limit=8&lat=-23.5505&lon=-46.6333&bbox=-46.9,-24.1,-46.3,-23.3");
   var request=HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10)).header("User-Agent","SafeRideAcademicPrototype/0.1 (+https://github.com/Lopezez-git/saferide)").GET().build();
   var response=http.send(request,HttpResponse.BodyHandlers.ofInputStream());
   List<Place> places=new ArrayList<>();
   try(var body=response.body()){
    if(response.statusCode()!=200)throw new IllegalStateException();
    byte[] bytes=body.readNBytes(1000001);if(bytes.length>1000000)throw new IllegalStateException();
    JsonNode root=json.readTree(bytes);if(!root.path("features").isArray())throw new IllegalStateException();
    for(var feature:root.path("features")){
     var c=feature.path("geometry").path("coordinates");var a=feature.path("properties");
     if(c.size()<2||!c.get(0).isNumber()||!c.get(1).isNumber())continue;
     double lon=c.get(0).asDouble(),lat=c.get(1).asDouble();if(lat< -24.1||lat> -23.3||lon< -46.9||lon> -46.3)continue;
     String name=a.path("name").asText(a.path("street").asText("Local encontrado"));
     Set<String> address=new LinkedHashSet<>();for(String field:List.of("street","housenumber","district","city","state")){String v=a.path(field).asText("");if(!v.isBlank()&&!v.equals(name))address.add(v);}
     places.add(new Place(a.path("osm_type").asText()+a.path("osm_id").asText()+":"+places.size(),name,String.join(", ",address),lat,lon));
    }
   }
   if(cache.size()>=200)cache.remove(cache.keySet().iterator().next());
   var result=List.copyOf(places);cache.put(key,new Cached(now,result));return result;
  }catch(Exception e){if(e instanceof InterruptedException)Thread.currentThread().interrupt();throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"A busca de endereços está indisponível. Tente novamente ou selecione no mapa.");}
 }
}
