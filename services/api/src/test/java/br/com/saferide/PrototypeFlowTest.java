package br.com.saferide;
import java.util.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:functional;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE","saferide.news.enabled=false"})
@AutoConfigureMockMvc @ActiveProfiles("prototype")
class PrototypeFlowTest {
 @Autowired MockMvc http;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;
 JsonNode register() throws Exception {String email=UUID.randomUUID()+"@example.com";return json.readTree(http.perform(post("/api/v1/auth/register").contentType("application/json").content(json.writeValueAsString(Map.of("email",email,"password","TestOnly123!","name","Pessoa teste")))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());}
 String bearer(JsonNode r){return "Bearer "+r.get("token").asText();}
 @Test void accountProfilePostsCommentsOwnershipAndLogout() throws Exception {
  var a=register();var b=register();String auth=bearer(a);
  http.perform(put("/api/v1/me").header("Authorization",auth).contentType("application/json").content("{\"name\":\"Alex\",\"activity\":\"Entregas\",\"vehicle\":\"Moto\",\"platforms\":[\"uber\",\"ifood\"]}")).andExpect(status().isOk()).andExpect(jsonPath("$.platforms.length()").value(2));
  http.perform(post("/api/v1/posts").contentType("application/json").content("{\"body\":\"Olá\",\"category\":\"DICA\"}")).andExpect(status().isUnauthorized());
  String id=json.readTree(http.perform(post("/api/v1/posts").header("Authorization",auth).contentType("application/json").content("{\"body\":\"Olá\",\"category\":\"DICA\"}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("id").asText();
  http.perform(delete("/api/v1/posts/"+id).header("Authorization",bearer(b))).andExpect(status().isNotFound());
  http.perform(post("/api/v1/posts/"+id+"/comments").header("Authorization",bearer(b)).contentType("application/json").content("{\"body\":\"Boa dica\"}")).andExpect(status().isOk());
  http.perform(get("/api/v1/posts/"+id+"/comments")).andExpect(jsonPath("$[0].body").value("Boa dica"));
  http.perform(delete("/api/v1/posts/"+id).header("Authorization",auth)).andExpect(status().isOk());
  http.perform(get("/api/v1/posts/"+id+"/comments")).andExpect(status().isNotFound());
  http.perform(post("/api/v1/auth/logout").header("Authorization",auth)).andExpect(status().isOk());
  http.perform(get("/api/v1/me").header("Authorization",auth)).andExpect(status().isUnauthorized());
 }
 @Test void reportNeedsModeratorAndExpires() throws Exception {
  var a=register();String auth=bearer(a);String content=json.writeValueAsString(Map.of("title","Obra teste","body","Registro acadêmico","category","OBRA","latitude",-23.55,"longitude",-46.63,"observedAt",Instant.now().toString()));
  String id=json.readTree(http.perform(post("/api/v1/reports").header("Authorization",auth).contentType("application/json").content(content)).andExpect(jsonPath("$.status").value("PENDING")).andReturn().getResponse().getContentAsString()).get("id").asText();
  http.perform(get("/api/v1/reports")).andExpect(jsonPath("$.length()").value(0));
  http.perform(post("/api/v1/moderation/reports/"+id).header("Authorization",auth).contentType("application/json").content("{\"status\":\"PUBLISHED\",\"reason\":\"Teste\"}")).andExpect(status().isForbidden());
  db.update("UPDATE sr_account SET role='MODERATOR' WHERE id=?",a.get("user").get("id").asText());
  http.perform(post("/api/v1/moderation/reports/"+id).header("Authorization",auth).contentType("application/json").content("{\"status\":\"PUBLISHED\",\"reason\":\"Teste\"}")).andExpect(status().isOk());
  http.perform(get("/api/v1/reports")).andExpect(jsonPath("$[0].id").value(id));
  db.update("UPDATE sr_report SET valid_until=? WHERE id=?",java.sql.Timestamp.from(Instant.now().minusSeconds(1)),id);
  http.perform(get("/api/v1/reports")).andExpect(jsonPath("$.length()").value(0));
 }
 @Test void rejectsInvalidInputAndDoesNotExposePrivateFields() throws Exception {
  http.perform(post("/api/v1/auth/register").contentType("application/json").content("{\"email\":\"invalid\",\"password\":\"123\",\"name\":\"\"}")).andExpect(status().isBadRequest());
  var a=register();http.perform(get("/api/v1/me").header("Authorization",bearer(a))).andExpect(status().isOk()).andExpect(jsonPath("$.password_hash").doesNotExist());
  http.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("email",a.get("user").get("email").asText(),"password","wrong")))).andExpect(status().isUnauthorized());
 }
}
