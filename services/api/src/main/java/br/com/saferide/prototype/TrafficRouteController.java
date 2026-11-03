package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
@RestController @Profile("prototype") @RequestMapping("/api/v1/traffic")
public class TrafficRouteController {
 private final ObjectMapper json;
 private final String apiKey;
 private final HttpClient http;
 private final Map<String,Result> cache=new LinkedHashMap<>();

 public TrafficRouteController(ObjectMapper json,@Value("${saferide.tomtom.api-key:}") String apiKey) {
  this.json=json;this.apiKey=apiKey.strip();
  this.http=this.apiKey.isEmpty()?null:HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
 }

 public record Result(String status,String condition,int travelTimeSeconds,int delaySeconds,
                      String checkedAt,String source,String message) {}

 static String classify(int travelSeconds,int delaySeconds) {
  double ratio=(double)delaySeconds/Math.max(60,travelSeconds-delaySeconds);
  if(delaySeconds>=180&&ratio>=0.20)return "CONGESTIONADO";
  if(delaySeconds>=60&&ratio>=0.08)return "MODERADO";
  return "LEVE";
 }

 static Result fromSummary(JsonNode summary,Instant checkedAt) throws IOException {
  if(!summary.path("travelTimeInSeconds").isNumber()||!summary.path("trafficDelayInSeconds").isNumber())
   throw new IOException("Resumo de trânsito incompleto");
  int travel=summary.path("travelTimeInSeconds").asInt(-1);
  int delay=summary.path("trafficDelayInSeconds").asInt(-1);
  if(travel<=0||delay<0||delay>travel)throw new IOException("Tempos de trânsito inválidos");
  return new Result("AVAILABLE",classify(travel,delay),travel,delay,checkedAt.toString(),"TomTom Traffic",
    "Estimativa para uma rota calculada pela TomTom entre origem e destino; o traçado pode diferir da rota desenhada no mapa.");
 }

 @PostMapping("/route") public synchronized Result route(@Valid @RequestBody TravelController.RouteRequest points) {
  if(apiKey.isEmpty())return new Result("UNAVAILABLE","",0,0,"","","Trânsito ao vivo não configurado.");
  String routeKey=String.format(Locale.ROOT,"%.5f,%.5f:%.5f,%.5f",points.fromLat(),points.fromLon(),points.toLat(),points.toLon());
  var cached=cache.get(routeKey);
  if(cached!=null&&Instant.parse(cached.checkedAt()).isAfter(Instant.now().minusSeconds(60)))return cached;
  try {
   String path=String.format(Locale.ROOT,"%.6f,%.6f:%.6f,%.6f",points.fromLat(),points.fromLon(),points.toLat(),points.toLon());
   String url="https://api.tomtom.com/maps/orbis/routing/calculateRoute/"+path+
     "/json?apiVersion=2&traffic=live&travelMode=car&routeType=fastest&key="+
     URLEncoder.encode(apiKey,StandardCharsets.UTF_8);
   var request=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(6))
     .header("User-Agent","SafeRideAcademicPrototype/0.1 (+https://github.com/Lopezez-git/saferide)").GET().build();
   var response=http.send(request,HttpResponse.BodyHandlers.ofInputStream());
   try(var body=response.body()) {
    if(response.statusCode()!=200)throw new IOException("Provedor de trânsito indisponível");
    byte[] bytes=body.readNBytes(2_000_001);if(bytes.length>2_000_000)throw new IOException("Resposta acima do limite");
    var routes=json.readTree(bytes).path("routes");
    if(!routes.isArray()||routes.isEmpty())throw new IOException("Rota não encontrada");
    var result=fromSummary(routes.get(0).path("summary"),Instant.now());
    if(cache.size()>=100)cache.remove(cache.keySet().iterator().next());
    cache.put(routeKey,result);return result;
   }
  } catch(Exception e) {
   if(e instanceof InterruptedException)Thread.currentThread().interrupt();
   return new Result("UNAVAILABLE","",0,0,"","","Não foi possível consultar o trânsito desta viagem agora.");
  }
 }
}
