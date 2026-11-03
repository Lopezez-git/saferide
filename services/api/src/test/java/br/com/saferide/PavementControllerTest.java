package br.com.saferide;

import br.com.saferide.prototype.PavementController;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PavementControllerTest {
 @Test void includesOnlyRequestsWithinOneKilometer() throws Exception {
  var records=new ObjectMapper().readTree("[{\"latitude\":-23.6234,\"longitude\":-46.6985,\"openedAt\":\"2026-09-30\",\"status\":\"Aberto\"},{\"latitude\":-23.55,\"longitude\":-46.63,\"openedAt\":\"2026-09-30\",\"status\":\"Finalizada\"}]");
  var nearby=PavementController.nearby(records,-23.6234,-46.6985);
  assertThat(nearby).hasSize(1);
  assertThat(nearby.getFirst()).containsEntry("status","Aberto");
 }
 @Test void groupsEqualDisplayRowsWithoutChangingRequestCount() {
  java.util.Map<String,Object> request=new java.util.LinkedHashMap<>();
  request.put("openedAt","2026-09-30");request.put("street","Rua Exemplo");request.put("status","Aberto");
  var grouped=PavementController.groupForDisplay(java.util.List.of(request,request));
  assertThat(grouped).hasSize(1);
  assertThat(grouped.getFirst()).containsEntry("sameDetailsCount",2);
 }
 @Test void exposesPublishedRequestsWithoutCallingThemVerifiedHoles() throws Exception {
  var mvc=MockMvcBuilders.standaloneSetup(new PavementController(new ObjectMapper())).build();
  mvc.perform(get("/api/v1/pavement/requests").param("latitude","-23.6234167").param("longitude","-46.6985436"))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.status").value("AVAILABLE"))
    .andExpect(jsonPath("$.totalRequests").isNumber())
    .andExpect(jsonPath("$.sourceUpdatedAt").value("2026-10-13"));
 }
}
