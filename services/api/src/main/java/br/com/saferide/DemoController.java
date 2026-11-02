package br.com.saferide;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Read-only synthetic examples. Not the authenticated product API. */
@RestController
@Profile("demo & !mysql")
@RequestMapping("/api/v1/demo")
public class DemoController {
 private final JdbcTemplate jdbc;
 public DemoController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
 public record Occurrence(long id, String title, String description, String category,
  double latitude, double longitude, String precision, String occurredAt, String source) {}
 public record Post(long id, String author, String category, String body, String createdAt, long comments) {}
 public record DemoData<T>(boolean demo, List<T> items) {}
 @GetMapping("/occurrences")
 public DemoData<Occurrence> occurrences() {
  return new DemoData<>(true, jdbc.query("""
   SELECT o.*, s.name AS source_name FROM occurrence o JOIN information_source s ON s.id=o.source_id
   WHERE o.status='PUBLISHED' AND o.demo=TRUE ORDER BY o.id
   """, (r,n) -> new Occurrence(r.getLong("id"),r.getString("title"),r.getString("description"),
   r.getString("category"),r.getDouble("latitude"),r.getDouble("longitude"),r.getString("precision_label"),
   r.getTimestamp("occurred_at").toLocalDateTime().toString(),r.getString("source_name"))));
 }
 @GetMapping("/posts")
 public DemoData<Post> posts() {
  return new DemoData<>(true, jdbc.query("""
   SELECT p.*, a.display_name,
   (SELECT COUNT(*) FROM community_comment c WHERE c.post_id=p.id AND c.status='PUBLISHED') AS comments
   FROM community_post p JOIN professional_profile a ON a.id=p.author_id
   WHERE p.status='PUBLISHED' AND p.demo=TRUE ORDER BY p.created_at DESC,p.id DESC
   """,(r,n)->new Post(r.getLong("id"),r.getString("display_name"),r.getString("category"),
    r.getString("body"),r.getTimestamp("created_at").toLocalDateTime().toString(),r.getLong("comments"))));
 }
 @GetMapping("/profile")
 public Map<String,Object> profile() {
  return jdbc.queryForObject("SELECT * FROM professional_profile WHERE id=1 AND demo=TRUE", (r,n)->Map.of(
   "demo",true,"name",r.getString("display_name"),"activity",r.getString("activity"),"vehicle",r.getString("vehicle"),
   "platforms",jdbc.queryForList("SELECT p.name FROM platform p JOIN profile_platform pp ON pp.platform_id=p.id WHERE pp.profile_id=1 ORDER BY p.id",String.class)));
 }
}
