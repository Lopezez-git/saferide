package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("prototype")
class TerritorialData {
    @Bean
    PublicDataRefresh.Snapshot policeData(ObjectMapper mapper) {
        return new PublicDataRefresh.Snapshot(mapper, "ssp-vehicles.json");
    }

    @Bean
    PublicDataRefresh.Snapshot pavementData(ObjectMapper mapper) {
        return new PublicDataRefresh.Snapshot(mapper, "sp156-pavement.json");
    }
}
