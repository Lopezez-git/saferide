package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
@RestController @Profile("prototype") @RequestMapping("/api/v1/safety")
public class PoliceSafetyController {
 private final PublicDataRefresh.Snapshot snapshot;
 public PoliceSafetyController(ObjectMapper mapper) {
  snapshot=new PublicDataRefresh.Snapshot(mapper,"ssp-vehicles.json");
 }

 public static double distance(double lat,double lon,double lat2,double lon2){
  double a=Math.pow(Math.sin(Math.toRadians(lat2-lat)/2),2)+Math.cos(Math.toRadians(lat))*Math.cos(Math.toRadians(lat2))*Math.pow(Math.sin(Math.toRadians(lon2-lon)/2),2);
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
 }
 public static Map<String,Integer> countsWithin(JsonNode cells,double lat,double lon){
  Map<String,Integer> counts=new TreeMap<>();
  for(var cell:cells)if(distance(lat,lon,cell.path("latitude").asDouble(),cell.path("longitude").asDouble())<=1000)counts.merge(cell.path("category").asText(),cell.path("count").asInt(),Integer::sum);
  return counts;
 }
 public static Map<String,Object> timeBreakdown(JsonNode cells,double lat,double lon){
  Map<String,Object> windows=new LinkedHashMap<>();
  for(int hour=0;hour<24;hour++)windows.put(String.format(Locale.ROOT,"%02d",hour),new TreeMap<String,Integer>());
  int unknown=0;
  for(var cell:cells){
   if(distance(lat,lon,cell.path("latitude").asDouble(),cell.path("longitude").asDouble())>1000)continue;
   String window=cell.path("timeWindow").asText("UNKNOWN");
   if(!windows.containsKey(window)){unknown+=cell.path("count").asInt();continue;}
   @SuppressWarnings("unchecked") Map<String,Integer> categories=(Map<String,Integer>)windows.get(window);
   categories.merge(cell.path("category").asText(),cell.path("count").asInt(),Integer::sum);
  }
  return Map.of("windows",windows,"unknownTimeTotal",unknown);
 }
 @GetMapping("/police") public Map<String,Object> local(@RequestParam double latitude,@RequestParam double longitude){
  if(!Double.isFinite(latitude)||!Double.isFinite(longitude)||latitude< -24.1||latitude> -23.3||longitude< -46.9||longitude> -46.3)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Fora da área piloto.");
  JsonNode dataset=snapshot.get();
  if(dataset==null)return Map.of("status","UNAVAILABLE","message","Base SSP não carregada.");
  var counts=countsWithin(dataset.path("cells"),latitude,longitude);
  Map<String,Object> result=new LinkedHashMap<>();
  result.put("status","AVAILABLE");result.put("scope","RADIUS");result.put("radiusMeters",1000);result.put("city",dataset.path("city").asText());
  result.put("total",counts.values().stream().mapToInt(Integer::intValue).sum());result.put("categories",counts);
  var times=timeBreakdown(dataset.path("cells"),latitude,longitude);
  result.putAll(times);
  int hour=ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")).getHour();
  result.put("currentTimeWindow",String.format(Locale.ROOT,"%02d",hour));
  result.put("timeZone","America/Sao_Paulo");
  for(String key:List.of("source","sourceUrl","lastCheckedAt","importedAt","periodStart","periodEnd"))result.put(key,dataset.path(key).asText());
  result.put("coverage","Boletins com veículos roubados ou furtados, coordenadas válidas e local do fato em São Paulo. Não cobre todos os crimes.");
  result.put("methodology","Tratamento exploratório SafeRide da base bruta da SSP; deduplicação por delegacia, ano e número do BO, última versão. A faixa horária usa a hora declarada do fato, não a hora do registro. Hora ausente ou conflitante fica fora das faixas. Não é indicador oficial de criminalidade nem alerta em tempo real.");
  result.put("stale",java.time.YearMonth.parse(dataset.path("periodEnd").asText()).atEndOfMonth().isBefore(java.time.LocalDate.now(ZoneId.of("America/Sao_Paulo")).minusDays(60)));
  return result;
 }
}
