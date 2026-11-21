package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.math.BigDecimal;

@RestController @Profile("prototype") @RequestMapping("/api/v1/rides")
@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
public class RideHistoryController {
 private final JdbcTemplate db; private final ObjectMapper json;
 public RideHistoryController(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}
 public record Snapshot(
  @NotBlank @Size(max=80) String passenger,
  @NotBlank @Size(max=200) String origin,
  @NotBlank @Size(max=200) String destination,
  @NotNull @DecimalMin("-90") @DecimalMax("90") Double originLat,
  @NotNull @DecimalMin("-180") @DecimalMax("180") Double originLon,
  @NotNull @DecimalMin("-90") @DecimalMax("90") Double destinationLat,
  @NotNull @DecimalMin("-180") @DecimalMax("180") Double destinationLon,
  @NotNull @DecimalMin("0") @DecimalMax("10000") BigDecimal fare,
  @NotNull @Min(0) @Max(1000000) Integer distanceMeters,
  @NotNull @Min(0) @Max(1000000) Integer plannedDistanceMeters,
  @NotNull @Min(0) @Max(86400) Integer simulatedSeconds,
  @NotNull @Min(0) @Max(86400) Integer activeSeconds,
  @NotNull @Pattern(regexp="IN_PROGRESS|COMPLETED|CANCELLED") String status) {}
 private String uuid(String raw){try{if(raw==null||!UUID.fromString(raw).toString().equals(raw))throw new Exception();return raw;}catch(Exception e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Identificador inválido.");}}
 private String owner(String header){return uuid(header!=null&&header.startsWith("Bearer ")?header.substring(7):null);}
 @PostMapping("/key") public Map<String,String> key(){return Map.of("key",UUID.randomUUID().toString());}
 private Map<String,Object> result(Map<String,Object> row){
  try {
   Map<String,Object> out=json.readValue(row.get("payload").toString(),new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
   out.put("id",row.get("id"));out.put("simulated",true);
   var feedback=db.queryForList("SELECT category FROM sr_ride_feedback WHERE ride_id=?",row.get("id"));
   if(!feedback.isEmpty())out.put("feedback",feedback.stream().map(f->f.get("category")).toList());
   for(String field:List.of("created_at","updated_at","finished_at")){Object value=row.get(field);out.put(field.replace("_at","At"),value==null?null:((Timestamp)value).toInstant().toString());}
   return out;
  }catch(Exception e){throw new IllegalStateException("Registro de corrida inválido",e);}
 }
 @GetMapping public List<Map<String,Object>> list(@RequestHeader(value="Authorization",required=false)String header){return db.queryForList("SELECT * FROM sr_simulated_ride WHERE owner_key=? ORDER BY created_at DESC,id DESC LIMIT 100",owner(header)).stream().map(this::result).toList();}
 public record Feedback(@NotEmpty @Size(max=6) List<@NotBlank @Pattern(regexp="POTHOLE|BAD_ROAD|FLOOD|ROBBERY|INSECURE|ACCESS|NONE") String> categories) {}
 @PutMapping("/{id}/feedback") @Transactional public Map<String,Object> feedback(@RequestHeader(value="Authorization",required=false) String header,@PathVariable String id,@Valid @RequestBody Feedback feedback) {
  String key=owner(header); uuid(id);
  var rides=db.queryForList("SELECT id,status FROM sr_simulated_ride WHERE id=? AND owner_key=? FOR UPDATE",id,key);
  if(rides.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  if(!"COMPLETED".equals(rides.get(0).get("status")))throw new ResponseStatusException(HttpStatus.CONFLICT,"Feedback disponível após concluir a corrida.");
  Set<String> selected=new LinkedHashSet<>(feedback.categories());
  if(selected.size()!=feedback.categories().size() || (selected.contains("NONE") && selected.size()>1)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Seleção inválida.");
  var existing=db.queryForList("SELECT category FROM sr_ride_feedback WHERE ride_id=?",id).stream().map(row->row.get("category").toString()).collect(java.util.stream.Collectors.toSet());
  if(existing.isEmpty()) { var time=Timestamp.from(Instant.now());for(String category:selected)db.update("INSERT INTO sr_ride_feedback(ride_id,category,created_at) VALUES(?,?,?)",id,category,time); }
  else if(!selected.equals(existing)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Feedback já registrado.");
  return Map.of("categories",selected,"simulated",true);
 }
 @GetMapping("/community-feedback") public List<Map<String,Object>> communityFeedback(@RequestParam(required=false) Double originLat,@RequestParam(required=false) Double originLon,@RequestParam(required=false) Double destinationLat,@RequestParam(required=false) Double destinationLon) {
  boolean filter=originLat!=null || originLon!=null || destinationLat!=null || destinationLon!=null;
  if(filter && (originLat==null || originLon==null || destinationLat==null || destinationLon==null || !Double.isFinite(originLat) || !Double.isFinite(originLon) || !Double.isFinite(destinationLat) || !Double.isFinite(destinationLon) || Math.abs(originLat)>90 || Math.abs(destinationLat)>90 || Math.abs(originLon)>180 || Math.abs(destinationLon)>180)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Coordenadas inválidas.");
  return db.queryForList("SELECT r.payload,f.category,f.created_at FROM sr_ride_feedback f JOIN sr_simulated_ride r ON r.id=f.ride_id WHERE f.category <> 'NONE' AND r.status='COMPLETED' ORDER BY f.created_at DESC LIMIT 100").stream().map(row->{
   try { var ride=json.readTree(row.get("payload").toString()); if(filter && (distanceKm(originLat,originLon,ride.path("originLat").asDouble(),ride.path("originLon").asDouble())>1 || distanceKm(destinationLat,destinationLon,ride.path("destinationLat").asDouble(),ride.path("destinationLon").asDouble())>1))return null; Map<String,Object> out=new HashMap<>(); out.put("origin",ride.path("origin").asText()); out.put("destination",ride.path("destination").asText()); out.put("category",row.get("category"));out.put("createdAt",((Timestamp)row.get("created_at")).toInstant().toString());out.put("simulated",true);return out; } catch(Exception e){throw new IllegalStateException("Feedback inválido",e);}
  }).filter(Objects::nonNull).toList();
 }
 private static double distanceKm(double a,double b,double c,double d){double lat=Math.toRadians(c-a),lon=Math.toRadians(d-b);double h=Math.pow(Math.sin(lat/2),2)+Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(c))*Math.pow(Math.sin(lon/2),2);return 12742*Math.asin(Math.min(1,Math.sqrt(h)));}
 @PutMapping("/{id}") @Transactional public Map<String,Object> save(@RequestHeader(value="Authorization",required=false)String header,@PathVariable String id,@Valid @RequestBody Snapshot snapshot) throws Exception {
  String key=owner(header);uuid(id);
  if(snapshot.distanceMeters()>snapshot.plannedDistanceMeters())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Distância inválida.");
  var rows=db.queryForList("SELECT * FROM sr_simulated_ride WHERE id=? FOR UPDATE",id);
  var now=Timestamp.from(Instant.now());
  if(rows.isEmpty())db.update("INSERT INTO sr_simulated_ride(id,owner_key,status,payload,created_at,updated_at,finished_at) VALUES(?,?,?,?,?,?,?)",id,key,snapshot.status(),json.writeValueAsString(snapshot),now,now,snapshot.status().equals("IN_PROGRESS")?null:now);
  else {
   var row=rows.get(0);
   if(!key.equals(row.get("owner_key")))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
   if(!"IN_PROGRESS".equals(row.get("status")))return result(row);
   var previous=json.readTree(row.get("payload").toString());
   if(snapshot.distanceMeters()<previous.path("distanceMeters").asInt()||snapshot.activeSeconds()<previous.path("activeSeconds").asInt())return result(row);
   db.update("UPDATE sr_simulated_ride SET status=?,payload=?,updated_at=?,finished_at=? WHERE id=?",snapshot.status(),json.writeValueAsString(snapshot),now,snapshot.status().equals("IN_PROGRESS")?null:now,id);
  }
  return result(db.queryForMap("SELECT * FROM sr_simulated_ride WHERE id=?",id));
 }
}
