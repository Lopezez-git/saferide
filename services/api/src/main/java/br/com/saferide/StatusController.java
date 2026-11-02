package br.com.saferide;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController
public class StatusController {
 private final JdbcTemplate jdbc;
 public StatusController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
 @GetMapping("/api/v1/status")
 public Map<String,String> status() {
  jdbc.queryForObject("SELECT 1", Integer.class);
  return Map.of("service", "saferide-api", "status", "UP", "database", "UP");
 }
}
