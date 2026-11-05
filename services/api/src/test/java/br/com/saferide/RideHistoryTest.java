package br.com.saferide;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(classes=RideHistoryTest.Config.class,properties={"spring.datasource.url=jdbc:h2:mem:rides;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE","saferide.news.enabled=false"})
@AutoConfigureMockMvc @ActiveProfiles("prototype")
class RideHistoryTest {
 @org.springframework.context.annotation.Configuration
 @org.springframework.boot.autoconfigure.EnableAutoConfiguration
 @org.springframework.context.annotation.Import(br.com.saferide.prototype.RideHistoryController.class)
 static class Config {}

 @Autowired MockMvc http;@Autowired ObjectMapper json;
 Map<String,Object> data(String status,int distance){var data=new HashMap<String,Object>();data.put("passenger","Passageiro fictício");data.put("origin","Embarque");data.put("destination","Destino");data.put("originLat",-23.6);data.put("originLon",-46.7);data.put("destinationLat",-23.7);data.put("destinationLon",-46.6);data.put("fare",11.03);data.put("distanceMeters",distance);data.put("plannedDistanceMeters",1000);data.put("simulatedSeconds",120);data.put("activeSeconds",10);data.put("status",status);return data;}
 @Test void persistsIsolatesAndDoesNotDuplicateOrReopenTerminalRides() throws Exception {
  String token="Bearer "+UUID.randomUUID(),other="Bearer "+UUID.randomUUID(),id=UUID.randomUUID().toString();
  http.perform(put("/api/v1/rides/"+id).header("Authorization",token).contentType("application/json").content(json.writeValueAsString(data("IN_PROGRESS",300)))).andExpect(status().isOk());
  http.perform(get("/api/v1/rides").header("Authorization",other)).andExpect(jsonPath("$.length()").value(0));
  http.perform(put("/api/v1/rides/"+id).header("Authorization",other).contentType("application/json").content(json.writeValueAsString(data("COMPLETED",1000)))).andExpect(status().isNotFound());
  http.perform(put("/api/v1/rides/"+id).header("Authorization",token).contentType("application/json").content(json.writeValueAsString(data("COMPLETED",1000)))).andExpect(status().isOk()).andExpect(jsonPath("$.finishedAt").isNotEmpty());
  http.perform(put("/api/v1/rides/"+id).header("Authorization",token).contentType("application/json").content(json.writeValueAsString(data("IN_PROGRESS",300)))).andExpect(jsonPath("$.status").value("COMPLETED"));
  http.perform(get("/api/v1/rides").header("Authorization",token)).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].distanceMeters").value(1000)).andExpect(jsonPath("$[0].owner_key").doesNotExist());
 }
 @Test void validatesAndRequiresDeviceKey() throws Exception {
  http.perform(get("/api/v1/rides")).andExpect(status().isUnauthorized());
  http.perform(put("/api/v1/rides/"+UUID.randomUUID()).header("Authorization","Bearer "+UUID.randomUUID()).contentType("application/json").content(json.writeValueAsString(data("CANCELLED",-1)))).andExpect(status().isBadRequest());
 }
}
