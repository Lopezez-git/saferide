package br.com.saferide;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:votes;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE","saferide.news.enabled=false"})
@AutoConfigureMockMvc
@ActiveProfiles("prototype")
class ReportParticipationTest {
    @Autowired MockMvc http;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper mapper;
    static final String API = "/api/v1";

    private JsonNode register() throws Exception {
        var payload = Map.of("email", UUID.randomUUID() + "@example.org","name","Participante","password","Pass-12345");
        var response = http.perform(post(API+"/auth/register").contentType("application/json")
                .content(mapper.writeValueAsBytes(payload))).andExpect(status().isOk()).andReturn().getResponse();
        return mapper.readTree(response.getContentAsByteArray());
    }

    @Test void newsDatesKeepTheirPublicFieldNames() throws Exception {
        var now = Instant.now();
        db.update("INSERT INTO sr_news(id,title,url,source,published_at,collected_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),
                "Alagamento em São Paulo","https://example.org/noticia","Fonte de teste",now.toString(),Timestamp.from(now));
        http.perform(get(API+"/news")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].publishedAt").value(now.toString()))
                .andExpect(jsonPath("$.items[0].collectedAt").isString());
    }

    @Test void confirmationsArePersonalIdempotentAndSubjectToModeration() throws Exception {
        var author = register();
        String authorToken = "Bearer " + author.get("token").asText();
        String voter = "Bearer " + register().get("token").asText();
        String other = "Bearer " + register().get("token").asText();
        String id = UUID.randomUUID().toString();
        var now = Instant.now();
        db.update("""
                INSERT INTO sr_report(id,author_id,title,body,category,latitude,longitude,observed_at,created_at)
                VALUES(?,?,'Via em obras','Observei a obra','OBRA',-23.55,-46.65,?,?)
                """, id, author.at("/user/id").asText(), Timestamp.from(now), Timestamp.from(now));
        String url = API+"/reports/"+id+"/confirmation";
        http.perform(put(url)).andExpect(status().isUnauthorized());
        http.perform(put(url).header("Authorization", voter)).andExpect(status().isNotFound());
        db.update("UPDATE sr_report SET status='PUBLISHED', reviewed_at=?,valid_until=? WHERE id=?",
                Timestamp.from(now), Timestamp.from(now.plusSeconds(3600)),id);
        http.perform(put(url).header("Authorization", authorToken)).andExpect(status().isForbidden());
        for (String who : new String[]{voter,voter,other}) {
            http.perform(put(url).header("Authorization", who)).andExpect(status().isNoContent());
        }
        http.perform(get(API+"/reports").header("Authorization", voter)).andExpect(jsonPath("$[0].confirmedByMe").value(true))
                .andExpect(jsonPath("$[0].confirmations").value(2)).andExpect(jsonPath("$[0].authorPoints").value(3));
        http.perform(get(API+"/reports")).andExpect(jsonPath("$[0].canConfirm").value(false));
        http.perform(get(API+"/reports").header("Authorization", authorToken)).andExpect(jsonPath("$[0].canConfirm").value(false));
        for (int i=0;i<2;i++) http.perform(delete(url).header("Authorization", voter)).andExpect(status().isNoContent());
        http.perform(get(API+"/me/reputation").header("Authorization", authorToken))
                .andExpect(jsonPath("$.points").value(2)).andExpect(jsonPath("$.confirmationsReceived").value(1));
        db.update("UPDATE sr_report SET valid_until=? WHERE id=?", Timestamp.from(now.minusSeconds(1)),id);
        http.perform(put(url).header("Authorization", voter)).andExpect(status().isNotFound());
        http.perform(get(API+"/reports")).andExpect(jsonPath("$.length()").value(0));
        db.update("UPDATE sr_report SET status='WITHDRAWN' WHERE id=?",id);
        http.perform(get(API+"/me/reputation").header("Authorization", authorToken)).andExpect(jsonPath("$.points").value(0));
    }
}
