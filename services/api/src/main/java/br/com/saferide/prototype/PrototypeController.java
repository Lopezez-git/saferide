package br.com.saferide.prototype;
import java.util.*;
import java.time.*;
import java.sql.Timestamp;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@RestController @Profile("prototype")
@CrossOrigin(origins={"http://localhost:8081","http://127.0.0.1:8081"})
@RequestMapping("/api/v1")
public class PrototypeController {
 private final JdbcTemplate db;private final AuthService auth;
 public PrototypeController(JdbcTemplate db,AuthService auth){this.db=db;this.auth=auth;}
 public record Register(@Email @NotBlank @Size(max=200) String email,@NotBlank @Size(min=8,max=72) String password,@NotBlank @Size(max=80) String name){}
 public record Credentials(@Email @NotBlank @Size(max=200) String email,@NotBlank @Size(max=72) String password){}
 public record EditProfile(@NotBlank @Size(max=80) String name,@NotBlank @Size(max=60) String activity,@NotBlank @Size(max=40) String vehicle,@NotEmpty @Size(max=6) List<String> platforms){}
 public record Publish(@NotBlank @Size(max=2000) String body,@Pattern(regexp="DICA|DUVIDA|CONVERSA|EXPERIENCIA") @NotNull String category){}
 public record Comment(@NotBlank @Size(max=1000) String body){}
 public record Report(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=1000) String body,@NotNull @Pattern(regexp="OBRA|PAVIMENTO|ALAGAMENTO|ACESSO|SEGURANCA") String category,@NotNull @DecimalMin("-24.1") @DecimalMax("-23.3") Double latitude,@NotNull @DecimalMin("-46.9") @DecimalMax("-46.3") Double longitude,@NotNull @PastOrPresent Instant observedAt){}
 public record Review(@NotNull @Pattern(regexp="PUBLISHED|REJECTED|WITHDRAWN") String status,@NotBlank @Size(max=300) String reason){}
 private Timestamp now(){return Timestamp.from(Instant.now());}
 private void missing(){throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Registro não encontrado.");}
 @PostMapping("/auth/register") public AuthService.Login register(@Valid @RequestBody Register r){return auth.register(r.email(),r.password(),r.name());}
 @PostMapping("/auth/login") public AuthService.Login login(@Valid @RequestBody Credentials r){return auth.login(r.email(),r.password());}
 @PostMapping("/auth/logout") public Map<String,Boolean> logout(@RequestHeader(value="Authorization",required=false)String h){auth.logout(h);return Map.of("ok",true);}
 @GetMapping("/me") public AuthService.User me(@RequestHeader(value="Authorization",required=false)String h){return auth.require(h);}
 @PutMapping("/me") public AuthService.User profile(@RequestHeader(value="Authorization",required=false)String h,@Valid @RequestBody EditProfile p){var u=auth.require(h);var choices=Set.of("uber","99","ifood","rappi","outra","independente");if(!choices.containsAll(p.platforms()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Plataforma inválida.");db.update("UPDATE sr_account SET name=?,activity=?,vehicle=?,platforms=? WHERE id=?",p.name().trim(),p.activity().trim(),p.vehicle().trim(),String.join(",",new LinkedHashSet<>(p.platforms())),u.id());return auth.user(u.id());}
 @GetMapping("/posts") public List<Map<String,Object>> posts(){return db.queryForList("""
 SELECT p.id,p.author_id AS authorId,a.name AS author,a.platforms,p.category,p.body,p.created_at AS createdAt,
 (SELECT COUNT(*) FROM sr_comment c WHERE c.post_id=p.id AND c.status='PUBLISHED') AS comments
 FROM sr_post p JOIN sr_account a ON a.id=p.author_id WHERE p.status='PUBLISHED' ORDER BY p.created_at DESC,p.id DESC LIMIT 100
 """);}
 @PostMapping("/posts") public Map<String,String> publish(@RequestHeader(value="Authorization",required=false)String h,@Valid @RequestBody Publish p){var u=auth.require(h);String id=UUID.randomUUID().toString();db.update("INSERT INTO sr_post(id,author_id,category,body,created_at) VALUES(?,?,?,?,?)",id,u.id(),p.category(),p.body().trim(),now());return Map.of("id",id);}
 @DeleteMapping("/posts/{id}") public Map<String,Boolean> deletePost(@RequestHeader(value="Authorization",required=false)String h,@PathVariable String id){var u=auth.require(h);int n=db.update("UPDATE sr_post SET status='DELETED' WHERE id=? AND author_id=? AND status='PUBLISHED'",id,u.id());if(n==0)missing();return Map.of("ok",true);}
 private void publishedPost(String id){if(db.queryForObject("SELECT COUNT(*) FROM sr_post WHERE id=? AND status='PUBLISHED'",Integer.class,id)==0)missing();}
 @GetMapping("/posts/{id}/comments") public List<Map<String,Object>> comments(@PathVariable String id){publishedPost(id);return db.queryForList("SELECT c.id,c.author_id AS authorId,a.name AS author,c.body,c.created_at AS createdAt FROM sr_comment c JOIN sr_account a ON a.id=c.author_id WHERE c.post_id=? AND c.status='PUBLISHED' ORDER BY c.created_at,c.id LIMIT 100",id);}
 @PostMapping("/posts/{id}/comments") public Map<String,String> comment(@RequestHeader(value="Authorization",required=false)String h,@PathVariable String id,@Valid @RequestBody Comment c){var u=auth.require(h);publishedPost(id);String key=UUID.randomUUID().toString();db.update("INSERT INTO sr_comment(id,post_id,author_id,body,created_at) VALUES(?,?,?,?,?)",key,id,u.id(),c.body().trim(),now());return Map.of("id",key);}
 @DeleteMapping("/comments/{id}") public Map<String,Boolean> deleteComment(@RequestHeader(value="Authorization",required=false)String h,@PathVariable String id){var u=auth.require(h);if(db.update("UPDATE sr_comment SET status='DELETED' WHERE id=? AND author_id=?",id,u.id())==0)missing();return Map.of("ok",true);}
 @GetMapping("/reports") public List<Map<String,Object>> reports(){return db.queryForList("SELECT id,title,body,category,latitude,longitude,observed_at AS observedAt,reviewed_at AS reviewedAt,valid_until AS validUntil,'Relato comunitário revisado' AS source FROM sr_report WHERE status='PUBLISHED' AND valid_until>? ORDER BY observed_at DESC LIMIT 100",now());}
 @GetMapping("/reports/mine") public List<Map<String,Object>> mine(@RequestHeader(value="Authorization",required=false)String h){var u=auth.require(h);return db.queryForList("SELECT id,title,status,category,observed_at AS observedAt FROM sr_report WHERE author_id=? ORDER BY created_at DESC LIMIT 100",u.id());}
 @PostMapping("/reports") public Map<String,String> report(@RequestHeader(value="Authorization",required=false)String h,@Valid @RequestBody Report r){var u=auth.require(h);String id=UUID.randomUUID().toString();db.update("INSERT INTO sr_report(id,author_id,title,body,category,latitude,longitude,observed_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)",id,u.id(),r.title().trim(),r.body().trim(),r.category(),r.latitude(),r.longitude(),Timestamp.from(r.observedAt()),now());return Map.of("id",id,"status","PENDING");}
 @GetMapping("/moderation/reports") public List<Map<String,Object>> pending(@RequestHeader(value="Authorization",required=false)String h){auth.moderator(h);return db.queryForList("SELECT id,title,body,category,latitude,longitude,observed_at AS observedAt,status FROM sr_report WHERE status IN ('PENDING','PUBLISHED') ORDER BY created_at DESC LIMIT 100");}
 @PostMapping("/moderation/reports/{id}") @Transactional public Map<String,Boolean> review(@RequestHeader(value="Authorization",required=false)String h,@PathVariable String id,@Valid @RequestBody Review r){var u=auth.moderator(h);var rows=db.queryForList("SELECT observed_at,category FROM sr_report WHERE id=?",id);if(rows.isEmpty())missing();var row=rows.getFirst();Instant observed=((Timestamp)row.get("observed_at")).toInstant();long hours=row.get("category").equals("ALAGAMENTO")?6:24;Instant until=observed.plus(Duration.ofHours(hours));if(r.status().equals("PUBLISHED")&&until.isBefore(Instant.now()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Registro antigo para destaque. Solicite uma nova observação.");db.update("UPDATE sr_report SET status=?,reviewed_at=?,valid_until=? WHERE id=?",r.status(),now(),Timestamp.from(until),id);db.update("INSERT INTO sr_moderation VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),u.id(),id,r.status(),r.reason().trim(),now());return Map.of("ok",true);}
}
