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
@RestController @Profile("prototype") @RequestMapping("/api/v1/access")
public class AccessController {
 private final JsonNode dataset;

 public AccessController(ObjectMapper mapper) {
  JsonNode loaded;
  try(var input=new ClassPathResource("data/sp156-access.json").getInputStream()) {loaded=mapper.readTree(input);}
  catch(Exception e) {loaded=null;}
  dataset=loaded;
 }

 public static List<Map<String,Object>> nearby(JsonNode records,double latitude,double longitude) {
  List<Map<String,Object>> found=new ArrayList<>();
  for(var record:records) {
   double distance=PoliceSafetyController.distance(latitude,longitude,record.path("latitude").asDouble(),record.path("longitude").asDouble());
   if(distance>1000)continue;
   Map<String,Object> item=new LinkedHashMap<>();
   for(String key:List.of("openedAt","finishedAt","street","number","service","category","status"))
    item.put(key,record.path(key).isNull()?null:record.path(key).asText());
   item.put("distanceMeters",Math.round(distance));
   found.add(item);
  }
  found.sort(Comparator.comparing((Map<String,Object> item)->(String)item.get("openedAt"),Comparator.reverseOrder())
    .thenComparingLong(item->(Long)item.get("distanceMeters")));
  return found;
 }

 @GetMapping("/requests") public Map<String,Object> local(@RequestParam double latitude,@RequestParam double longitude) {
  if(!Double.isFinite(latitude)||!Double.isFinite(longitude)||latitude< -24.1||latitude> -23.3||longitude< -46.9||longitude> -46.3)
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Fora da área piloto.");
  if(dataset==null)return Map.of("status","UNAVAILABLE","message","Base SP156 de acesso não carregada.");
  var found=nearby(dataset.path("records"),latitude,longitude);
  Map<String,Integer> statuses=new LinkedHashMap<>(),categories=new LinkedHashMap<>();
  for(var item:found) {
   statuses.merge((String)item.get("status"),1,Integer::sum);
   categories.merge((String)item.get("category"),1,Integer::sum);
  }
  Map<String,Object> result=new LinkedHashMap<>();
  result.put("status","AVAILABLE");result.put("radiusMeters",1000);
  result.put("totalRequests",found.size());result.put("statuses",statuses);result.put("categories",categories);
  var display=PavementController.groupForDisplay(found);
  result.put("items",display.subList(0,Math.min(8,display.size())));
  for(String key:List.of("source","sourceUrl","sourceUpdatedAt","importedAt","periodStart","periodEnd"))
   result.put(key,dataset.path(key).asText());
  result.put("stale",LocalDate.parse(dataset.path("sourceUpdatedAt").asText()).isBefore(LocalDate.now(ZoneId.of("America/Sao_Paulo")).minusDays(45)));
  result.put("meaning","Solicitações do SP156 sobre circulação/acesso, alagamento, queda ou risco de queda de árvore/galho e reparos estruturais. Pedido aberto não confirma impedimento atual; finalizado indica encerramento do protocolo, não necessariamente a condição da via.");
  return result;
 }
}
