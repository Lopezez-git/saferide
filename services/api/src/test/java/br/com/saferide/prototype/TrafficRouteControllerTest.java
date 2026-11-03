package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TrafficRouteControllerTest {
 @Test void classifiesDelayRelativeToTheWholeJourney() {
  assertThat(TrafficRouteController.classify(1200,0)).isEqualTo("LEVE");
  assertThat(TrafficRouteController.classify(1200,120)).isEqualTo("MODERADO");
  assertThat(TrafficRouteController.classify(1200,300)).isEqualTo("CONGESTIONADO");
 }

 @Test void refusesToClassifyIncompleteProviderData() throws Exception {
  var mapper=new ObjectMapper();
  var summary=mapper.readTree("{\"travelTimeInSeconds\":1200,\"trafficDelayInSeconds\":300}");
  var result=TrafficRouteController.fromSummary(summary,Instant.parse("2026-11-02T12:00:00Z"));
  assertThat(result.condition()).isEqualTo("CONGESTIONADO");
  assertThat(result.delaySeconds()).isEqualTo(300);
  assertThatThrownBy(()->TrafficRouteController.fromSummary(mapper.readTree("{\"travelTimeInSeconds\":1200}"),Instant.now()))
    .isInstanceOf(java.io.IOException.class);
 }

 @Test void reportsUnavailableWhenPersonalProviderKeyIsMissing() throws Exception {
  var mvc=MockMvcBuilders.standaloneSetup(new TrafficRouteController(new ObjectMapper(),"")).build();
  mvc.perform(post("/api/v1/traffic/route").contentType(MediaType.APPLICATION_JSON)
    .content("{\"fromLat\":-23.6234,\"fromLon\":-46.6985,\"toLat\":-23.5614,\"toLon\":-46.6559}"))
    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UNAVAILABLE"));
 }
}
