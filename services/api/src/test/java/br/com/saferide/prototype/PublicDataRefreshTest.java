package br.com.saferide.prototype;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import static org.assertj.core.api.Assertions.assertThat;
class PublicDataRefreshTest {
 @TempDir Path directory;
 @Test void reloadsNewSnapshotAndPreservesItWhenNextFileIsBroken() throws Exception {
  Path file=directory.resolve("ssp-vehicles.json");
  var snapshot=new PublicDataRefresh.Snapshot(new ObjectMapper(),"ssp-vehicles.json",file);
  assertThat(snapshot.get()).isNotNull();
  Files.writeString(file,"{\"periodEnd\":\"2026-10\",\"cells\":[{\"count\":7}]}");
  Files.setLastModifiedTime(file,FileTime.fromMillis(1000));
  assertThat(snapshot.get().path("periodEnd").asText()).isEqualTo("2026-10");
  Files.writeString(file,"broken");
  Files.setLastModifiedTime(file,FileTime.fromMillis(2000));
  assertThat(snapshot.get().path("cells").get(0).path("count").asInt()).isEqualTo(7);
 }
}
