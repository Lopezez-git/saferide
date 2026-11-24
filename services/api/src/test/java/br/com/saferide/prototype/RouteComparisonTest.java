package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class RouteComparisonTest {
    final ObjectMapper json = new ObjectMapper();
    @TempDir Path directory;

    @Test void distanceUsesSegmentsAndIncludesTheirEnds() throws Exception {
        var line = new RouteComparison.Corridor(json.readTree("[[-46.66,-23.55],[-46.63,-23.55]]"));
        assertTrue(line.contains(-23.55 + 299.0/111320, -46.645));
        assertFalse(line.contains(-23.55 + 301.0/111320, -46.645));
        assertTrue(line.contains(-23.55, -46.63001));
        assertFalse(line.contains(-23.55, -46.62));
    }

    @Test void distinctAlternativesUseTheirOwnCorridorAndPreserveMissingSources() throws Exception {
        var source = directory.resolve("ssp.json");
        Files.writeString(source,"""
                {"periodEnd":"2026-09","cells":[{"latitude":-23.55,"longitude":-46.645,"count":4}]}
                """);
        var police = new PublicDataRefresh.Snapshot(json,"ssp-fixture.json",source);
        var pavement = new PublicDataRefresh.Snapshot(json,"absent.json",directory.resolve("missing"));
        var db = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";DB_CLOSE_DELAY=-1","sa",""));
        db.execute("CREATE TABLE sr_report(latitude DOUBLE, longitude DOUBLE, status VARCHAR, valid_until TIMESTAMP, title VARCHAR, body VARCHAR)");
        db.execute("INSERT INTO sr_report VALUES(-23.55,-46.645,'PUBLISHED',TIMESTAMP '2099-01-01 00:00:00','Obra','Tapume')");
        db.execute("INSERT INTO sr_report SELECT latitude,longitude,'PENDING',valid_until,title,body FROM sr_report");
        var routes = json.createArrayNode();
        for (String middle : new String[]{"[-46.645,-23.55]", "[-46.645,-23.55]", "[-46.645,-23.57]"}) {
            var route = routes.addObject().put("distance",4200).put("duration",600);
            route.putObject("geometry").set("coordinates",json.readTree("[[-46.66,-23.55],"+middle+",[-46.63,-23.55]]"));
        }
        var comparison = new RouteComparison(police,pavement,db).compare(routes);
        assertEquals(2,comparison.routes().size());
        assertEquals(4,comparison.routes().getFirst().policeRecords());
        assertEquals(1,comparison.routes().getFirst().activeReports());
        assertEquals(0,comparison.routes().getLast().policeRecords());
        assertEquals(0,comparison.routes().getLast().activeReports());
        assertNull(comparison.routes().getFirst().pavementRequests());
        assertEquals("2026-09",comparison.policePeriodEnd());
        assertNull(comparison.pavementPeriodEnd());
    }
}
