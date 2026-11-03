package br.com.saferide;
import br.com.saferide.prototype.PoliceSafetyController;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class PoliceSafetyTest {
 @Test void countsOnlyInsideTheSelectedRadius() throws Exception {
  var cells=new ObjectMapper().readTree("[{\"latitude\":-23.6234,\"longitude\":-46.6985,\"category\":\"Roubo\",\"count\":2},{\"latitude\":-23.6235,\"longitude\":-46.6985,\"category\":\"Furto\",\"count\":3},{\"latitude\":-23.55,\"longitude\":-46.63,\"category\":\"Roubo\",\"count\":100}]");
  assertThat(PoliceSafetyController.countsWithin(cells,-23.6234,-46.6985)).containsEntry("Roubo",2).containsEntry("Furto",3).hasSize(2);
  assertThat(PoliceSafetyController.countsWithin(cells,-23.9,-46.8)).isEmpty();
 }
 @Test void browserCanReadThePoliceEndpoint() throws Exception {
  var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new PoliceSafetyController(new ObjectMapper())).build();
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/safety/police").param("latitude","-23.6234167").param("longitude","-46.6985436").header("Origin","http://localhost:8081"))
    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Access-Control-Allow-Origin","http://localhost:8081"))
    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.status").value("AVAILABLE"));
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/safety/police").param("latitude","NaN").param("longitude","-46.69")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
 }
 @Test void geographicDistanceIsInMeters(){assertThat(PoliceSafetyController.distance(0,0,0,0.01)).isBetween(1110.0,1113.0);}
 @Test void timeBreakdownDoesNotTreatMissingHourAsCurrentHour() throws Exception {
  var cells=new ObjectMapper().readTree("[{\"latitude\":-23.62,\"longitude\":-46.69,\"category\":\"Furto\",\"timeWindow\":\"06-12\",\"count\":2},{\"latitude\":-23.62,\"longitude\":-46.69,\"category\":\"Roubo\",\"timeWindow\":\"UNKNOWN\",\"count\":3}]");
  var breakdown=PoliceSafetyController.timeBreakdown(cells,-23.62,-46.69);
  assertThat(breakdown).containsEntry("unknownTimeTotal",3);
  @SuppressWarnings("unchecked") var windows=(java.util.Map<String,java.util.Map<String,Integer>>)breakdown.get("windows");
  assertThat(windows).containsKey("06-12");
  assertThat(windows.get("06-12")).containsEntry("Furto",2);
 }
}
