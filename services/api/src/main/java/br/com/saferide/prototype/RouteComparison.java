package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.awt.geom.Line2D;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Profile("prototype")
public class RouteComparison {
    static final int RADIUS_METERS = 300;
    private final PublicDataRefresh.Snapshot police;
    private final PublicDataRefresh.Snapshot pavement;
    private final JdbcTemplate db;

    RouteComparison(@Qualifier("policeData") PublicDataRefresh.Snapshot police,
                    @Qualifier("pavementData") PublicDataRefresh.Snapshot pavement, JdbcTemplate db) {
        this.police = police;
        this.pavement = pavement;
        this.db = db;
    }

    record Point(double latitude, double longitude) {}
    record Option(double distance, double duration, JsonNode geometry, Integer policeRecords,
                  Integer pavementRequests, long activeReports) {}
    record Result(List<Option> routes, int radiusMeters, String policePeriodEnd, String pavementPeriodEnd) {}

    Result compare(JsonNode routes) {
        var policeData = police.get();
        var pavementData = pavement.get();
        List<Point> reports = db.query("""
                SELECT latitude, longitude FROM sr_report
                WHERE status='PUBLISHED' AND valid_until > ?
                AND LOWER(CONCAT(title,' ',body)) NOT LIKE '%demonstração%'
                AND LOWER(CONCAT(title,' ',body)) NOT LIKE '%fictíci%'
                AND LOWER(CONCAT(title,' ',body)) NOT LIKE '%fictici%'
                """, (rs, i) -> new Point(rs.getDouble(1), rs.getDouble(2)), Timestamp.from(Instant.now()));
        List<Option> options = new ArrayList<>();
        for (var route : routes) {
            var geometry = route.path("geometry");
            if (options.stream().anyMatch(other -> other.geometry().equals(geometry))) continue;
            var corridor = new Corridor(geometry.path("coordinates"));
            options.add(new Option(route.path("distance").asDouble(), route.path("duration").asDouble(), geometry,
                    count(corridor, policeData, "cells"), count(corridor, pavementData, "records"),
                    reports.stream().filter(p -> corridor.contains(p.latitude(), p.longitude())).count()));
        }
        return new Result(options, RADIUS_METERS, periodEnd(policeData), periodEnd(pavementData));
    }

    private static String periodEnd(JsonNode dataset) {
        return dataset == null ? null : dataset.path("periodEnd").asText(null);
    }

    private static Integer count(Corridor corridor, JsonNode dataset, String rows) {
        if (dataset == null || !dataset.path(rows).isArray()) return null;
        int total = 0;
        for (var row : dataset.path(rows)) {
            if (corridor.contains(row.path("latitude").asDouble(), row.path("longitude").asDouble())) {
                total += row.path("count").asInt(1);
            }
        }
        return total;
    }

    // Each cell indexes the segments within reach of its points. A record near several segments counts once.
    static final class Corridor {
        private static final double METERS_PER_DEGREE = 111320;
        private static final int CELL_METERS = 600;
        private final double longitudeScale;
        private final Map<Long, List<Line2D.Double>> segments = new HashMap<>();

        Corridor(JsonNode coordinates) {
            longitudeScale = METERS_PER_DEGREE * Math.cos(Math.toRadians(coordinates.get(0).get(1).asDouble()));
            for (int i = 1; i < coordinates.size(); i++) {
                var a = coordinates.get(i - 1);
                var b = coordinates.get(i);
                var line = new Line2D.Double(a.get(0).asDouble() * longitudeScale, a.get(1).asDouble() * METERS_PER_DEGREE,
                        b.get(0).asDouble() * longitudeScale, b.get(1).asDouble() * METERS_PER_DEGREE);
                int left = cell(Math.min(line.x1, line.x2) - RADIUS_METERS);
                int right = cell(Math.max(line.x1, line.x2) + RADIUS_METERS);
                int bottom = cell(Math.min(line.y1, line.y2) - RADIUS_METERS);
                int top = cell(Math.max(line.y1, line.y2) + RADIUS_METERS);
                for (int x = left; x <= right; x++) {
                    for (int y = bottom; y <= top; y++) {
                        segments.computeIfAbsent(key(x, y), k -> new ArrayList<>()).add(line);
                    }
                }
            }
        }

        private static int cell(double meters) { return (int)Math.floor(meters / CELL_METERS); }
        private static long key(int x, int y) { return ((long)x << 32) | (y & 0xffffffffL); }

        boolean contains(double latitude, double longitude) {
            double x = longitude * longitudeScale;
            double y = latitude * METERS_PER_DEGREE;
            var nearby = segments.get(key(cell(x), cell(y)));
            if (nearby == null) return false;
            for (var line : nearby) {
                if (line.ptSegDistSq(x, y) <= RADIUS_METERS * RADIUS_METERS) return true;
            }
            return false;
        }
    }
}
