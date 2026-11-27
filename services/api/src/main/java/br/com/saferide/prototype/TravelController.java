package br.com.saferide.prototype;
import java.util.*;
import java.time.*;
import java.net.URI;
import java.net.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.databind.*;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@RestController @Profile("prototype")
@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
@RequestMapping("/api/v1")
public class TravelController {
 private final RouteComparison comparison;
 private final NewsService news;private final ObjectMapper json;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
 private long lastRoute=0;
 public TravelController(NewsService news,ObjectMapper json,RouteComparison comparison){this.comparison=comparison;this.news=news;this.json=json;}
 public record RouteRequest(@DecimalMin("-24.1") @DecimalMax("-23.3") double fromLat,@DecimalMin("-46.9") @DecimalMax("-46.3") double fromLon,@DecimalMin("-24.1") @DecimalMax("-23.3") double toLat,@DecimalMin("-46.9") @DecimalMax("-46.3") double toLon){}
 @GetMapping("/news") public Map<String,Object> news(@RequestParam(defaultValue="false") boolean editorial){return news.list(editorial);}
 @PostMapping("/route") public JsonNode route(@Valid @RequestBody RouteRequest r,@RequestParam(defaultValue="false") boolean newsContext){
  return fetchRoutes(r, false, newsContext).get(0);
 }
 @PostMapping("/route/options") public RouteComparison.Result options(@Valid @RequestBody RouteRequest r){
  return comparison.compare(fetchRoutes(r, true, false));
 }
 private synchronized JsonNode fetchRoutes(RouteRequest r, boolean alternatives, boolean newsContext){
  if(System.currentTimeMillis()-lastRoute<1100)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Aguarde um instante antes de consultar outra rota.");lastRoute=System.currentTimeMillis();
  String coordinates=String.format(Locale.ROOT,"%.6f,%.6f;%.6f,%.6f",r.fromLon(),r.fromLat(),r.toLon(),r.toLat());
  try{
   var request=HttpRequest.newBuilder(URI.create("https://router.project-osrm.org/route/v1/driving/"+coordinates+"?overview=full&geometries=geojson&steps="+newsContext+"&alternatives="+alternatives)).timeout(Duration.ofSeconds(10)).header("User-Agent","SafeRideAcademicPrototype/0.1").GET().build();
   var response=http.send(request,HttpResponse.BodyHandlers.ofInputStream());
   try(var body=response.body()){
    if(response.statusCode()!=200)throw new IllegalStateException();byte[] bytes=body.readNBytes(2_000_001);if(bytes.length>2_000_000)throw new IllegalStateException();
    var result=json.readTree(bytes);if(!result.path("code").asText().equals("Ok")||result.path("routes").isEmpty())throw new IllegalStateException();var routes=result.path("routes");
    for(var route:routes) {
     if(newsContext) {
      var streets=((com.fasterxml.jackson.databind.node.ObjectNode)route).putArray("streetSteps");
      for(var leg:route.path("legs")){
       for(var step:leg.path("steps"))streets.addObject().put("name",step.path("name").asText()).put("duration",step.path("duration").asDouble());
       ((com.fasterxml.jackson.databind.node.ObjectNode)leg).remove("steps");
      }
     }
     var coords=route.path("geometry").path("coordinates");
     if(!coords.isArray() || coords.size()<2 || !route.path("duration").isNumber() || !route.path("distance").isNumber())
      throw new java.io.IOException("Traçado incompleto");
    }
    return routes;
   }
  }catch(Exception e){if(e instanceof InterruptedException)Thread.currentThread().interrupt();throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Não foi possível calcular a rota agora. Tente novamente; os relatos continuam disponíveis.");}
 }
}
