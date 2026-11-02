package br.com.saferide;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import br.com.saferide.prototype.NewsService;
import static org.assertj.core.api.Assertions.assertThat;
class NewsDateTest {
 @Test void localHistoryHasAnExplicitThirtyDayLimit(){
  var now=Instant.parse("2026-11-02T21:00:00Z");
  assertThat(NewsService.publication("2026-10-15T12:00:00Z",now,30)).isPresent();
  assertThat(NewsService.publication("2026-10-15T12:00:00Z",now)).isEmpty();
  assertThat(NewsService.publication("2026-09-30T12:00:00Z",now,30)).isEmpty();
 }
 @Test void excludesStaleFutureAndUnknownDates(){var now=Instant.parse("2026-11-02T21:00:00Z");
  assertThat(NewsService.publication("Sat, 14 Jul 2018 20:28:41 -0000",now)).isEmpty();
  assertThat(NewsService.publication("Tue, 03 Nov 2026 20:28:41 GMT",now)).isEmpty();
  assertThat(NewsService.publication("",now)).isEmpty();
  assertThat(NewsService.publication("Mon, 02 Nov 2026 13:46:27 GMT",now)).contains(Instant.parse("2026-11-02T13:46:27Z"));
 }
}
