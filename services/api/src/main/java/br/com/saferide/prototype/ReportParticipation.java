package br.com.saferide.prototype;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@RestController
@Profile("prototype")
@RequestMapping("/api/v1")
@CrossOrigin(origins={"http://localhost:8081", "http://127.0.0.1:8081"})
public class ReportParticipation {
    private final JdbcTemplate db;
    private final AuthService auth;

    ReportParticipation(JdbcTemplate db, AuthService auth) {
        this.db = db;
        this.auth = auth;
    }

    record PublicReport(String id, String title, String body, String category, double latitude, double longitude,
                        Instant observedAt, Instant reviewedAt, Instant validUntil, String source,
                        int confirmations, int authorPoints, boolean confirmedByMe, boolean canConfirm) {}
    record Reputation(int publishedReports, int confirmationsReceived, int points) {}

    @GetMapping("/reports")
    public List<PublicReport> reports(@RequestHeader(value="Authorization", required=false) String header) {
        String account = header == null ? null : auth.require(header).id();
        return db.query("""
                SELECT r.*, rep.points, (SELECT COUNT(*) FROM sr_report_confirmation c WHERE c.report_id=r.id) AS confirmations,
                       (SELECT COUNT(*) FROM sr_report_confirmation c WHERE c.report_id=r.id AND c.account_id=?) AS mine
                FROM sr_report r JOIN (
                    SELECT t.author_id, COUNT(DISTINCT t.id)+COUNT(v.account_id) AS points
                    FROM sr_report t LEFT JOIN sr_report_confirmation v ON v.report_id=t.id
                    WHERE t.status='PUBLISHED' GROUP BY t.author_id
                ) rep ON rep.author_id=r.author_id
                WHERE r.status='PUBLISHED' AND r.valid_until>?
                ORDER BY r.observed_at DESC, r.id LIMIT 100
                """, (rs, i) -> new PublicReport(rs.getString("id"), rs.getString("title"), rs.getString("body"),
                rs.getString("category"), rs.getDouble("latitude"), rs.getDouble("longitude"),
                rs.getTimestamp("observed_at").toInstant(), rs.getTimestamp("reviewed_at").toInstant(),
                rs.getTimestamp("valid_until").toInstant(), "Relato comunitário revisado", rs.getInt("confirmations"),
                rs.getInt("points"), rs.getInt("mine") > 0, account != null && !account.equals(rs.getString("author_id"))),
                account, Timestamp.from(Instant.now()));
    }

    @GetMapping("/me/reputation")
    public Reputation reputation(@RequestHeader(value="Authorization", required=false) String header) {
        String account = auth.require(header).id();
        return db.queryForObject("""
                SELECT COUNT(DISTINCT r.id) AS published, COUNT(c.account_id) AS confirmations
                FROM sr_report r LEFT JOIN sr_report_confirmation c ON c.report_id=r.id
                WHERE r.author_id=? AND r.status='PUBLISHED'
                """, (rs, i) -> {
            int published = rs.getInt("published");
            int confirmed = rs.getInt("confirmations");
            return new Reputation(published, confirmed, published + confirmed);
        }, account);
    }

    @PutMapping("/reports/{id}/confirmation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void confirm(@PathVariable String id, @RequestHeader(value="Authorization", required=false) String header) {
        String account = auth.require(header).id();
        var authors = db.queryForList("""
                SELECT author_id FROM sr_report WHERE id=? AND status='PUBLISHED' AND valid_until>? FOR UPDATE
                """, String.class, id, Timestamp.from(Instant.now()));
        if (authors.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Relato indisponível ou vencido.");
        if (authors.getFirst().equals(account)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A confirmação precisa vir de outro participante.");
        }
        db.update("""
                INSERT INTO sr_report_confirmation(report_id,account_id,created_at) VALUES(?,?,?)
                ON DUPLICATE KEY UPDATE created_at=sr_report_confirmation.created_at
                """, id, account, Timestamp.from(Instant.now()));
    }

    @DeleteMapping("/reports/{id}/confirmation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void undo(@PathVariable String id, @RequestHeader(value="Authorization", required=false) String header) {
        db.update("DELETE FROM sr_report_confirmation WHERE report_id=? AND account_id=?", id, auth.require(header).id());
    }
}
