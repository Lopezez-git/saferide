package br.com.saferide;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("demo")
class DemoApiTest {
 @Autowired MockMvc http;
 @Test void connectsToDatabaseAndExcludesUnreviewedOccurrences() throws Exception {
  http.perform(get("/api/v1/status")).andExpect(status().isOk()).andExpect(jsonPath("$.database").value("UP"));
  http.perform(get("/api/v1/demo/occurrences")).andExpect(status().isOk())
   .andExpect(jsonPath("$.demo").value(true)).andExpect(jsonPath("$.items.length()").value(2))
   .andExpect(jsonPath("$.items[0].id").value(1)).andExpect(jsonPath("$.items[1].id").value(2));
 }
 @Test void hidesModeratedPostsAndReturnsProfilePlatforms() throws Exception {
  http.perform(get("/api/v1/demo/posts")).andExpect(status().isOk())
   .andExpect(jsonPath("$.items.length()").value(2)).andExpect(jsonPath("$.items[0].id").value(2))
   .andExpect(jsonPath("$.items[0].comments").value(1));
  http.perform(get("/api/v1/demo/profile")).andExpect(status().isOk())
   .andExpect(jsonPath("$.platforms.length()").value(2));
 }
 @Test void demoDoesNotProvideUnauthenticatedWriteEndpoints() throws Exception {
  http.perform(post("/api/v1/demo/posts")).andExpect(status().isMethodNotAllowed());
 }
}
