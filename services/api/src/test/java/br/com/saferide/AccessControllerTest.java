package br.com.saferide;

import br.com.saferide.prototype.AccessController;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccessControllerTest {
 @Test void restrictsRequestsToOneKilometer() throws Exception {
  var records=new ObjectMapper().readTree("[{\"latitude\":-23.6234,\"longitude\":-46.6985,\"openedAt\":\"2026-09-30\",\"category\":\"ACESSO\",\"status\":\"Aberto\"},{\"latitude\":-23.55,\"longitude\":-46.63,\"openedAt\":\"2026-09-30\",\"category\":\"ALAGAMENTO\",\"status\":\"Finalizada\"}]");
  var nearby=AccessController.nearby(records,-23.6234,-46.6985);
  assertThat(nearby).hasSize(1);
  assertThat(nearby.getFirst()).containsEntry("category","ACESSO");
 }

 @Test void exposesSourceAndPublishedStatusInsteadOfLiveClosure() throws Exception {
  var mvc=MockMvcBuilders.standaloneSetup(new AccessController(new ObjectMapper())).build();
  mvc.perform(get("/api/v1/access/requests").param("latitude","-23.6234167").param("longitude","-46.6985436"))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.status").value("AVAILABLE"))
    .andExpect(jsonPath("$.totalRequests").isNumber())
    .andExpect(jsonPath("$.sourceUpdatedAt").value("2026-10-13"));
 }
}
