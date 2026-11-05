package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
@RestController @Profile("prototype") @RequestMapping("/api/v1/pavement")
public class PavementController {
 private final PublicDataRefresh.Snapshot snapshot;
 public PavementController(ObjectMapper mapper) {
  snapshot=new PublicDataRefresh.Snapshot(mapper,"sp156-pavement.json");
 }

 public static List<Map<String,Object>> nearby(JsonNode records,double latitude,double longitude) {
  List<Map<String,Object>> found=new ArrayList<>();
  for(var record:records) {
   double distance=PoliceSafetyController.distance(latitude,longitude,record.path("latitude").asDouble(),record.path("longitude").asDouble());
   if(distance>1000)continue;
   Map<String,Object> item=new LinkedHashMap<>();
   for(String key:List.of("openedAt","finishedAt","street","number","service","status"))
    item.put(key,record.path(key).isNull()?null:record.path(key).asText());
   item.put("distanceMeters",Math.round(distance));
   found.add(item);
  }
  found.sort(Comparator.comparing((Map<String,Object> item)->(String)item.get("openedAt"),Comparator.reverseOrder())
    .thenComparingLong(item->(Long)item.get("distanceMeters")));
  return found;
 }

 public static List<Map<String,Object>> groupForDisplay(List<Map<String,Object>> requests) {
  Map<String,Map<String,Object>> grouped=new LinkedHashMap<>();
  for(var request:requests) {
   String key=List.of("openedAt","finishedAt","street","number","service","status","distanceMeters")
     .stream().map(field->String.valueOf(request.get(field))).reduce((a,b)->a+"|"+b).orElse("");
   var existing=grouped.get(key);
   if(existing==null) {
    var item=new LinkedHashMap<>(request);
    item.put("sameDetailsCount",1);
    grouped.put(key,item);
   } else existing.put("sameDetailsCount",(int)existing.get("sameDetailsCount")+1);
  }
  return new ArrayList<>(grouped.values());
 }

 @GetMapping("/requests") public Map<String,Object> local(@RequestParam double latitude,@RequestParam double longitude) {
  if(!Double.isFinite(latitude)||!Double.isFinite(longitude)||latitude< -24.1||latitude> -23.3||longitude< -46.9||longitude> -46.3)
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Fora da área piloto.");
  JsonNode dataset=snapshot.get();
  if(dataset==null)return Map.of("status","UNAVAILABLE","message","Base SP156 não carregada.");
  var found=nearby(dataset.path("records"),latitude,longitude);
  Map<String,Integer> statuses=new LinkedHashMap<>();
  for(var item:found)statuses.merge((String)item.get("status"),1,Integer::sum);
  Map<String,Object> result=new LinkedHashMap<>();
  result.put("status","AVAILABLE");result.put("radiusMeters",1000);
  result.put("totalRequests",found.size());result.put("statuses",statuses);
  var display=groupForDisplay(found);
  result.put("items",display.subList(0,Math.min(12,display.size())));
  for(String key:List.of("source","sourceUrl","lastCheckedAt","sourceUpdatedAt","importedAt","periodStart","periodEnd"))
   result.put(key,dataset.path(key).asText());
  result.put("stale",LocalDate.parse(dataset.path("sourceUpdatedAt").asText()).isBefore(LocalDate.now(ZoneId.of("America/Sao_Paulo")).minusDays(45)));
  result.put("meaning","Solicitações registradas no SP156; não são vistoria do pavimento nem número de buracos existentes. Finalizada indica encerramento do protocolo, não confirmação de via em boas condições.");
  return result;
 }
}
