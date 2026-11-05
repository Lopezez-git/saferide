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
   for(String field:List.of("created_at","updated_at","finished_at")){Object value=row.get(field);out.put(field.replace("_at","At"),value==null?null:((Timestamp)value).toInstant().toString());}
   return out;
  }catch(Exception e){throw new IllegalStateException("Registro de corrida inválido",e);}
 }
 @GetMapping public List<Map<String,Object>> list(@RequestHeader(value="Authorization",required=false)String header){return db.queryForList("SELECT * FROM sr_simulated_ride WHERE owner_key=? ORDER BY created_at DESC,id DESC LIMIT 100",owner(header)).stream().map(this::result).toList();}
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
